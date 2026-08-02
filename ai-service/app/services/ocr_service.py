"""Gemini Vision OCR and structured medical-document analysis."""

import json
from functools import lru_cache
from pathlib import Path
from time import perf_counter

from fastapi import status

from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.ocr import (
    OCRAnalysisData,
    OCRMedicalAnalysis,
    OCRPageResult,
)
from app.services.gemini_service import GeminiService
from app.services.language_service import language_service

logger = get_logger(__name__)
MIME_EXTENSIONS = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
    "application/pdf": {".pdf"},
}
SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
    "application/pdf": (b"%PDF-",),
}
OCR_PROMPT = """You are an OCR engine.

Extract every visible piece of text exactly as written.

Requirements:
- preserve line breaks
- preserve tables where possible
- preserve headings
- preserve medicine names
- preserve numbers
- preserve dates
- preserve units
- preserve abnormal lab values
- never invent missing text
- if text is unreadable write [UNCLEAR]
- output plain UTF-8 text only

Do not summarize."""
ANALYSIS_INSTRUCTIONS = """Analyze only the supplied OCR text.
Never invent values or diagnoses. Return a concise summary, document type,
key findings, abnormal findings supported by printed reference ranges, and
conservative recommendations for clinician review."""


class GeminiVisionOCRService:
    """Extract exact page text through the shared Gemini provider."""

    def __init__(self, gemini: GeminiService) -> None:
        self.gemini = gemini

    def extract_text(self, image_bytes: bytes, mime_type: str) -> str:
        """OCR one image and map every provider failure consistently."""
        started = perf_counter()
        try:
            text = self.gemini.generate_vision_ocr(
                image_bytes,
                mime_type,
                OCR_PROMPT,
            ).strip()
        except AppException as exc:
            logger.warning(
                "Gemini Vision OCR failed provider_code=%s", exc.code
            )
            raise AppException(
                "The OCR provider could not process the document.",
                status_code=(
                    status.HTTP_504_GATEWAY_TIMEOUT
                    if exc.code == "GEMINI_TIMEOUT"
                    else status.HTTP_502_BAD_GATEWAY
                ),
                code="GEMINI_OCR_FAILED",
                details={"provider": "gemini-vision"},
            ) from exc
        logger.info(
            "Gemini OCR page completed latency_ms=%.2f character_count=%d",
            (perf_counter() - started) * 1000,
            len(text),
        )
        return text


class OCRService:
    """Validate documents, OCR each page, and analyze extracted text."""

    def __init__(
        self,
        settings: Settings,
        gemini: GeminiService | None = None,
    ) -> None:
        self.settings = settings
        self.gemini = gemini or GeminiService(settings)
        self.provider = GeminiVisionOCRService(self.gemini)

    def analyze(
        self,
        path: Path,
        mime_type: str,
        language: str,
        output_language: str | None,
        include_summary: bool,
        include_medical_analysis: bool = True,
        request_id: str = "",
    ) -> OCRAnalysisData:
        """OCR all pages in order and generate structured medical analysis."""
        started = perf_counter()
        self.validate(path, mime_type)
        pages = (
            self._extract_pdf(path)
            if mime_type == "application/pdf"
            else [self._extract_image(path, mime_type, 1)]
        )
        text = "\n\n".join(
            f"--- Page {page.page_number} ---\n{page.extracted_text}"
            for page in pages
        ).strip()
        if not text or not any(page.extracted_text.strip() for page in pages):
            raise AppException(
                "No readable text was extracted",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_OCR_FAILED",
            )
        language_meta = language_service.resolve(
            text, language, output_language
        )
        analysis = (
            self._analyze_medical_text(text, language_meta.output)
            if include_medical_analysis else OCRMedicalAnalysis()
        )
        logger.info(
            "OCR request completed request_id=%s filename=%s pages=%d "
            "duration_ms=%.2f character_count=%d",
            request_id or "not-provided",
            path.name,
            len(pages),
            (perf_counter() - started) * 1000,
            len(text),
        )
        return OCRAnalysisData(
            extracted_text=text,
            raw_ocr_text=text,
            cleaned_ocr_text="\n".join(line.strip() for line in text.splitlines() if line.strip()),
            pages=pages,
            document_type=analysis.document_type,
            summary=analysis.summary if include_summary else "",
            key_findings=analysis.key_findings,
            abnormal_findings=analysis.abnormal_findings,
            recommendations=analysis.recommendations,
            detected_language=language_meta.detected,
            output_language=language_meta.output,
        )

    def validate(self, path: Path, mime_type: str) -> None:
        """Validate type, extension, size, signature, and readability."""
        if not path.is_file():
            raise AppException(
                "The uploaded document does not exist",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="OCR_CORRUPTED_FILE",
            )
        if mime_type not in MIME_EXTENSIONS:
            raise AppException(
                "Unsupported OCR file type",
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                code="OCR_UNSUPPORTED_FILE_TYPE",
                details={"accepted": sorted(MIME_EXTENSIONS)},
            )
        if path.suffix.lower() not in MIME_EXTENSIONS[mime_type]:
            raise AppException(
                "File extension does not match its media type",
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                code="OCR_UNSUPPORTED_FILE_TYPE",
            )
        size = path.stat().st_size
        if not size:
            raise AppException(
                "The uploaded document is empty",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="OCR_CORRUPTED_FILE",
            )
        if size > self.settings.ocr_max_file_size_mb * 1024 * 1024:
            raise AppException(
                "OCR file exceeds the configured size limit",
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                code="OCR_FILE_TOO_LARGE",
            )
        header = path.read_bytes()[:12]
        if not any(header.startswith(item) for item in SIGNATURES[mime_type]):
            raise AppException(
                "The document signature is invalid",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="OCR_CORRUPTED_FILE",
            )
        if mime_type == "image/webp" and header[8:12] != b"WEBP":
            raise AppException(
                "The WebP signature is invalid",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="OCR_CORRUPTED_FILE",
            )

    def _extract_pdf(self, path: Path) -> list[OCRPageResult]:
        """Render and OCR each PDF page in source order."""
        try:
            import fitz

            with fitz.open(path) as document:
                if document.page_count == 0:
                    raise ValueError("PDF contains no pages")
                if document.page_count > self.settings.ocr_max_pdf_pages:
                    raise AppException(
                        "PDF exceeds the configured page limit",
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        code="OCR_FILE_TOO_LARGE",
                    )
                results = []
                for index, page in enumerate(document):
                    pixmap = page.get_pixmap(
                        matrix=fitz.Matrix(2, 2),
                        alpha=False,
                    )
                    text = self.provider.extract_text(
                        pixmap.tobytes("png"),
                        "image/png",
                    )
                    results.append(
                        OCRPageResult(
                            page_number=index + 1,
                            extracted_text=text,
                        )
                    )
                return results
        except AppException:
            raise
        except Exception as exc:
            raise AppException(
                "The PDF could not be processed",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="OCR_CORRUPTED_FILE",
            ) from exc

    def _extract_image(
        self,
        path: Path,
        mime_type: str,
        page_number: int,
    ) -> OCRPageResult:
        """Validate an image and send its original bytes to Gemini Vision."""
        try:
            from io import BytesIO
            from PIL import Image, ImageEnhance, ImageFilter, ImageOps

            with Image.open(path) as source_image:
                image = ImageOps.exif_transpose(source_image)
                if (
                    image.width * image.height
                    > self.settings.ocr_max_image_pixels
                ):
                    raise AppException(
                        "Image dimensions exceed the configured limit",
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        code="OCR_FILE_TOO_LARGE",
                    )
                image.load()
                # Conservative OCR copy: orient, upscale small scans, grayscale,
                # auto-contrast, median denoise, and mild sharpening. The source
                # file remains untouched for traceability.
                if image.width < 1600:
                    ratio = min(2.0, 1600 / max(image.width, 1))
                    image = image.resize(
                        (int(image.width * ratio), int(image.height * ratio)),
                        Image.Resampling.LANCZOS,
                    )
                processed = ImageOps.autocontrast(ImageOps.grayscale(image), cutoff=1)
                processed = processed.filter(ImageFilter.MedianFilter(size=3))
                processed = ImageEnhance.Sharpness(processed).enhance(1.25)
                buffer = BytesIO()
                processed.save(buffer, format="PNG", optimize=True)
                payload = buffer.getvalue()
        except AppException:
            raise
        except Exception as exc:
            raise AppException(
                "The image is corrupted",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="OCR_CORRUPTED_FILE",
            ) from exc
        return OCRPageResult(
            page_number=page_number,
            extracted_text=self.provider.extract_text(
                payload,
                "image/png",
            ),
        )

    def _analyze_medical_text(
        self,
        text: str,
        output_language: str,
    ) -> OCRMedicalAnalysis:
        """Ask Gemini for grounded structured analysis of extracted text."""
        try:
            return self.gemini.generate_gemini_response(
                prompt=json.dumps(
                    {
                        "ocr_text": text,
                        "output_language": output_language,
                    },
                    ensure_ascii=False,
                ),
                system_instruction=ANALYSIS_INSTRUCTIONS,
                response_model=OCRMedicalAnalysis,
                temperature=0.1,
                max_output_tokens=1000,
                sensitive_content=True,
            )
        except AppException as exc:
            logger.warning(
                "Gemini OCR medical analysis failed provider_code=%s",
                exc.code,
            )
            raise AppException(
                "The OCR provider could not analyze the document.",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_OCR_FAILED",
                details={"provider": "gemini-vision"},
            ) from exc


@lru_cache
def get_ocr_service() -> OCRService:
    """Return one OCR service using the shared lazy Gemini client."""
    return OCRService(get_settings())
