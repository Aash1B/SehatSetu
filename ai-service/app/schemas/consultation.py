"""Unified consultation generation contracts with clinical source provenance."""

from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.common import ApiResponse
from app.schemas.diet import DietRecommendationData
from app.schemas.doctor_recommendation import DoctorRecommendationData


class ClinicalSource(str, Enum):
    DOCTOR_CONFIRMED = "doctor_confirmed"
    DOCTOR_TYPED = "doctor_typed"
    SPEECH_TRANSCRIPT = "speech_transcript"
    MODEL_INFERRED = "model_inferred"
    OCR_REPORT = "OCR_report"


class SourcedEntity(BaseModel):
    value: str
    source: ClinicalSource
    confidence: float = Field(ge=0, le=1)


class TypedMedication(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    route: str = ""
    source: ClinicalSource | None = None
    confidence: float | None = None


class TypedClinicalNotes(BaseModel):
    symptoms: list[str] = Field(default_factory=list)
    medicines: list[TypedMedication] = Field(default_factory=list)
    diagnosis: str = ""
    allergies: list[str] = Field(default_factory=list)
    medical_history: list[str] = Field(default_factory=list)
    examination_notes: str = ""
    doctor_notes: str = ""
    free_text: str = ""


class PatientContext(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    conditions: list[str] = Field(default_factory=list)
    dietary_preference: str | None = None
    lab_values: list[dict[str, Any]] = Field(default_factory=list)


class UnifiedConsultationRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"transcript": "", "typed_notes": {"symptoms": ["fever", "sore throat", "body pain"], "medicines": [{"name": "Paracetamol", "dosage": "500 mg", "frequency": "twice daily", "duration": "3 days"}], "diagnosis": "Suspected viral infection", "allergies": [], "medical_history": [], "doctor_notes": "Advise hydration and rest"}, "patient_context": {"age": 28, "gender": "female", "conditions": []}}]})
    transcript: str = ""
    transcription_failed: bool = False
    typed_notes: TypedClinicalNotes = Field(default_factory=TypedClinicalNotes)
    confirmed_fields: TypedClinicalNotes | None = None
    patient_context: PatientContext = Field(default_factory=PatientContext)

    @model_validator(mode="after")
    def require_input(self) -> "UnifiedConsultationRequest":
        if not self.transcript.strip() and not self.typed_notes.model_dump(exclude_defaults=True) and not self.confirmed_fields:
            raise ValueError("Provide a transcript or typed clinical notes")
        return self


class InputSources(BaseModel):
    speech_used: bool
    typed_notes_used: bool
    ocr_used: bool = False


class UnifiedConsultationData(BaseModel):
    input_sources: InputSources
    identified_symptoms: list[SourcedEntity]
    identified_conditions: list[SourcedEntity]
    medications: list[TypedMedication]
    allergies: list[SourcedEntity]
    recommended_lab_tests: list[dict[str, Any]]
    diet_recommendation: DietRecommendationData
    doctor_recommendation: DoctorRecommendationData
    emergency_triage: dict[str, Any]
    consultation_summary: str
    warnings: list[str]
    requires_doctor_confirmation: bool = True
    disclaimer: str = "AI-generated clinical suggestions require doctor confirmation and are not a diagnosis."


class UnifiedConsultationResponse(ApiResponse[UnifiedConsultationData]):
    """Standard response envelope for unified consultation generation."""
