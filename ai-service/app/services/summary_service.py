"""Provider-neutral consultation summary orchestration."""

import json
from functools import lru_cache

from fastapi import status

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.consultation_summary import (
    GeneratedSummaryData,
    SummaryMedicalEntities,
)
from app.services.gemini_service import GeminiService

logger = get_logger(__name__)
MAX_SUMMARY_WORDS = 150


class SummaryService:
    """Delegate generation to Gemini and validate the resulting summary."""

    def __init__(self, gemini_service: GeminiService) -> None:
        self._gemini_service = gemini_service

    def generate(
        self,
        transcript: str,
        medical_entities: SummaryMedicalEntities | None = None,
    ) -> GeneratedSummaryData:
        """Return a validated consultation summary."""
        summary = self._gemini_service.generate_consultation_summary(
            transcript, medical_entities
        )
        structured = self._parse_structured_summary(summary)
        if structured is not None:
            return structured
        if (
            len(summary) < 10
            or len(summary) > 4_000
            or len(summary.split()) > MAX_SUMMARY_WORDS
        ):
            logger.error("Gemini returned an invalid summary response")
            raise AppException(
                "The summary provider returned an invalid response",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="INVALID_SUMMARY_RESPONSE",
            )
        return GeneratedSummaryData(summary=summary)

    @staticmethod
    def _parse_structured_summary(text: str) -> GeneratedSummaryData | None:
        """Parse Gemini JSON, falling back to usable plain text."""
        candidate = text.strip()
        if candidate.startswith("```") and candidate.endswith("```"):
            candidate = candidate.removeprefix("```json").removeprefix("```")
            candidate = candidate.removesuffix("```").strip()
        try:
            payload = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(payload, dict):
            return None

        clinical_summary = payload.get("clinical_summary")
        summary = payload.get("summary") or clinical_summary
        if not isinstance(summary, str) or len(summary.strip()) < 10:
            return None
        return GeneratedSummaryData(
            summary=summary.strip(),
            chief_complaint=SummaryService._optional_text(
                payload.get("chief_complaint")
            ),
            history_of_present_illness=SummaryService._optional_text(
                payload.get("history_of_present_illness")
            ),
            allergies=SummaryService._string_list(payload.get("allergies")),
            vital_signs=SummaryService._string_dict(payload.get("vital_signs")),
            doctor_advice=SummaryService._string_list(
                payload.get("doctor_advice")
            ),
            clinical_summary=clinical_summary.strip()
            if isinstance(clinical_summary, str)
            else None,
        )

    @staticmethod
    def _optional_text(value: object) -> str | None:
        return value.strip() if isinstance(value, str) and value.strip() else None

    @staticmethod
    def _string_list(value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item.strip() for item in value if isinstance(item, str) and item.strip()]

    @staticmethod
    def _string_dict(value: object) -> dict[str, str]:
        if not isinstance(value, dict):
            return {}
        return {
            str(key): item.strip()
            for key, item in value.items()
            if isinstance(item, str) and item.strip()
        }


@lru_cache
def get_summary_service() -> SummaryService:
    """Return the shared summary service with its Gemini dependency."""
    return SummaryService(GeminiService(get_settings()))
