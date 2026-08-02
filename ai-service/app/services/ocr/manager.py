"""Provider-neutral OCR orchestration with bounded, ephemeral caching."""

from __future__ import annotations
import hashlib, time
import re
from dataclasses import dataclass
from threading import BoundedSemaphore, Lock

from app.schemas.ocr import OCRPageResult
from app.services.ocr.providers import OCRProvider, ProviderResult


@dataclass
class ManagedPage:
    page: OCRPageResult
    local_text: str = ""
    fallback_text: str = ""


class OCRManager:
    def __init__(self,local:OCRProvider,fallback:OCRProvider|None,low_threshold=.60,high_threshold=.85,max_concurrent=2,cache_ttl=300):
        self.local=local; self.fallback=fallback; self.low_threshold=low_threshold; self.high_threshold=high_threshold
        self._slots=BoundedSemaphore(max_concurrent); self._cache_ttl=cache_ttl; self._cache={}; self._lock=Lock()
    def extract_page(self,payload:bytes,page_number:int)->ManagedPage:
        return self.extract_variants([("original_normalized",payload)],page_number)

    def extract_variants(self,variants:list[tuple[str,bytes]],page_number:int)->ManagedPage:
        payload=variants[0][1]
        key=hashlib.sha256(payload).hexdigest(); now=time.monotonic()
        with self._lock:
            cached=self._cache.get(key)
            if cached and now-cached[0] <= self._cache_ttl:
                value=cached[1]; return ManagedPage(value.page.model_copy(update={"page_number":page_number,"warnings":[*value.page.warnings,"CACHE_HIT"]}),value.local_text,value.fallback_text)
        with self._slots:
            candidates=[]
            variant_warnings=[]
            for name,variant_payload in variants:
                try:
                    result=self.local.extract(variant_payload,"image/png")
                except Exception:
                    variant_warnings.append(f"VARIANT_FAILED:{name}")
                    continue
                quality=self._quality(result)
                candidates.append((name,result,quality))
            if not candidates:
                candidates=[("none",ProviderResult("",getattr(self.local,"name","local"),0.0,0.0,["ALL_VARIANTS_FAILED"]),0.0)]
            variant_name,local,local_quality=max(candidates,key=lambda item:(item[2],len(item[1].text)))
            local.confidence=local_quality
            selected=local; fallback_text=""; used=False; warnings=[*variant_warnings,*local.warnings]
            if local.text and self.low_threshold <= local.confidence < self.high_threshold: warnings.append("LOCAL_OCR_REVIEW_RECOMMENDED")
            if local.confidence < self.low_threshold and self.fallback and self.fallback.available:
                fallback=self.fallback.extract(payload,"image/png")
                warnings.extend(fallback.warnings)
                if fallback.text:
                    selected=fallback; fallback_text=fallback.text; used=True
                elif local.text: warnings.append("GEMINI_FALLBACK_FAILED_LOCAL_PRESERVED")
            if not selected.text and local.text: selected=local
            diagnostics=[{"variant":name,"confidence":round(quality,4),"engine_confidence":result.confidence,"processing_time_seconds":round(result.processing_time_seconds,4),"text_length":len(result.text)} for name,result,quality in candidates]
            page=OCRPageResult(page_number=page_number,extracted_text=selected.text,raw_text=selected.text,confidence=selected.confidence,provider=selected.engine,fallback_used=used,processing_time_seconds=sum(item[1].processing_time_seconds for item in candidates)+(selected.processing_time_seconds if used else 0),warnings=list(dict.fromkeys(warnings)),status="success" if selected.text else "blank",variant_selected=variant_name,variant_results=diagnostics)
            managed=ManagedPage(page,local.text,fallback_text)
            if self._cache_ttl:
                with self._lock:
                    self._cache[key]=(now,managed)
            return managed

    @staticmethod
    def _quality(result:ProviderResult)->float:
        text=result.text.strip(); words=re.findall(r"[A-Za-zÀ-\uFFFF]+|\d+(?:\.\d+)?",text)
        if not text: return 0.0
        medical=len(re.findall(r"\b(?:CBC|LFT|KFT|HbA1c|Hb|BP|mg|mcg|mL|IU|paracetamol|metformin|amoxicillin|azithromycin|pantoprazole)\b",text,re.I))
        character=sum(character.isalnum() or character.isspace() or character in ".,/:%-" for character in text)/len(text)
        numbers=re.findall(r"\d+(?:\.\d+)?(?:/\d+)?",text); number_quality=sum(bool(re.fullmatch(r"\d+(?:\.\d+)?(?:/\d+)?",value)) for value in numbers)/len(numbers) if numbers else .75
        table_quality=.9 if len(re.findall(r"\S+\s{2,}\S+",text)) else .75
        evidence=min(1.0,len(words)/12)*.25+min(1.0,medical/3)*.30+character*.20+number_quality*.15+table_quality*.10
        return round(max(0.0,min(1.0,result.confidence*.9+evidence*.1)),4)
