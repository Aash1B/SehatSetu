"""NER-backed raw-transcript prescription draft generation."""

import re
from functools import lru_cache
from time import perf_counter

from fastapi import status

from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.medical_info import MedicalInfoData
from app.schemas.summarize import (
    MedicationDraft,
    PrescriptionDraft,
    WarningItem,
)
from app.services.ner_service import MedicalNERService, get_ner_service

logger = get_logger(__name__)
LAB_TESTS = {
    "blood test",
    "cbc",
    "ecg",
    "mri",
    "troponin i",
    "x-ray",
}
URGENT_TEXT_PATTERNS = (
    r"\bsevere chest pain\b",
    r"\b(?:difficulty breathing|breathlessness|shortness of breath)\b",
    r"\bloss of consciousness\b",
    r"\b(?:facial droop|slurred speech|one-sided weakness)\b",
    r"\b(?:anaphylaxis|severe allergic reaction)\b",
    r"\b(?:suicidal|self-harm|kill myself)\b",
)


def _unique(values: list[str]) -> list[str]:
    """Trim and deduplicate values case-insensitively."""
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = " ".join(value.split()).strip()
        key = normalized.casefold()
        if normalized and key not in seen:
            result.append(normalized.lower())
            seen.add(key)
    return result


class SummarizeService:
    """Connect the existing medical NER result to a safe deterministic draft."""

    def __init__(
        self,
        ner_service: MedicalNERService,
        settings: Settings,
    ) -> None:
        self.ner_service = ner_service
        self.settings = settings

    def generate(
        self,
        transcript: str,
        request_id: str,
    ) -> tuple[PrescriptionDraft, bool]:
        """Extract, normalize, and generate a doctor-review draft."""
        started = perf_counter()
        if self.settings.prescription_dummy_mode:
            logger.info(
                "Dummy prescription mode used request_id=%s", request_id
            )
            return PrescriptionDraft(is_dummy=True), False

        logger.info("NER extraction started request_id=%s", request_id)
        try:
            entities = self.ner_service.extract(transcript)
        except Exception as exc:
            logger.exception(
                "NER extraction failed request_id=%s", request_id
            )
            raise AppException(
                "Medical entity extraction failed",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="NER_EXTRACTION_FAILED",
                details={"request_id": request_id},
            ) from exc

        entity_count = self._entity_count(entities)
        logger.info(
            "NER extraction completed request_id=%s entity_count=%d",
            request_id,
            entity_count,
        )
        draft = self._build_draft(transcript, entities)
        limited = entity_count == 0
        if limited:
            draft.diagnosis = (
                "Insufficient structured information for a draft diagnosis"
            )
            draft.warnings.append(
                WarningItem(
                    code="NO_MEDICAL_ENTITIES_DETECTED",
                    message=(
                        "No supported medical entities were detected in the "
                        "transcript."
                    ),
                )
            )
        logger.info(
            "Prescription draft generated request_id=%s symptom_count=%d "
            "medication_count=%d lab_test_count=%d processing_ms=%.2f",
            request_id,
            len(draft.identified_symptoms),
            len(draft.medications),
            len(draft.recommended_lab_tests),
            (perf_counter() - started) * 1000,
        )
        return draft, limited

    def _build_draft(
        self,
        transcript: str,
        entities: MedicalInfoData,
    ) -> PrescriptionDraft:
        """Normalize the existing NER data into the public draft contract."""
        medications = [
            MedicationDraft(
                name=mention.name,
                dosage=mention.dosage,
                frequency=mention.frequency,
                duration=mention.duration,
            )
            for mention in entities.medications
            if mention.name.strip()
        ]
        lab_tests = _unique(
            [
                procedure
                for procedure in entities.procedures
                if procedure.casefold() in LAB_TESTS
            ]
        )
        vital_signs = entities.vital_signs
        vitals = (
            [
                f"{name}: {value}"
                for name, value in vital_signs.model_dump().items()
                if value
            ]
            if hasattr(vital_signs, "model_dump")
            else [f"{item.name}: {item.value}" for item in vital_signs]
        )
        warnings = self._urgent_warnings(transcript, entities)
        return PrescriptionDraft(
            identified_issues=_unique(entities.conditions),
            identified_symptoms=_unique(entities.symptoms),
            medications=medications,
            recommended_lab_tests=lab_tests,
            vitals=vitals,
            allergies=_unique(entities.allergies),
            warnings=warnings,
        )

    @staticmethod
    def _urgent_warnings(
        transcript: str,
        entities: MedicalInfoData,
    ) -> list[WarningItem]:
        """Flag urgent patterns without asserting a diagnosis."""
        urgent = any(
            re.search(pattern, transcript, re.IGNORECASE)
            for pattern in URGENT_TEXT_PATTERNS
        )
        vital_signs = entities.vital_signs
        if hasattr(vital_signs, "blood_pressure"):
            blood_pressure = vital_signs.blood_pressure
            if blood_pressure:
                systolic, diastolic = map(int, blood_pressure.split("/"))
                urgent = urgent or systolic >= 180 or diastolic >= 110
            oxygen = vital_signs.oxygen_saturation
            if oxygen:
                match = re.search(r"\d+", oxygen)
                urgent = urgent or bool(match and int(match.group()) < 90)
        return (
            [
                WarningItem(
                    code="URGENT_REVIEW_RECOMMENDED",
                    message=(
                        "The transcript contains symptoms or vitals that may "
                        "require urgent clinical review."
                    ),
                )
            ]
            if urgent
            else []
        )

    @staticmethod
    def _entity_count(entities: MedicalInfoData) -> int:
        vital_signs = entities.vital_signs
        vital_count = (
            sum(bool(value) for value in vital_signs.model_dump().values())
            if hasattr(vital_signs, "model_dump")
            else len(vital_signs)
        )
        return (
            len(entities.symptoms)
            + len(entities.conditions)
            + len(entities.medications)
            + len(entities.procedures)
            + len(entities.allergies)
            + vital_count
        )


@lru_cache
def get_summarize_service() -> SummarizeService:
    """Return a shared draft service using the existing shared NER service."""
    return SummarizeService(get_ner_service(), get_settings())
