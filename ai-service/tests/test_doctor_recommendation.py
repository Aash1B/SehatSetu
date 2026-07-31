"""Tests for safe, deterministic doctor-specialization recommendations."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.schemas.doctor_recommendation import (
    DoctorRecommendationRequest,
    GeminiDoctorRecommendation,
    Urgency,
)
from app.services.doctor_recommendation_service import (
    DoctorRecommendationService,
    get_doctor_recommendation_service,
)

API_URL = "/api/v1/recommend-doctor"


@pytest.fixture
def client():
    """Provide an isolated application client."""
    settings = Settings(
        _env_file=None,
        doctor_gemini_fallback_enabled=False,
    )
    app.dependency_overrides[get_doctor_recommendation_service] = lambda: (
        DoctorRecommendationService(settings)
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def recommend(
    client: TestClient,
    issue: str,
    symptoms: list[str] | None = None,
    **extra: object,
):
    """Submit a recommendation request."""
    return client.post(
        API_URL,
        json={"issue": issue, "symptoms": symptoms or [], **extra},
    )


@pytest.mark.parametrize(
    ("issue", "symptoms", "expected"),
    [
        (
            "Chest pain with palpitations",
            ["chest pain", "palpitations"],
            "Cardiologist",
        ),
        (
            "Ear pain and a blocked nose",
            ["ear pain", "blocked nose"],
            "ENT Specialist (Ear, Nose & Throat)",
        ),
        (
            "Skin rash with itching",
            ["rash", "itching"],
            "Dermatologist (Skin Specialist)",
        ),
        (
            "Knee and joint pain",
            ["knee pain", "joint pain"],
            "Orthopedic Doctor",
        ),
        (
            "Stomach pain and acidity",
            ["stomach pain", "acidity"],
            "Gastroenterologist",
        ),
        ("I have tooth pain", [], "Dentist"),
        (
            "Fever and weakness",
            ["fever", "weakness"],
            "General Physician",
        ),
    ],
)
def test_rule_based_specializations(
    client: TestClient,
    issue: str,
    symptoms: list[str],
    expected: str,
) -> None:
    response = recommend(client, issue, symptoms)

    assert response.status_code == 200
    assert response.json()["data"]["recommended_doctor_category"] == expected


def test_vague_issue_falls_back_to_general_medicine(
    client: TestClient,
) -> None:
    data = recommend(client, "I do not feel quite right today").json()["data"]

    assert data["recommended_doctor_category"] == "General Physician"
    assert data["confidence"] == 0.45
    assert data["recommendation_source"] == "general_fallback"
    assert "initial medical assessment" in data["reason"]


def test_emergency_detection_takes_precedence(client: TestClient) -> None:
    response = recommend(
        client,
        "I have severe chest pain and difficulty breathing",
    )
    data = response.json()["data"]

    assert data["recommended_doctor_category"] == "General Physician"
    assert data["urgency"] == "emergency"
    assert data["confidence"] >= 0.9
    assert data["alternative_categories"] == []
    assert data["recommendation_source"] == "emergency_rules"
    assert "immediate emergency medical assistance" in data["emergency_warning"]


@pytest.mark.parametrize(
    "payload",
    [
        {"issue": ""},
        {"issue": "   "},
        {"issue": "Fever", "age": -1},
        {"issue": "Fever", "age": 121},
    ],
)
def test_invalid_request_returns_standard_validation_error(
    client: TestClient, payload: dict[str, object]
) -> None:
    response = client.post(API_URL, json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_multiple_categories_return_an_alternative(
    client: TestClient,
) -> None:
    data = recommend(
        client,
        "I have chest pain and stomach pain",
        ["chest pain", "stomach pain"],
    ).json()["data"]

    assert data["recommended_doctor_category"] == "Cardiologist"
    assert data["alternative_categories"] == ["Gastroenterologist"]


def test_duplicate_symptoms_are_removed(client: TestClient) -> None:
    data = recommend(
        client,
        "My ear hurts",
        [" Ear Pain ", "ear pain", "EAR PAIN"],
    ).json()["data"]

    assert data["matched_symptoms"] == ["ear pain"]


@pytest.mark.parametrize(
    "issue",
    [
        "chest pain",
        "skin rash",
        "an unusual concern",
        "severe chest pain",
    ],
)
def test_confidence_is_always_bounded(
    client: TestClient, issue: str
) -> None:
    confidence = recommend(client, issue).json()["data"]["confidence"]

    assert 0 <= confidence <= 1


def test_request_normalization_and_optional_demographics(
    client: TestClient,
) -> None:
    response = recommend(
        client,
        "  blocked   nose and ear pain  ",
        [" BLOCKED NOSE ", "", "ear pain"],
        age=24,
        gender=" male ",
    )

    assert response.status_code == 200
    assert response.json()["data"]["recommended_doctor_category"] == (
        "ENT Specialist (Ear, Nose & Throat)"
    )


def test_child_with_mild_fever_is_routed_to_pediatrician(
    client: TestClient,
) -> None:
    data = recommend(client, "Mild fever and weakness", age=8).json()["data"]
    assert data["recommended_doctor_category"] == (
        "Pediatrician (Child Specialist)"
    )


def test_child_with_tooth_pain_keeps_clear_specialist(
    client: TestClient,
) -> None:
    data = recommend(client, "The child has tooth pain", age=10).json()["data"]
    assert data["recommended_doctor_category"] == "Dentist"
    assert "Pediatrician (Child Specialist)" in data["alternative_categories"]


def test_gemini_result_is_validated_and_used_for_unclear_input() -> None:
    settings = Settings(
        _env_file=None,
        doctor_gemini_fallback_enabled=True,
    )

    def classifier(
        issue: str, symptoms: list[str], age: int | None
    ) -> GeminiDoctorRecommendation:
        return GeminiDoctorRecommendation(
            recommended_doctor_category="Neurologist",
            alternative_categories=["General Physician"],
            matched_symptoms=["balance concern"],
            reason="The concern is most relevant to neurological assessment.",
            urgency=Urgency.PRIORITY,
            confidence=0.81,
        )

    service = DoctorRecommendationService(settings, classifier)
    result = asyncio.run(
        service.recommend(
            DoctorRecommendationRequest(issue="A complex balance concern")
        )
    )
    assert result.recommended_doctor_category.value == "Neurologist"
    assert result.recommendation_source.value == "gemini"


def test_gemini_failure_falls_back_safely() -> None:
    settings = Settings(
        _env_file=None,
        doctor_gemini_fallback_enabled=True,
    )

    def failing_classifier(
        issue: str, symptoms: list[str], age: int | None
    ) -> GeminiDoctorRecommendation:
        raise TimeoutError

    service = DoctorRecommendationService(settings, failing_classifier)
    result = asyncio.run(
        service.recommend(DoctorRecommendationRequest(issue="Unclear concern"))
    )
    assert result.recommended_doctor_category.value == "General Physician"
    assert result.recommendation_source.value == "general_fallback"
