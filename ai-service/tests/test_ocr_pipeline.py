"""Provider-neutral OCR orchestration and medical normalization tests."""

from pathlib import Path
from types import SimpleNamespace
import warnings

import fitz
import pytest

from app.core.config import Settings
from app.core.exceptions import AppException
from app.schemas.ocr import OCRPageResult
from app.services.ocr.manager import OCRManager
from app.services.ocr.normalization import extract_entities, normalize_medical_text
from app.services.ocr.providers import ProviderResult, detect_tesseract
from app.services.ocr_service import OCRService
from app.services.ocr.preprocessing import ImagePreprocessor
from PIL import Image, ImageDraw


class Provider:
    def __init__(self,name,text,confidence,available=True,warnings=None):
        self.name=name; self.text=text; self.confidence=confidence; self._available=available; self.warnings=warnings or []; self.calls=0
    @property
    def available(self): return self._available
    def extract(self,payload,mime):
        self.calls+=1; return ProviderResult(self.text,self.name,self.confidence,.01,list(self.warnings))


@pytest.mark.parametrize(("confidence","fallback_calls","warning"),[(.90,0,None),(.70,0,"LOCAL_OCR_REVIEW_RECOMMENDED"),(.40,1,None)])
def test_confidence_policy(confidence,fallback_calls,warning):
    local=Provider("tesseract","Paracetamol 500mg",confidence); fallback=Provider("gemini-vision","Paracetamol 500 mg",.9)
    result=OCRManager(local,fallback,cache_ttl=0).extract_page(b"image",1).page
    assert fallback.calls==fallback_calls
    if warning: assert warning in result.warnings
    assert result.extracted_text


def test_fallback_failure_preserves_local_text():
    local=Provider("tesseract","uncertain local text",.3); fallback=Provider("gemini-vision","",0,warnings=["GEMINI_RATE_LIMITED"])
    result=OCRManager(local,fallback,cache_ttl=0).extract_page(b"image",1).page
    assert result.extracted_text=="uncertain local text"
    assert "GEMINI_FALLBACK_FAILED_LOCAL_PRESERVED" in result.warnings


def test_tesseract_unavailable_can_use_gemini():
    local=Provider("tesseract","",0,available=False,warnings=["TESSERACT_UNAVAILABLE"]); fallback=Provider("gemini-vision","CBC 12 g/dL",.8)
    result=OCRManager(local,fallback,cache_ttl=0).extract_page(b"image",1).page
    assert result.provider=="gemini-vision" and result.fallback_used


def test_identical_page_uses_ephemeral_cache():
    local=Provider("tesseract","CBC",.9); manager=OCRManager(local,None,cache_ttl=60)
    manager.extract_page(b"same",1); second=manager.extract_page(b"same",2).page
    assert local.calls==1 and "CACHE_HIT" in second.warnings and second.page_number==2


def test_cache_ttl_expiry_reexecutes_provider(monkeypatch):
    ticks=iter((10.0,12.0)); monkeypatch.setattr("app.services.ocr.manager.time.monotonic",lambda:next(ticks))
    local=Provider("tesseract","CBC",.9); manager=OCRManager(local,None,cache_ttl=1)
    manager.extract_page(b"same",1); manager.extract_page(b"same",1)
    assert local.calls==2


def test_changed_file_does_not_reuse_cached_result():
    local=Provider("tesseract","CBC",.9); manager=OCRManager(local,None,cache_ttl=60)
    manager.extract_page(b"first",1); manager.extract_page(b"second",1)
    assert local.calls==2


def test_preprocessor_produces_named_non_destructive_variants():
    image=Image.new("RGB",(500,180),"white"); ImageDraw.Draw(image).text((20,60),"CBC Hb 11.5 g/dL",fill="black")
    variants=ImagePreprocessor().variants(image)
    assert {item.name for item in variants} == {"original_normalized","adaptive_threshold","high_contrast_deskew","noise_reduction"}
    assert all(item.payload.startswith(b"\x89PNG") for item in variants)


@pytest.mark.parametrize("mode", ["L", "RGB", "RGBA"])
def test_preprocessor_supports_declared_image_modes(mode):
    image = Image.new(mode, (24, 18), 128)

    variants = ImagePreprocessor().variants(image)

    assert variants
    assert all(item.payload.startswith(b"\x89PNG") for item in variants)


def test_preprocessor_uses_pillow_11_compatible_pixel_iteration(monkeypatch):
    monkeypatch.delattr(Image.Image, "get_flattened_data", raising=False)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        assert ImagePreprocessor().variants(Image.new("L", (24, 18), 128))


@pytest.mark.parametrize("invalid", [None, "not-an-image"])
def test_preprocessor_rejects_invalid_image_input(invalid):
    with pytest.raises((AttributeError, TypeError)):
        ImagePreprocessor().variants(invalid)


def test_best_variant_diagnostics_are_preserved():
    class Sequenced(Provider):
        def __init__(self): super().__init__("tesseract","",0); self.values=iter((("bad",.3),("CBC Hb 11.5 g/dL",.95)))
        def extract(self,payload,mime):
            self.calls+=1; text,confidence=next(self.values); return ProviderResult(text,self.name,confidence,.02)
    result=OCRManager(Sequenced(),None,cache_ttl=0).extract_variants([("original",b"a"),("threshold",b"b")],1).page
    assert result.variant_selected=="threshold" and len(result.variant_results)==2 and result.confidence>.85


def test_invalid_variant_is_skipped_safely():
    class SometimesInvalid(Provider):
        def extract(self,payload,mime):
            if payload==b"bad": raise ValueError("invalid variant")
            return ProviderResult("CBC 13.5 g/dL",self.name,.9,.01)
    result=OCRManager(SometimesInvalid("tesseract","",0),None,cache_ttl=0).extract_variants([("bad",b"bad"),("good",b"good")],1).page
    assert result.variant_selected=="good" and "VARIANT_FAILED:bad" in result.warnings


def test_normalization_and_structured_evidence():
    cleaned,corrections=normalize_medical_text("Demo Hospital\nDr. Asha Rao\nPatient: Test Person\nCBC\nHb 11.5g/dL\nParacetamol 500mg two tablets twice daily for five days after food\nBP 150/95")
    entities=extract_entities(cleaned,1,.9)
    assert "500 mg" in cleaned and corrections
    assert any(item.kind=="medicine" and item.source_text for item in entities)
    assert any(item.kind=="blood_pressure" and item.value=="150/95" for item in entities)
    medicine=next(item for item in entities if item.kind=="medicine")
    assert medicine.strength=="500 mg" and medicine.dosage=="two tablets" and medicine.duration=="for five days" and medicine.instructions=="after food"
    assert {item.kind for item in entities} >= {"doctor","hospital","patient"}


def test_missing_configured_tesseract_never_crashes(tmp_path:Path):
    runtime=detect_tesseract(tmp_path/"missing-tesseract")
    assert runtime.installed is False and runtime.availability=="missing"


def test_partial_pdf_page_failure_is_retained(tmp_path:Path,monkeypatch):
    document=fitz.open(); document.new_page(); document.new_page(); path=tmp_path/"pages.pdf"; document.save(path); document.close()
    service=OCRService(Settings(_env_file=None),SimpleNamespace())
    calls=0
    def extract(payload,page):
        nonlocal calls; calls+=1
        if calls==1: raise RuntimeError("page failure")
        return OCRPageResult(page_number=page,extracted_text="CBC",provider="tesseract",confidence=.9)
    monkeypatch.setattr(service,"_ocr_variants",lambda image,page: extract(b"variant",page))
    pages=service._extract_pdf(path)
    assert pages[0].warnings==["PAGE_OCR_FAILED"] and pages[1].extracted_text=="CBC"


def test_encrypted_pdf_is_rejected(tmp_path:Path):
    source=fitz.open(); source.new_page(); path=tmp_path/"encrypted.pdf"; source.save(path,encryption=fitz.PDF_ENCRYPT_AES_256,owner_pw="owner",user_pw="user"); source.close()
    service=OCRService(Settings(_env_file=None),SimpleNamespace())
    with pytest.raises(AppException) as error: service._extract_pdf(path)
    assert error.value.code=="OCR_CORRUPTED_FILE"
