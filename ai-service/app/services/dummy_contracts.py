"""Deterministic Day 2 contract implementations.

These functions intentionally perform no AI processing and make no external calls.
"""

from app.schemas.consultation_summary import ConsultationSummaryData
from app.schemas.diet import DietRecommendationData, DietRecommendationRequest
from app.schemas.medical_info import MedicalInfoData
from app.schemas.prescription import PrescriptionData


def create_dummy_medical_info() -> MedicalInfoData:
    """Return stable placeholder medical entities for legacy callers."""
    return MedicalInfoData(
        symptoms=["fever"],
        duration=["three days"],
        durations=["three days"],
        allergies=["penicillin"],
        medications=[],
        conditions=[],
        procedures=[],
        is_dummy=True,
    )


def create_dummy_summary() -> ConsultationSummaryData:
    """Return a stable placeholder consultation summary."""
    return ConsultationSummaryData(
        chief_complaint="Fever and headache for three days",
        symptoms=["fever", "headache"],
        medical_history=[],
        allergies=[],
        doctor_advice=["Rest", "Maintain hydration"],
        follow_up=None,
    )


def create_dummy_prescription() -> PrescriptionData:
    """Return a safe placeholder draft containing no medication or dosage."""
    return PrescriptionData(
        medications=[],
        warnings=[],
        diagnosis="Draft diagnosis pending doctor review",
        instructions=[
            "Review and confirm all extracted information before issuing a "
            "prescription.",
        ],
        requires_doctor_confirmation=True,
        is_dummy=True,
    )


def create_dummy_diet_recommendation(
    request: DietRecommendationRequest,
) -> DietRecommendationData:
    """Return a stable preliminary diet recommendation."""
    return DietRecommendationData(
        condition=request.summary,
        recommended_foods=["Light meals", "Fluids"],
        foods_to_limit=["Very oily foods"],
        foods_to_avoid=[],
        hydration="Maintain hydration.",
        meal_guidance=[],
        notes=[],
        general_advice=["Maintain hydration"],
        disclaimer="This is a preliminary recommendation and must be reviewed "
        "by a qualified healthcare professional.",
        is_dummy=True,
    )
