"""Secure medical-document OCR endpoint."""

import asyncio
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.request_context import get_request_id
from app.schemas.common import ErrorResponse
from app.schemas.ocr import OCRAnalysisResponse
from app.services.ocr_service import OCRService, get_ocr_service

router = APIRouter(prefix="/ocr", tags=["Medical Document OCR"])
settings = get_settings()


@router.post(
    "/analyze",
    response_model=OCRAnalysisResponse,
    response_model_exclude_none=True,
    summary="Extract and analyze a medical document",
    responses={
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def analyze_document(
    file: Annotated[UploadFile, File(description="JPEG, PNG, WebP, or PDF")],
    language: Annotated[str, Form()] = "auto",
    output_language: Annotated[
        str | None,
        Form(
            description=(
                "Output language code, name, locale alias, or auto."
            ),
            examples=["en", "hi", "hi-Latn", "auto"],
        ),
    ] = None,
    include_summary: Annotated[bool, Form()] = True,
    service: OCRService = Depends(get_ocr_service),
) -> OCRAnalysisResponse:
    """Store under a generated name, analyze, and always clean up."""
    request_id = get_request_id()
    extension = Path(file.filename or "").suffix.lower()
    directory = Path(".tmp/ocr").resolve()
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{uuid4().hex}{extension}"
    try:
        total_bytes = 0
        max_bytes = int(settings.ocr_max_file_size_mb * 1024 * 1024)
        with path.open("xb") as destination:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise AppException(
                        "OCR file exceeds the configured size limit",
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        code="OCR_FILE_TOO_LARGE",
                    )
                destination.write(chunk)
        data = await asyncio.to_thread(
            service.analyze,
            path,
            (file.content_type or "").lower().split(";")[0].strip(),
            language,
            output_language,
            include_summary,
            request_id,
        )
        return OCRAnalysisResponse(
            message="OCR completed successfully.", data=data
        )
    finally:
        await file.close()
        path.unlink(missing_ok=True)
