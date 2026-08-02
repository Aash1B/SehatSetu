"""Provider interface and local/remote OCR implementations."""

from __future__ import annotations
import re, shutil, subprocess
from dataclasses import dataclass, field
from pathlib import Path
from time import perf_counter
from typing import Protocol

from app.core.exceptions import AppException


@dataclass
class ProviderResult:
    text: str
    engine: str
    confidence: float
    processing_time_seconds: float
    warnings: list[str] = field(default_factory=list)


class OCRProvider(Protocol):
    name: str
    @property
    def available(self) -> bool: ...
    def extract(self, image_bytes: bytes, mime_type: str) -> ProviderResult: ...


@dataclass(frozen=True)
class TesseractRuntime:
    installed: bool
    path: str | None
    version: str | None
    availability: str
    languages: tuple[str, ...] = ()


def detect_tesseract(configured: Path | str | None = None) -> TesseractRuntime:
    candidates=[]
    if configured: candidates.append(str(configured))
    found=shutil.which("tesseract")
    if found: candidates.append(found)
    if not candidates:
        candidates.extend([r"C:\Program Files\Tesseract-OCR\tesseract.exe",r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe","/usr/bin/tesseract","/usr/local/bin/tesseract"])
    for candidate in dict.fromkeys(candidates):
        path=Path(candidate)
        if not path.is_file(): continue
        try:
            completed=subprocess.run([str(path),"--version"],capture_output=True,text=True,timeout=5,check=False)
            version=(completed.stdout or completed.stderr).splitlines()[0].strip()
            if completed.returncode == 0:
                languages_result=subprocess.run([str(path),"--list-langs"],capture_output=True,text=True,timeout=5,check=False)
                languages=tuple(line.strip() for line in languages_result.stdout.splitlines()[1:] if line.strip()) if languages_result.returncode==0 else ()
                availability="available" if languages else "installed_no_languages"
                return TesseractRuntime(True,str(path.resolve()),version,availability,languages)
        except (OSError,subprocess.SubprocessError): continue
    return TesseractRuntime(False,None,None,"missing")


class TesseractProvider:
    name="tesseract"
    def __init__(self, configured_path=None, language="eng", timeout=120):
        self.runtime=detect_tesseract(configured_path); self.language=language; self.timeout=timeout
    @property
    def available(self): return self.runtime.installed
    def extract(self,image_bytes:bytes,mime_type:str)->ProviderResult:
        started=perf_counter()
        if not self.runtime.path: return ProviderResult("",self.name,0.0,0,["TESSERACT_UNAVAILABLE"])
        completed=subprocess.run([self.runtime.path,"stdin","stdout","-l",self.language,"--psm","6","tsv"],input=image_bytes,capture_output=True,timeout=self.timeout,check=False)
        if completed.returncode: return ProviderResult("",self.name,0.0,perf_counter()-started,["TESSERACT_FAILED"])
        rows=completed.stdout.decode("utf-8",errors="replace").splitlines(); words=[]; confidences=[]
        for row in rows[1:]:
            columns=row.split("\t")
            if len(columns)>=12 and columns[11].strip():
                words.append(columns[11].strip())
                try:
                    value=float(columns[10]);
                    if value >= 0: confidences.append(value/100)
                except ValueError: pass
        text=" ".join(words).strip(); confidence=sum(confidences)/len(confidences) if confidences else 0.0
        return ProviderResult(text,self.name,round(confidence,4),perf_counter()-started,[] if text else ["NO_LOCAL_TEXT"])


class GeminiVisionProvider:
    name="gemini-vision"
    def __init__(self, gemini, prompt:str, configured:bool=True): self.gemini=gemini; self.prompt=prompt; self.configured=configured
    @property
    def available(self): return self.configured
    def extract(self,image_bytes:bytes,mime_type:str)->ProviderResult:
        started=perf_counter()
        try: text=self.gemini.generate_vision_ocr(image_bytes,mime_type,self.prompt).strip()
        except AppException as exc: return ProviderResult("",self.name,0.0,perf_counter()-started,[exc.code])
        except Exception as exc: return ProviderResult("",self.name,0.0,perf_counter()-started,[f"GEMINI_{type(exc).__name__.upper()}"])
        # Provider does not expose calibrated OCR confidence.
        quality=min(0.95,max(0.60,sum(ch.isalnum() for ch in text)/max(1,len(text)))) if text else 0.0
        return ProviderResult(text,self.name,quality,perf_counter()-started)
