"""Tests for Gemini-backed, doctor-reviewed diet recommendations."""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.exceptions import AppException
from app.main import app
from app.schemas.diet import DietRecommendationData
from app.services.diet_service import get_diet_service

API_URL = "/api/v1/diet-recommendation"


class SuccessfulDietService:
    """Return deterministic validated data without an external API call."""

    async def generate(self, request: object) -> DietRecommendationData:
        return DietRecommendationData(
            recommended_foods=["Oats", "Dal", "Boiled vegetables"],
            foods_to_limit=["Salt"],
            foods_to_avoid=["Sugary drinks"],
            hydration="Drink water regularly according to the doctor's advice.",
            meal_guidance=["Prefer smaller balanced meals."],
            notes=["Review this guidance with the treating doctor."],
        )


@pytest.fixture
def client():
    """Provide a test client with Gemini generation mocked."""
    app.dependency_overrides[get_diet_service] = SuccessfulDietService
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_diet_endpoint_returns_validated_guidance(client: TestClient) -> None:
    response = client.post(
        API_URL,
        json={
            "summary": "Patient has hypertension and needs diet guidance.",
            "medical_entities": {"conditions": ["hypertension"]},
        },
    )
    data = response.json()["data"]

    assert response.status_code == 200
    assert "Oats" in data["recommended_foods"]
    assert data["requires_doctor_review"] is True
    assert "Doctor review required" in data["disclaimer"]


@pytest.mark.parametrize("payload", [{}, {"summary": ""}, {"summary": "   "}])
def test_diet_rejects_missing_or_empty_summary(
    client: TestClient, payload: dict[str, str]
) -> None:
    response = client.post(API_URL, json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_invalid_gemini_response_uses_standard_error(
    client: TestClient,
) -> None:
    class InvalidResponseService:
        async def generate(self, request: object) -> DietRecommendationData:
            raise AppException(
                "Gemini returned an invalid structured response",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_INVALID_RESPONSE",
            )

    app.dependency_overrides[get_diet_service] = InvalidResponseService
    response = client.post(
        API_URL,
        json={"summary": "Patient has diabetes and needs dietary guidance."},
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GEMINI_INVALID_RESPONSE"
