"""Cautious hospital classification and emergency suitability ranking."""

import re
from collections.abc import Callable

from app.schemas.hospital import (
    ClassificationSource,
    EnrichedHospital,
    HospitalType,
    RawHospital,
)

CLASSIFICATION_NOTICE = (
    "Hospital ownership and specialities may be inferred from names and listing metadata; "
    "verify them with the hospital or an authoritative source before non-emergency decisions."
)

GOVERNMENT_KEYWORDS = (
    "aiims", "government hospital", "govt hospital", "district hospital",
    "civil hospital", "municipal hospital", "community health centre",
    "community health center", "chc", "primary health centre",
    "primary health center", "phc", "esi hospital", "esic hospital",
)
PRIVATE_KEYWORDS = (
    "apollo", "fortis", "max", "medanta",
    "manipal", "narayana", "yatharth", "sharda hospital",
)
SPECIALITY_KEYWORDS = {
    "cardiology": ("heart", "cardiac", "cardiology"),
    "ophthalmology": ("eye", "ophthalmology"),
    "oncology": ("cancer", "oncology"),
    "gynaecology and maternity": ("maternity", "women", "gynecology", "gynaecology"),
    "paediatrics": ("children", "child", "paediatric", "pediatric"),
    "orthopaedics and trauma": ("orthopedic", "orthopaedic", "bone", "trauma"),
    "neurology": ("neuro", "neurology"),
    "psychiatry and mental health": ("psychiatric", "mental health"),
}
EMERGENCY_KEYWORDS = ("emergency", "trauma", "casualty", "24 hour", "24x7", "critical care")

AIHospitalClassifier = Callable[[RawHospital], tuple[HospitalType, list[str], float] | None]


def _normalise(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value.lower()).split())


def _contains(text: str, keyword: str) -> bool:
    return re.search(rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])", text) is not None


def _condition_specialities(condition: str) -> set[str]:
    text = _normalise(condition)
    matches = {
        speciality
        for speciality, keywords in SPECIALITY_KEYWORDS.items()
        if any(_contains(text, keyword) for keyword in keywords)
    }
    if any(term in text for term in ("chest pain", "heart attack", "palpitation")):
        matches.add("cardiology")
    if any(term in text for term in ("stroke", "slurred speech", "seizure", "unconscious")):
        matches.add("neurology")
    return matches


class HospitalEnrichmentService:
    def __init__(self, ai_classifier: AIHospitalClassifier | None = None) -> None:
        self._ai_classifier = ai_classifier

    def enrich_and_rank(
        self, hospitals: list[RawHospital], condition: str = "", emergency: bool = False
    ) -> list[EnrichedHospital]:
        relevant = _condition_specialities(condition)
        enriched = [self._enrich(item, relevant, emergency) for item in hospitals]
        return sorted(
            enriched,
            key=lambda item: (
                -item.emergency_suitability_score,
                item.raw.get("distance") if item.raw.get("distance") is not None else float("inf"),
            ),
        )

    def _enrich(
        self, hospital: RawHospital, relevant: set[str], emergency: bool
    ) -> EnrichedHospital:
        # ``exclude_unset`` keeps the original Google payload shape instead of
        # inventing null/default keys, while Pydantic's extra="allow" retains
        # provider fields that this service does not interpret.
        raw = hospital.model_dump(by_alias=True, exclude_none=True, exclude_unset=True)
        text = _normalise(" ".join(filter(None, [
            hospital.name, hospital.formatted_address, hospital.primary_type,
            *hospital.google_types,
        ])))
        warnings: list[str] = []

        inferred_specialities = [
            speciality for speciality, keywords in SPECIALITY_KEYWORDS.items()
            if any(_contains(text, keyword) for keyword in keywords)
        ]
        if hospital.verified_hospital_type is not None or hospital.verified_specialities:
            hospital_type = hospital.verified_hospital_type or HospitalType.SPECIALITY
            specialities = hospital.verified_specialities or inferred_specialities
            source = ClassificationSource.VERIFIED_DATABASE
            confidence = 1.0
        else:
            government = any(_contains(text, keyword) for keyword in GOVERNMENT_KEYWORDS)
            private = any(_contains(text, keyword) for keyword in PRIVATE_KEYWORDS)
            if government and private:
                hospital_type = HospitalType.UNKNOWN
                source = ClassificationSource.UNKNOWN
                confidence = 0.0
                warnings.append("Conflicting ownership keywords found; ownership was not classified.")
            elif government:
                hospital_type, source, confidence = HospitalType.GOVERNMENT, ClassificationSource.KEYWORD_RULE, 0.9
            elif private:
                hospital_type, source, confidence = HospitalType.PRIVATE, ClassificationSource.KEYWORD_RULE, 0.9
            elif inferred_specialities:
                hospital_type, source, confidence = HospitalType.SPECIALITY, ClassificationSource.KEYWORD_RULE, 0.82
            else:
                try:
                    ai_result = self._ai_classifier(hospital) if self._ai_classifier else None
                except Exception:
                    ai_result = None
                    warnings.append("Optional AI classification failed; classification defaulted safely.")
                if ai_result:
                    hospital_type, inferred_specialities, confidence = ai_result
                    source = ClassificationSource.AI_INFERENCE
                    confidence = min(0.75, max(0.0, confidence))
                else:
                    hospital_type, source, confidence = HospitalType.UNKNOWN, ClassificationSource.UNKNOWN, 0.0
            specialities = inferred_specialities

        if source in {ClassificationSource.KEYWORD_RULE, ClassificationSource.AI_INFERENCE}:
            warnings.append("Classification is inferred from listing information and is not verified.")
        if hospital.business_status and hospital.business_status.upper() != "OPERATIONAL":
            warnings.append(f"Google business status is {hospital.business_status}; verify before travelling.")
        if hospital.open_now is False:
            warnings.append("The facility is currently reported closed; emergency availability may differ.")

        score, factors = self._score(hospital, text, set(specialities), relevant)
        if source != ClassificationSource.VERIFIED_DATABASE:
            factors = [
                factor.replace(
                    "speciality relevant to the reported condition",
                    "inferred speciality relevance to the reported condition",
                )
                for factor in factors
            ]
        if hospital_type == HospitalType.UNKNOWN:
            factors.append("ownership is unknown and did not cause exclusion")
        reason_prefix = "Emergency suitability considers " if emergency else "Suitability considers "
        return EnrichedHospital(
            raw=raw,
            hospital_type=hospital_type,
            specialities=specialities,
            classification_source=source,
            classification_confidence=confidence,
            emergency_suitability_score=score,
            recommendation_reason=reason_prefix + ", ".join(factors) + ".",
            warnings=warnings,
        )

    @staticmethod
    def _score(
        hospital: RawHospital, text: str, specialities: set[str], relevant: set[str]
    ) -> tuple[float, list[str]]:
        score = 0.0
        factors: list[str] = []
        if hospital.open_now is True:
            score += 25
            factors.append("reported open now")
        elif hospital.open_now is None:
            score += 8
            factors.append("opening status unavailable")
        else:
            factors.append("reported closed now")

        emergency_indicator = any(_contains(text, term) for term in EMERGENCY_KEYWORDS)
        if emergency_indicator:
            score += 25
            factors.append("emergency or trauma indicator")

        speciality_match = bool(specialities & relevant)
        if speciality_match:
            score += 25
            factors.append("speciality relevant to the reported condition")

        if hospital.distance is not None:
            distance_points = 20 / (1 + hospital.distance / 5000)
            score += distance_points
            factors.append(f"distance {hospital.distance:g} metres")
        else:
            factors.append("distance unavailable")

        status = (hospital.business_status or "").upper()
        if status == "OPERATIONAL":
            score += 10
            factors.append("operational listing")
        elif not status:
            score += 3
            factors.append("business status unavailable")

        return round(min(100, score), 2), factors
