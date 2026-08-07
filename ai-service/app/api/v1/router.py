"""Version 1 endpoint router."""

from fastapi import APIRouter

from app.api.v1.endpoints.consultation_summary import (
    router as consultation_summary_router,
)
from app.api.v1.endpoints.diet import router as diet_router
from app.api.v1.endpoints.doctor_recommendation import (
    router as doctor_recommendation_router,
)
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.medical_info import router as medical_info_router
from app.api.v1.endpoints.live_transcription import (
    router as live_transcription_router,
)
from app.api.v1.endpoints.ocr import router as ocr_router
from app.api.v1.endpoints.prescription import router as prescription_router
from app.api.v1.endpoints.transcription import router as transcription_router
from app.api.v1.endpoints.text_cleanup import router as text_cleanup_router
from app.api.v1.endpoints.summarize import router as summarize_router
from app.api.v1.endpoints.consultation import router as consultation_router

router = APIRouter()
router.include_router(health_router)
router.include_router(transcription_router)
router.include_router(text_cleanup_router)
router.include_router(medical_info_router)
router.include_router(consultation_summary_router)
router.include_router(prescription_router)
router.include_router(summarize_router)
router.include_router(diet_router)
router.include_router(doctor_recommendation_router)
router.include_router(ocr_router)
router.include_router(live_transcription_router)
router.include_router(consultation_router)
