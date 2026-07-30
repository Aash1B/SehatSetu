"""Tests for hybrid medical entity extraction."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.medical_info import MedicalInfoData
from app.services.ner_service import MedicalNERService, get_ner_service

API_URL = "/api/v1/extract-medical-info"


@pytest.fixture
def client():
    """Use a deterministic service that never loads a remote model."""
    app.dependency_overrides[get_ner_service] = lambda: MedicalNERService(
        classifier=lambda _: []
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def extract(client: TestClient, transcript: str):
    """Submit a transcript for extraction."""
    return client.post(API_URL, json={"transcript": transcript})


def test_normal_transcript_returns_structured_entities(
    client: TestClient,
) -> None:
    response = extract(
        client,
        (
            "The patient has fever for three days, cough, blood pressure "
            "140/90, is allergic to penicillin and was prescribed "
            "paracetamol 500 mg twice daily."
        ),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["symptoms"] == ["fever", "cough"]
    assert data["duration"] == ["three days"]
    assert data["vital_signs"]["blood_pressure"] == "140/90"


@pytest.mark.parametrize("transcript", ["", "   ", "too short"])
def test_empty_or_short_transcript_is_rejected(
    client: TestClient, transcript: str
) -> None:
    response = extract(client, transcript)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_multiple_symptoms_are_extracted(client: TestClient) -> None:
    data = extract(
        client, "Patient reports fever, cough, headache and nausea today."
    ).json()["data"]
    assert data["symptoms"] == ["fever", "cough", "headache", "nausea"]


def test_medication_dosage_and_frequency_are_extracted(
    client: TestClient,
) -> None:
    data = extract(
        client, "Patient was prescribed paracetamol 500 mg twice daily."
    ).json()["data"]
    assert data["medications"] == [
        {
            "name": "paracetamol",
            "dosage": "500 mg",
            "frequency": "twice daily",
        }
    ]


def test_allergy_is_not_reported_as_medication(client: TestClient) -> None:
    data = extract(
        client, "The patient is allergic to penicillin, with severe fever."
    ).json()["data"]
    assert data["allergies"] == ["penicillin"]
    assert data["medications"] == []


def test_blood_pressure_is_extracted(client: TestClient) -> None:
    data = extract(
        client, "Blood pressure is 140/90 and the patient has fever."
    ).json()["data"]
    assert data["vital_signs"]["blood_pressure"] == "140/90"


def test_temperature_is_extracted(client: TestClient) -> None:
    data = extract(
        client, "Temperature is 102°F and the patient has a headache."
    ).json()["data"]
    assert data["vital_signs"]["temperature"] == "102°F"


def test_numeric_duration_is_extracted(client: TestClient) -> None:
    data = extract(
        client, "The patient has experienced cough for 2 weeks."
    ).json()["data"]
    assert data["duration"] == ["2 weeks"]


def test_very_large_transcript_is_rejected(client: TestClient) -> None:
    response = extract(client, "x" * 10_001)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_invalid_json_uses_standard_error(client: TestClient) -> None:
    response = client.post(
        API_URL,
        content='{"transcript":',
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_internal_service_error_is_safe(client: TestClient) -> None:
    class FailingService:
        def extract(self, _: str) -> MedicalInfoData:
            raise RuntimeError("private model details")

    app.dependency_overrides[get_ner_service] = FailingService
    response = extract(client, "Patient reports fever for three days.")
    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "NER_PROCESSING_FAILED"
    assert "private model details" not in response.text
