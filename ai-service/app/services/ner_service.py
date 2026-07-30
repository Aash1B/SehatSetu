"""Hybrid biomedical entity extraction using Transformers and regex."""

from __future__ import annotations

import re
from functools import lru_cache
from time import perf_counter
from typing import Any, Protocol

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.medical_info import (
    MedicalInfoData,
    MedicationMention,
    SymptomMention,
    VitalSign,
    VitalSigns,
)

logger = get_logger(__name__)
settings = get_settings()


class TokenClassifier(Protocol):
    """Callable interface implemented by a Transformers NER pipeline."""

    def __call__(self, text: str) -> list[dict[str, Any]]:
        """Return token-classification results."""


SYMPTOMS = {
    "fever", "cough", "headache", "fatigue", "nausea", "vomiting",
    "dizziness", "chest pain", "shortness of breath", "breathlessness",
    "difficulty breathing", "loss of consciousness", "sore throat",
}
CONDITIONS = {
    "asthma", "diabetes", "hypertension", "pneumonia", "arthritis", "migraine",
}
MEDICATIONS = {
    "amoxicillin", "aspirin", "ibuprofen", "metformin", "paracetamol",
    "penicillin", "telmisartan",
}
PROCEDURES = {
    "blood test", "ct scan", "mri", "surgery", "ultrasound", "x-ray",
    "ecg", "cbc", "troponin i",
}
TERM_ALIASES = {
    "bukhar": "fever",
    "बुखार": "fever",
    "khansi": "cough",
    "खांसी": "cough",
    "sir dard": "headache",
    "sar dard": "headache",
    "सिर दर्द": "headache",
    "chakkar": "dizziness",
    "चक्कर": "dizziness",
}

BP_PATTERN = re.compile(
    r"\b(?:blood\s+pressure|bp)\s*(?:is|was|of|:)?\s*(\d{2,3}/\d{2,3})\b",
    re.IGNORECASE,
)
TEMP_PATTERN = re.compile(
    r"\b(?:temperature|temp)\s*(?:is|was|of|:)?\s*"
    r"(\d{2,3}(?:\.\d+)?\s*(?:°|Â°)?\s*[FC])\b",
    re.IGNORECASE,
)
HEART_RATE_PATTERN = re.compile(
    r"\b(?:heart\s+rate|pulse)\s*(?:is|was|of|:)?\s*"
    r"(\d{2,3}\s*(?:bpm|beats\s+per\s+minute))\b",
    re.IGNORECASE,
)
WEIGHT_PATTERN = re.compile(
    r"\b(?:weight|weighs?)\s*(?:is|was|of|:)?\s*"
    r"(\d{1,3}(?:\.\d+)?\s*(?:kg|kgs?|kilograms?|lb|lbs|pounds?))\b",
    re.IGNORECASE,
)
HEIGHT_PATTERN = re.compile(
    r"\b(?:height|tall)\s*(?:is|was|of|:)?\s*"
    r"(\d{1,3}(?:\.\d+)?\s*(?:cm|centimeters?|m|meters?|ft|feet))\b",
    re.IGNORECASE,
)
OXYGEN_SATURATION_PATTERN = re.compile(
    r"\b(?:oxygen\s+saturation|spo2)\s*(?:is|was|of|:)?\s*"
    r"(\d{1,3}\s*(?:%|percent))\b",
    re.IGNORECASE,
)
BLOOD_SUGAR_PATTERN = re.compile(
    r"\b(?:blood\s+sugar|glucose)\s*(?:is|was|of|:)?\s*"
    r"(\d{1,4}(?:\.\d+)?\s*mg/dl)\b",
    re.IGNORECASE,
)
DURATION_PATTERN = re.compile(
    r"\b((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+"
    r"(?:hours?|days?|weeks?|months?|years?))\b",
    re.IGNORECASE,
)
DOSAGE_PATTERN = re.compile(
    r"\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?))\b", re.IGNORECASE
)
FREQUENCY_PATTERN = re.compile(
    r"\b(once daily|twice daily|thrice daily|"
    r"\d+\s+times?\s+(?:a|per)\s+day|every\s+\d+\s+hours?|"
    r"at bedtime|as needed)\b",
    re.IGNORECASE,
)
ALLERGY_PATTERN = re.compile(
    r"\b(?:allergic\s+to|allergy\s+to|allergies\s*(?:include|:))\s+"
    r"([a-z][a-z -]{1,50}?)(?=\s*(?:,|\.|;|\band\b|\bbut\b|$))",
    re.IGNORECASE,
)
NEGATION_PATTERN = re.compile(
    r"(?:\bno\b|\bdenies?\b|\bwithout\b|\bnot\s+experiencing\b)"
    r"(?:\s+\w+){0,3}\s*$",
    re.IGNORECASE,
)


def _unique(values: list[str]) -> list[str]:
    """Return normalized values in first-seen order."""
    return list(dict.fromkeys(value.strip().lower() for value in values if value))


def _terms_in_text(text: str, terms: set[str]) -> list[str]:
    """Find complete lexicon terms in source order."""
    lowered = text.lower()
    found = [
        term for term in terms
        if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lowered)
    ]
    return sorted(found, key=lowered.find)


class MedicalNERService:
    """Combine optional biomedical model entities with deterministic patterns."""

    def __init__(self, classifier: TokenClassifier | None = None) -> None:
        self._classifier = classifier
        self._model_load_attempted = classifier is not None

    def extract(self, transcript: str) -> MedicalInfoData:
        """Extract entities without retaining or logging transcript text."""
        started_at = perf_counter()
        logger.info("Medical entity processing started")
        text = self._normalize_medical_terms(transcript)
        model_entities = self._extract_model_entities(text)

        symptom_names = _unique(
            _terms_in_text(text, SYMPTOMS) + model_entities["symptoms"]
        )
        symptom_details = [
            self._symptom_mention(text, name) for name in symptom_names
        ]
        active_symptoms = [
            mention.name for mention in symptom_details if not mention.negated
        ]
        conditions = _unique(
            _terms_in_text(text, CONDITIONS) + model_entities["conditions"]
        )
        procedures = _unique(
            _terms_in_text(text, PROCEDURES) + model_entities["procedures"]
        )
        allergies = _unique(
            [match.group(1) for match in ALLERGY_PATTERN.finditer(text)]
        )
        medications = self._extract_medications(
            text, allergies, model_entities["medications"]
        )
        durations = _unique(
            [match.group(1) for match in DURATION_PATTERN.finditer(text)]
        )
        vital_signs = VitalSigns(
            blood_pressure=self._first(BP_PATTERN, text),
            temperature=self._normalize_temperature(
                self._first(TEMP_PATTERN, text)
            ),
            heart_rate=self._first(HEART_RATE_PATTERN, text),
            weight=self._first(WEIGHT_PATTERN, text),
            height=self._first(HEIGHT_PATTERN, text),
            oxygen_saturation=self._first(
                OXYGEN_SATURATION_PATTERN, text
            ),
            blood_sugar=self._first(BLOOD_SUGAR_PATTERN, text),
        )
        legacy_vitals = [
            VitalSign(name=name, value=value)
            for name, value in vital_signs.model_dump().items()
            if value is not None
        ]
        result = MedicalInfoData(
            symptoms=active_symptoms,
            symptom_details=symptom_details,
            conditions=conditions,
            allergies=allergies,
            medications=medications,
            duration=durations,
            durations=durations,
            vital_signs=vital_signs,
            legacy_vital_signs=legacy_vitals,
            procedures=procedures,
        )
        entity_count = sum(
            len(values)
            for values in (
                result.symptoms,
                result.conditions,
                result.allergies,
                result.medications,
                result.procedures,
            )
        )
        logger.info(
            "Medical entities extracted entity_count=%d processing_ms=%.2f",
            entity_count,
            (perf_counter() - started_at) * 1000,
        )
        return result

    def _extract_medications(
        self,
        transcript: str,
        allergies: list[str],
        model_medications: list[str],
    ) -> list[MedicationMention]:
        allergy_terms = set(allergies)
        medication_names = _unique(
            _terms_in_text(transcript, MEDICATIONS) + model_medications
        )
        mentions: list[MedicationMention] = []
        for name in medication_names:
            if name in allergy_terms:
                continue
            position = transcript.lower().find(name)
            context = transcript[position : position + 120]
            mentions.append(
                MedicationMention(
                    name=name,
                    dosage=self._normalize_dosage(
                        self._first(DOSAGE_PATTERN, context)
                    ),
                    frequency=self._first(FREQUENCY_PATTERN, context),
                    duration=self._first(DURATION_PATTERN, context),
                )
            )
        return mentions

    def _extract_model_entities(self, transcript: str) -> dict[str, list[str]]:
        grouped = {
            "symptoms": [], "conditions": [], "medications": [], "procedures": [],
        }
        classifier = self._get_classifier()
        if classifier is None:
            return grouped
        try:
            for entity in classifier(transcript):
                label = str(
                    entity.get("entity_group") or entity.get("entity") or ""
                ).lower()
                word = str(entity.get("word") or "").replace("##", "").strip()
                if not word:
                    continue
                if any(key in label for key in ("disease", "condition")):
                    grouped["conditions"].append(word)
                elif any(key in label for key in ("sign", "symptom")):
                    grouped["symptoms"].append(word)
                elif any(key in label for key in ("medication", "drug")):
                    grouped["medications"].append(word)
                elif "procedure" in label:
                    grouped["procedures"].append(word)
        except Exception:
            logger.exception("Biomedical NER inference failed; using regex fallback")
        return grouped

    def _get_classifier(self) -> TokenClassifier | None:
        if self._model_load_attempted:
            return self._classifier
        self._model_load_attempted = True
        try:
            from transformers import pipeline

            self._classifier = pipeline(
                "token-classification",
                model=settings.ner_model_name,
                aggregation_strategy="simple",
                local_files_only=settings.ner_local_files_only,
            )
        except Exception:
            logger.warning(
                "Biomedical NER model unavailable; using deterministic fallback"
            )
            self._classifier = None
        return self._classifier

    @staticmethod
    def _normalize_medical_terms(transcript: str) -> str:
        normalized = transcript
        for source, target in TERM_ALIASES.items():
            normalized = re.sub(
                rf"(?<!\w){re.escape(source)}(?!\w)",
                target,
                normalized,
                flags=re.IGNORECASE,
            )
        return re.sub(
            r"\b((?:blood\s+pressure|bp)\s*(?:is|was|:)?\s*)"
            r"(\d{2,3})\s+(?:by|over)\s+(\d{2,3})\b",
            lambda match: f"{match.group(1)}{match.group(2)}/{match.group(3)}",
            normalized,
            flags=re.IGNORECASE,
        )

    @staticmethod
    def _symptom_mention(text: str, name: str) -> SymptomMention:
        match = re.search(rf"(?<!\w){re.escape(name)}(?!\w)", text, re.IGNORECASE)
        if not match:
            return SymptomMention(name=name)
        prefix = text[max(0, match.start() - 50) : match.start()]
        negation_scope = re.split(
            r"\b(?:but|however)\b|[.;]", prefix, flags=re.IGNORECASE
        )[-1]
        duration_match = DURATION_PATTERN.search(text[match.end() : match.end() + 60])
        return SymptomMention(
            name=name,
            duration=duration_match.group(1).lower() if duration_match else None,
            negated=bool(NEGATION_PATTERN.search(negation_scope)),
            confidence=None,
        )

    @staticmethod
    def _normalize_temperature(value: str | None) -> str | None:
        if value is None:
            return None
        return re.sub(r"\s*(?:Â°|°)?\s*([FC])$", r"°\1", value, flags=re.I)

    @staticmethod
    def _normalize_dosage(value: str | None) -> str | None:
        if value is None:
            return None
        return re.sub(
            r"^(\d+(?:\.\d+)?)\s*([a-z]+)$",
            r"\1 \2",
            value,
            flags=re.I,
        )

    @staticmethod
    def _first(pattern: re.Pattern[str], text: str) -> str | None:
        match = pattern.search(text)
        return match.group(1).strip() if match else None


@lru_cache
def get_ner_service() -> MedicalNERService:
    """Return the shared lazily initialized NER service."""
    return MedicalNERService()
