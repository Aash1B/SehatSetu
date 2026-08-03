"""Merge doctor-confirmed, typed, and speech sources without overwriting them."""

import re
from typing import Any
from app.core.config import get_settings
from app.schemas.consultation import (
    ClinicalSource, InputSources, SourcedEntity, TypedMedication,
    UnifiedConsultationData, UnifiedConsultationRequest,
)
from app.schemas.diet import DietRecommendationRequest, LabValue
from app.schemas.doctor_recommendation import DoctorRecommendationRequest
from app.services.doctor_recommendation_service import DoctorRecommendationService
from app.services.nutrition.recommendation_service import NutritionRecommendationService


KNOWN_SYMPTOMS = ["fever", "sore throat", "body pain", "fatigue", "cough", "rash", "chest pain", "shortness of breath", "headache", "stomach pain", "vomiting", "diarrhea", "weakness on one side", "difficulty breathing"]


def _unique_entities(groups: list[tuple[list[str], ClinicalSource, float]]) -> list[SourcedEntity]:
    seen: set[str] = set()
    result: list[SourcedEntity] = []
    for values, source, confidence in groups:
        for value in values:
            clean = " ".join(value.strip().split())
            key = clean.casefold()
            if clean and key not in seen:
                seen.add(key)
                result.append(SourcedEntity(value=clean, source=source, confidence=confidence))
    return result


class ConsultationInputMergeService:
    """Generate a complete safe response from typed notes and/or speech."""

    async def generate(self, request: UnifiedConsultationRequest) -> UnifiedConsultationData:
        confirmed = request.confirmed_fields
        typed = request.typed_notes
        transcript = request.transcript.strip()
        speech_usable = bool(transcript) and not request.transcription_failed and len(re.sub(r"\W", "", transcript)) >= 5
        transcript_lower = transcript.lower() if speech_usable else ""
        speech_symptoms = [symptom for symptom in KNOWN_SYMPTOMS if symptom in transcript_lower]
        symptoms = _unique_entities([
            ((confirmed.symptoms if confirmed else []), ClinicalSource.DOCTOR_CONFIRMED, 1.0),
            (typed.symptoms, ClinicalSource.DOCTOR_TYPED, 1.0),
            (speech_symptoms, ClinicalSource.SPEECH_TRANSCRIPT, 0.85),
        ])
        conditions = _unique_entities([
            (([confirmed.diagnosis] if confirmed and confirmed.diagnosis else []), ClinicalSource.DOCTOR_CONFIRMED, 1.0),
            (([typed.diagnosis] if typed.diagnosis else []), ClinicalSource.DOCTOR_TYPED, 1.0),
            (request.patient_context.conditions, ClinicalSource.DOCTOR_CONFIRMED, 1.0),
        ])
        allergies = _unique_entities([
            ((confirmed.allergies if confirmed else []), ClinicalSource.DOCTOR_CONFIRMED, 1.0),
            (typed.allergies, ClinicalSource.DOCTOR_TYPED, 1.0),
        ])
        medication_source = (confirmed.medicines if confirmed and confirmed.medicines else typed.medicines)
        medication_origin = ClinicalSource.DOCTOR_CONFIRMED if confirmed and confirmed.medicines else ClinicalSource.DOCTOR_TYPED
        medications = [medicine.model_copy(update={"source": medication_origin, "confidence": 1.0}) for medicine in medication_source]
        symptom_values = [item.value for item in symptoms]
        condition_values = [item.value for item in conditions]
        lab_tests: list[dict[str, Any]] = []
        combined = " ".join([*symptom_values, *condition_values]).lower()
        if any(term in combined for term in ("fever", "fatigue", "body pain")):
            lab_tests.append({"name": "Complete Blood Count (CBC)", "reason": "May support evaluation of systemic symptoms", "source": "model_inferred", "requires_doctor_confirmation": True})
        if "diabetes" in combined:
            lab_tests.append({"name": "HbA1c", "reason": "May support glucose-control review", "source": "model_inferred", "requires_doctor_confirmation": True})
        diet = await NutritionRecommendationService().generate(DietRecommendationRequest(
            conditions=condition_values, symptoms=symptom_values,
            medications=[item.name for item in medications], allergies=[item.value for item in allergies],
            age=request.patient_context.age, gender=request.patient_context.gender,
            dietary_preference=request.patient_context.dietary_preference,
            lab_values=[LabValue.model_validate(value) for value in request.patient_context.lab_values],
        ))
        complaint = " ".join([*symptom_values, *condition_values, typed.free_text, typed.doctor_notes]).strip()
        doctor = await DoctorRecommendationService(get_settings()).recommend(DoctorRecommendationRequest(
            chief_complaint=complaint, symptoms=symptom_values, known_conditions=condition_values,
            age=request.patient_context.age, gender=request.patient_context.gender,
        ))
        summary_parts = []
        if symptom_values: summary_parts.append("Symptoms: " + ", ".join(symptom_values))
        if condition_values: summary_parts.append("Doctor-entered assessment: " + ", ".join(condition_values))
        if medications: summary_parts.append("Medicines entered by doctor: " + ", ".join(item.name for item in medications))
        if typed.doctor_notes: summary_parts.append("Doctor notes: " + typed.doctor_notes)
        warnings = list(diet.warnings)
        if doctor.emergency_detected: warnings.insert(0, doctor.emergency_message)
        return UnifiedConsultationData(
            input_sources=InputSources(speech_used=speech_usable, typed_notes_used=bool(typed.model_dump(exclude_defaults=True) or confirmed)),
            identified_symptoms=symptoms, identified_conditions=conditions, medications=medications,
            allergies=allergies, recommended_lab_tests=lab_tests, diet_recommendation=diet,
            doctor_recommendation=doctor,
            emergency_triage={"urgency": doctor.urgency, "emergency_detected": doctor.emergency_detected, "emergency_message": doctor.emergency_message, "red_flags": doctor.red_flags, "next_steps": doctor.next_steps},
            consultation_summary=". ".join(summary_parts) or "Clinical information supplied for doctor review.",
            warnings=warnings, requires_doctor_confirmation=True,
        )


def get_consultation_input_merge_service() -> ConsultationInputMergeService:
    return ConsultationInputMergeService()
