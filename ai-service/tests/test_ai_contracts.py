"""Tests for deterministic Day 2 API contracts retained after Day 3."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
API_PREFIX = "/api/v1"


def assert_validation_error(response_status: int, body: dict) -> None:
    """Assert the shared Day 1 validation error contract."""
    assert response_status == 422
    assert body["success"] is False
    assert body["message"] == "Request validation failed"
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(body["error"]["details"], list)


def test_medical_information_contract() -> None:
    response = client.post(
        f"{API_PREFIX}/extract-medical-info",
        json={
            "text": (
                "The patient has fever for three days and is allergic "
                "to penicillin."
            )
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["symptoms"] == ["fever"]
    assert body["data"]["is_dummy"] is True
    assert isinstance(body["data"]["vital_signs"], list)


@pytest.mark.parametrize("text", ["", "   ", "too short", "x" * 10_001])
def test_medical_information_rejects_invalid_text(text: str) -> None:
    response = client.post(
        f"{API_PREFIX}/extract-medical-info", json={"text": text}
    )
    assert_validation_error(response.status_code, response.json())


def test_consultation_summary_contract() -> None:
    response = client.post(
        f"{API_PREFIX}/generate-summary",
        json={
            "transcript": (
                "The patient reports fever and headache for three days. "
                "The doctor advised rest and hydration."
            )
        },
    )

    assert response.status_code == 200
    assert (
        response.json()["data"]["chief_complaint"]
        == "Fever and headache for three days"
    )


@pytest.mark.parametrize("transcript", ["", "   "])
def test_summary_rejects_empty_transcript(transcript: str) -> None:
    response = client.post(
        f"{API_PREFIX}/generate-summary", json={"transcript": transcript}
    )
    assert_validation_error(response.status_code, response.json())


def test_prescription_contract_is_safe_draft() -> None:
    response = client.post(
        f"{API_PREFIX}/generate-prescription",
        json={
            "transcript": (
                "The patient reports fever. "
                "The doctor discussed supportive treatment."
            )
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["requires_doctor_confirmation"] is True
    assert data["is_dummy"] is False
    assert data["medications"] == []
    serialized_data = str(data).lower()
    assert "mg" not in serialized_data
    assert "paracetamol" not in serialized_data
    assert "acetaminophen" not in serialized_data


def test_prescription_rejects_empty_transcript() -> None:
    response = client.post(
        f"{API_PREFIX}/generate-prescription", json={"transcript": ""}
    )
    assert_validation_error(response.status_code, response.json())


def test_diet_recommendation_contract() -> None:
    response = client.post(
        f"{API_PREFIX}/diet-recommendation",
        json={
            "condition": "fever",
            "dietary_preferences": ["vegetarian"],
            "allergies": [],
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["condition"] == "fever"
    assert data["is_dummy"] is True
    assert "qualified healthcare professional" in data["disclaimer"]


@pytest.mark.parametrize("payload", [{}, {"condition": ""}, {"condition": "   "}])
def test_diet_recommendation_requires_condition(payload: dict) -> None:
    response = client.post(f"{API_PREFIX}/diet-recommendation", json=payload)
    assert_validation_error(response.status_code, response.json())
