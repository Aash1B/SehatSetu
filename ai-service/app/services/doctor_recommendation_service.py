"""Hybrid, safety-first doctor-category recommendation service."""

import asyncio
import re
from collections import Counter
from collections.abc import Callable

from app.core.config import Settings, get_settings
from app.core.doctor_category_rules import (
    DOCTOR_CATEGORY_RULES,
    EMERGENCY_PHRASES,
    DoctorCategory,
)
from app.core.logging import get_logger
from app.schemas.doctor_recommendation import (
    DoctorRecommendationData,
    DoctorRecommendationRequest,
    GeminiDoctorRecommendation,
    RecommendationSource,
    SpecialtyRecommendation,
    Urgency,
)
from app.services.gemini_service import GeminiService
from app.services.language_service import language_service
from app.services.hospital_enrichment_service import (
    CLASSIFICATION_NOTICE,
    HospitalEnrichmentService,
)

logger = get_logger(__name__)
EMERGENCY_WARNING = (
    "Seek immediate emergency medical assistance. Do not wait to book a "
    "regular appointment."
)
GeminiClassifier = Callable[
    [str, list[str], int | None], GeminiDoctorRecommendation
]


def _normalize_text(value: str) -> str:
    """Normalize case, punctuation, hyphens, and whitespace."""
    return " ".join(re.sub(r"[^\w\s]", " ", value.lower()).split())


class DoctorRecommendationService:
    """Combine emergency rules, symptom rules, and a safe Gemini fallback."""

    def __init__(
        self,
        settings: Settings,
        gemini_classifier: GeminiClassifier | None = None,
        hospital_service: HospitalEnrichmentService | None = None,
    ) -> None:
        self._settings = settings
        self._gemini_classifier = gemini_classifier
        self._hospital_service = hospital_service or HospitalEnrichmentService()

    async def recommend(
        self, request: DoctorRecommendationRequest
    ) -> DoctorRecommendationData:
        """Recommend an allowed doctor category using the required priority."""
        language_service.resolve(
            request.issue, request.language, request.output_language
        )
        text = _normalize_text(" ".join([request.issue, *request.symptoms, *request.known_conditions, request.additional_notes, request.severity or ""]))
        if not text:
            result = self._general_fallback(confidence=0.0)
            return self._enrich(result, [], request=request, insufficient=True, advanced=request.advanced_input)
        emergency = self._detect_emergency(text)
        if emergency:
            return self._enrich(emergency, emergency.matched_symptoms, request=request, advanced=request.advanced_input)

        rule_result = self._match_rules(text, request.age)
        if rule_result.confidence >= self._settings.doctor_rule_confidence_threshold:
            return self._enrich(rule_result, [], request=request, advanced=request.advanced_input)

        gemini_result = await self._try_gemini(request)
        if gemini_result is not None:
            return self._enrich(gemini_result, [], request=request, advanced=request.advanced_input)
        if rule_result.matched_symptoms:
            return self._enrich(rule_result, [], request=request, advanced=request.advanced_input)
        return self._enrich(self._general_fallback(), [], request=request, advanced=request.advanced_input)

    @staticmethod
    def _detect_emergency(text: str) -> DoctorRecommendationData | None:
        """Detect emergency language before any appointment routing."""
        matches = [phrase for phrase in EMERGENCY_PHRASES if phrase in text]
        deterministic_flags = {
            "stroke signs": ("face droop" in text or "slurred speech" in text or "weakness on one side" in text),
            "chest pain with breathlessness": ("chest pain" in text and any(term in text for term in ("shortness of breath", "breathlessness", "difficulty breathing"))),
            "severe allergic reaction": (any(term in text for term in ("anaphylaxis", "throat swelling", "tongue swelling")) or ("allergic" in text and "difficulty breathing" in text)),
            "self-harm risk": any(term in text for term in ("suicide", "kill myself", "self harm")),
            "pregnancy emergency": ("pregnan" in text and any(term in text for term in ("severe bleeding", "heavy bleeding", "severe pain"))),
            "poisoning or overdose": any(term in text for term in ("poisoning", "overdose")),
            "major trauma": any(term in text for term in ("major trauma", "serious accident")),
            "altered consciousness": any(term in text for term in ("unconscious", "not responding", "altered consciousness", "blue lips", "collapse")),
            "seizure": "seizure" in text,
            "severe bleeding": "severe bleeding" in text or "bleeding heavily" in text,
        }
        matches.extend(label for label, detected in deterministic_flags.items() if detected)
        if not matches:
            return None
        if "difficulty breathing" in text and "difficulty breathing" not in matches:
            matches.append("difficulty breathing")
        return DoctorRecommendationData(
            recommended_doctor_category=DoctorCategory.GENERAL_PHYSICIAN,
            matched_symptoms=list(dict.fromkeys(matches)),
            reason="The reported symptoms may require immediate emergency assessment.",
            urgency=Urgency.EMERGENCY,
            confidence=min(0.99, 0.96 + 0.01 * (len(matches) - 1)),
            alternative_categories=[],
            recommendation_source=RecommendationSource.EMERGENCY_RULES,
            emergency_warning=EMERGENCY_WARNING,
            disclaimer="This is not a medical diagnosis.",
        )

    def _enrich(self, result: DoctorRecommendationData, red_flags: list[str], request: DoctorRecommendationRequest, insufficient: bool = False, advanced: bool = False) -> DoctorRecommendationData:
        emergency = result.urgency == Urgency.EMERGENCY
        specialty = "Emergency Medicine" if emergency else result.recommended_doctor_category.value
        timeframe = "immediate" if emergency else ("within 24 hours" if result.urgency in {Urgency.PRIORITY, Urgency.URGENT} else "routine appointment")
        recommendation = SpecialtyRecommendation(specialty=specialty, priority=1, reason=result.reason, recommended_timeframe=timeframe)
        alternatives = [
            SpecialtyRecommendation(specialty=category.value, priority=index + 2, reason="Alternative clinical assessment pathway", recommended_timeframe=timeframe)
            for index, category in enumerate(result.alternative_categories[:2])
        ]
        urgency = Urgency.INSUFFICIENT_INFORMATION if insufficient else (Urgency.EMERGENCY if emergency else (Urgency.ROUTINE if advanced and result.urgency == Urgency.NORMAL else result.urgency))
        condition = " ".join([request.issue, *request.symptoms, *red_flags])
        hospitals = self._hospital_service.enrich_and_rank(request.nearby_hospitals, condition, emergency)
        emergency_instruction = (
            f"Call {self._settings.emergency_number} immediately and visit the nearest suitable emergency facility."
            if emergency else ""
        )
        return result.model_copy(update={
            "urgency": urgency,
            "emergency_detected": emergency,
            "emergency_message": "This may be a medical emergency. Contact local emergency services or go to the nearest emergency department immediately." if emergency else "",
            "recommended_specialties": [recommendation, *alternatives][:3] if not insufficient else [],
            "primary_recommendation": recommendation.model_dump() if not insufficient else {},
            "reasoning": [result.reason],
            "red_flags": list(dict.fromkeys(red_flags)),
            "next_steps": ["Do not wait for an online appointment", "Call local emergency services", "Seek immediate in-person medical care"] if emergency else (["Provide more symptom details or seek an initial General Medicine assessment"] if insufficient else ["Arrange an appropriate clinical consultation"]),
            "requires_human_review": True,
            "emergency_instruction": emergency_instruction,
            "nearby_hospitals": hospitals,
            "hospital_classification_notice": CLASSIFICATION_NOTICE if hospitals else "",
        })

    def _match_rules(
        self, text: str, age: int | None
    ) -> DoctorRecommendationData:
        """Score symptom phrases and apply the nuanced pediatric rule."""
        matches = {
            category: [phrase for phrase in phrases if phrase in text]
            for category, phrases in DOCTOR_CATEGORY_RULES.items()
        }
        matches = {category: values for category, values in matches.items() if values}
        specialist_matches = {
            category: values
            for category, values in matches.items()
            if category not in {
                DoctorCategory.GENERAL_PHYSICIAN,
                DoctorCategory.PEDIATRICIAN,
            }
        }

        if age is not None and age < 18 and not specialist_matches:
            child_matches = matches.get(DoctorCategory.PEDIATRICIAN, [])
            general_matches = matches.get(DoctorCategory.GENERAL_PHYSICIAN, [])
            return self._rule_result(
                DoctorCategory.PEDIATRICIAN,
                child_matches or general_matches,
                [DoctorCategory.GENERAL_PHYSICIAN] if general_matches else [],
                0.84 if child_matches or general_matches else 0.68,
            )

        if not matches:
            return self._general_fallback(confidence=0.40)

        scores = Counter(
            {category: len(values) for category, values in matches.items()}
        )
        ranked = sorted(
            scores,
            key=lambda category: (
                -scores[category],
                list(DOCTOR_CATEGORY_RULES).index(category),
            ),
        )
        primary = ranked[0]
        alternatives = [
            category
            for category in ranked[1:3]
            if scores[primary] - scores[category] <= 1
        ]
        if age is not None and age < 18 and primary != DoctorCategory.PEDIATRICIAN:
            if DoctorCategory.PEDIATRICIAN not in alternatives:
                alternatives = [*alternatives[:1], DoctorCategory.PEDIATRICIAN]

        confidence = (
            min(0.75, 0.58 + 0.06 * scores[primary])
            if alternatives
            else min(0.96, 0.76 + 0.08 * (scores[primary] - 1))
        )
        return self._rule_result(
            primary,
            matches[primary],
            alternatives,
            confidence,
        )

    @staticmethod
    def _rule_result(
        category: DoctorCategory,
        matched: list[str],
        alternatives: list[DoctorCategory],
        confidence: float,
    ) -> DoctorRecommendationData:
        """Build a rule-based response using only controlled categories."""
        urgency = (
            Urgency.PRIORITY
            if category == DoctorCategory.PULMONOLOGIST
            and any("persistent" in phrase or "chronic" in phrase for phrase in matched)
            else Urgency.NORMAL
        )
        return DoctorRecommendationData(
            recommended_doctor_category=category,
            matched_symptoms=list(dict.fromkeys(matched)),
            reason=(
                f"The reported symptoms are most relevant to {category.value}. "
                "A medical professional should assess the concern."
            ),
            urgency=urgency,
            confidence=round(confidence, 2),
            alternative_categories=alternatives,
            recommendation_source=RecommendationSource.SYMPTOM_RULES,
        )

    async def _try_gemini(
        self, request: DoctorRecommendationRequest
    ) -> DoctorRecommendationData | None:
        """Use Gemini only for uncertain cases and fail closed to local rules."""
        if (
            not self._settings.doctor_gemini_fallback_enabled
            or self._gemini_classifier is None
        ):
            return None
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    self._gemini_classifier,
                    request.issue,
                    request.symptoms,
                    request.age,
                ),
                timeout=self._settings.gemini_timeout_seconds,
            )
            if result.urgency == Urgency.EMERGENCY:
                logger.warning("Gemini routing emergency result rejected")
                return None
            return DoctorRecommendationData(
                **result.model_dump(),
                recommendation_source=RecommendationSource.GEMINI,
            )
        except Exception:
            logger.warning(
                "Gemini doctor-category fallback failed; using local result"
            )
            return None

    @staticmethod
    def _general_fallback(confidence: float = 0.45) -> DoctorRecommendationData:
        """Return the safest allowed category when classification is unclear."""
        return DoctorRecommendationData(
            recommended_doctor_category=DoctorCategory.GENERAL_PHYSICIAN,
            matched_symptoms=[],
            reason=(
                "No specific category was clear. A General Physician can "
                "perform the initial medical assessment."
            ),
            urgency=Urgency.NORMAL,
            confidence=confidence,
            alternative_categories=[],
            recommendation_source=RecommendationSource.GENERAL_FALLBACK,
        )


def get_doctor_recommendation_service() -> DoctorRecommendationService:
    """Create the hybrid service with the configured Gemini provider."""
    settings = get_settings()
    gemini = GeminiService(settings)
    return DoctorRecommendationService(
        settings,
        gemini_classifier=gemini.classify_doctor_category,
    )
