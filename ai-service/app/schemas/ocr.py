"""Medical document OCR request results."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse
from app.schemas.medical_info import VitalSigns


class OCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    extracted_text: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    provider: str | None = None
    fallback_used: bool = False
    processing_time_seconds: float | None = Field(default=None, ge=0)
    warnings: list[str] = Field(default_factory=list)
    raw_text: str = ""
    status: Literal["success", "blank", "failed"] = "success"
    variant_selected: str | None = None
    variant_results: list[dict[str, float | int | str]] = Field(default_factory=list)


class OCRCorrection(BaseModel):
    source: str
    replacement: str
    reason: str


class OCRStructuredEntity(BaseModel):
    kind: str
    name: str = ""
    value: str = ""
    unit: str = ""
    strength: str = ""
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    page: int | None = Field(default=None, ge=1)
    source_text: str = ""


class LabFinding(BaseModel):
    parameter: str
    value: str = ""
    unit: str = ""
    reference_range: str = ""
    status: Literal["low", "high", "normal", "unknown"] = "unknown"
    explanation: str = ""


class OCRAnalysisData(BaseModel):
    engine: str = "gemini-vision"
    local_ocr_text: str = ""
    fallback_ocr_text: str = ""
    fallback_used: bool = False
    cache_hit: bool = False
    confidence: float | None = Field(default=None, ge=0, le=1)
    processing_time_seconds: float | None = Field(default=None, ge=0)
    corrections: list[OCRCorrection] = Field(default_factory=list)
    structured_entities: list[OCRStructuredEntity] = Field(default_factory=list)
    document_type: str = "Unknown"
    extracted_text: str = ""
    raw_ocr_text: str = ""
    cleaned_ocr_text: str = ""
    warnings: list[str] = Field(default_factory=list)
    pages: list[OCRPageResult] = Field(default_factory=list)
    summary: str = ""
    key_findings: list[str] = Field(default_factory=list)
    abnormal_findings: list[LabFinding] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    detected_language: str = "unknown"
    output_language: str = "en"
    requires_doctor_review: Literal[True] = True
    disclaimer: str = (
        "OCR output may contain errors. Doctor review is required."
    )


class OCRAnalysisResponse(ApiResponse[OCRAnalysisData]):
    """Standard medical OCR response."""


class OCRMedicalAnalysis(BaseModel):
    """Structured medical interpretation generated from extracted OCR text."""

    document_type: str = "General medical document"
    summary: str = ""
    key_findings: list[str] = Field(default_factory=list)
    abnormal_findings: list[LabFinding] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class EhrParseRequest(BaseModel):
    """Request for EHR text parsing using Gemini AI."""

    extracted_text: str = Field(..., min_length=1)
    extracted_data: dict[str, Any] = Field(default_factory=dict)


class EhrParseResponse(BaseModel):
    """Response with structured clinical information extracted from OCR text."""

    diagnosis: str | None = None
    medications: list[str] = Field(default_factory=list)
    vitals: VitalSigns = Field(default_factory=VitalSigns)
    notes: str | None = None
