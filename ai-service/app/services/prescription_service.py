"""Prescription draft orchestration using validated Gemini output."""

import asyncio
from functools import lru_cache
import json

from app.core.config import get_settings
from app.prompts.prescription_prompt import (
    PRESCRIPTION_SYSTEM_INSTRUCTION,
    build_prescription_prompt,
)
from app.schemas.prescription import (
    PrescriptionData,
    PrescriptionRequest,
    PrescriptionStructuredOutput,
)
from app.services.gemini_service import GeminiService
from app.services.language_service import language_service

CONTROLLED_MEDICINE_TERMS = {
    "alprazolam",
    "clonazepam",
    "codeine",
    "diazepam",
    "fentanyl",
    "morphine",
    "oxycodone",
    "tramadol",
}


class PrescriptionService:
    """Generate safe prescription drafts for doctor consideration."""

    def __init__(self, gemini_service: GeminiService) -> None:
        self._gemini_service = gemini_service

    async def generate(self, request: PrescriptionRequest) -> PrescriptionData:
        """Generate, validate, deduplicate, and safety-stamp a draft."""
        language = language_service.resolve(
            request.summary, request.language, request.output_language
        )
        structured = await asyncio.to_thread(
            self._gemini_service.generate_gemini_response,
            prompt=build_prescription_prompt(
                request.summary,
                request.medical_entities,
                age=request.age,
                gender=request.gender,
                output_language=language.output,
            ),
            system_instruction=PRESCRIPTION_SYSTEM_INSTRUCTION,
            response_model=PrescriptionStructuredOutput,
        )
        result = PrescriptionData.model_validate(structured.model_dump())
        source_text = (
            f"{request.summary} "
            f"{json.dumps(request.medical_entities, ensure_ascii=False)}"
        ).casefold()
        allergies = {
            str(value).casefold()
            for value in request.medical_entities.get("allergies", [])
            if str(value).strip()
        }
        unique = []
        seen: set[tuple[str, ...]] = set()
        blocked_controlled_medicine = False
        for medication in result.medications:
            medicine_name = medication.medicine.casefold()
            if any(
                term in medicine_name for term in CONTROLLED_MEDICINE_TERMS
            ):
                blocked_controlled_medicine = True
                continue
            generic_name = medication.generic_name.strip().casefold()
            if medicine_name not in source_text and not (
                generic_name and generic_name in source_text
            ):
                continue
            if any(
                allergy in medicine_name
                or allergy in medication.generic_name.casefold()
                for allergy in allergies
            ):
                result.warnings.append(
                    "A medication matching the supplied allergy information "
                    "was removed."
                )
                continue
            for field_name in (
                "dosage",
                "frequency",
                "route",
                "duration",
                "instructions",
            ):
                value = getattr(medication, field_name)
                if value and value.casefold() not in source_text:
                    setattr(medication, field_name, None)
            key = (
                medication.medicine.casefold(),
                (medication.generic_name or "").casefold(),
                (medication.dosage or "").casefold(),
                (medication.frequency or "").casefold(),
                (medication.route or "").casefold(),
                (medication.duration or "").casefold(),
            )
            if key not in seen:
                unique.append(medication)
                seen.add(key)
        result.medications = unique
        result.identified_issues = self._unique_text(result.identified_issues)
        result.identified_symptoms = self._unique_text(
            result.identified_symptoms
        )
        seen_tests: set[str] = set()
        result.recommended_lab_tests = [
            item
            for item in result.recommended_lab_tests
            if item.test_name.strip()
            and not (
                item.test_name.casefold() in seen_tests
                or seen_tests.add(item.test_name.casefold())
            )
        ]
        result.warnings = list(
            dict.fromkeys(
                warning.strip()
                for warning in result.warnings
                if warning.strip()
            )
        )
        if blocked_controlled_medicine:
            result.warnings.append(
                "A controlled-medication suggestion was removed; doctor review "
                "is required."
            )
        context = request.summary.casefold()
        if request.age is not None and request.age < 18:
            result.warnings.append(
                "Pediatric prescribing considerations require doctor review."
            )
        if request.age is not None and request.age >= 65:
            result.warnings.append(
                "Older-adult dosing and interaction considerations require "
                "doctor review."
            )
        if "pregnan" in context:
            result.warnings.append(
                "Pregnancy-related medication safety requires doctor review."
            )
        result.warnings = list(dict.fromkeys(result.warnings))
        result.requires_doctor_review = True
        result.requires_doctor_confirmation = True
        result.disclaimer = "AI-generated draft. Doctor approval required."
        result.language = language
        return result

    @staticmethod
    def _unique_text(values: list[str]) -> list[str]:
        return list(
            dict.fromkeys(value.strip() for value in values if value.strip())
        )


@lru_cache
def get_prescription_service() -> PrescriptionService:
    """Return a shared service and reusable lazy Gemini client."""
    return PrescriptionService(GeminiService(get_settings()))
