"""Medical document OCR request results."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse


class OCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    extracted_text: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)


class LabFinding(BaseModel):
    parameter: str
    value: str = ""
    unit: str = ""
    reference_range: str = ""
    status: Literal["low", "high", "normal", "unknown"] = "unknown"
    explanation: str = ""


class OCRAnalysisData(BaseModel):
    engine: Literal["gemini-vision"] = "gemini-vision"
    document_type: str = "Unknown"
    extracted_text: str = ""
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
