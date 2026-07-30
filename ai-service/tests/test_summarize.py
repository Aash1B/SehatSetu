"""Tests for the Day 8 NER-backed prescription draft pipeline."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.services.ner_service import MedicalNERService
from app.services.summarize_service import (
    SummarizeService,
    get_summarize_service,
)

URL = "/api/v1/summarize"
FULL_TRANSCRIPT = (
    "Patient Rajesh Kumar is a 54-year-old male with hypertension and type 2 "
    "diabetes. He has severe chest pain, breathlessness and dizziness. His "
    "blood pressure is 176/110 mmHg, oxygen saturation is 94 percent and blood "
    "sugar is 248 mg/dL. He currently takes Metformin 500 mg twice daily and "
    "Telmisartan 40 mg once daily. ECG, CBC and Troponin I were advised."
)


def real_service(**settings_overrides) -> SummarizeService:
    return SummarizeService(
        MedicalNERService(classifier=lambda _: []),
        Settings(_env_file=None, **settings_overrides),
    )


@pytest.fixture
def client():
    app.dependency_overrides[get_summarize_service] = lambda: real_service()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_full_medical_transcript_generates_real_draft(
    client: TestClient,
) -> None:
    response = client.post(URL, json={"transcript": FULL_TRANSCRIPT})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["is_dummy"] is False
    assert data["identified_symptoms"]
    assert {item["name"] for item in data["medications"]} == {
        "metformin",
        "telmisartan",
    }
    assert set(data["recommended_lab_tests"]) == {
        "ecg",
        "cbc",
        "troponin i",
    }
    assert data["requires_doctor_review"] is True
    assert data["requires_doctor_confirmation"] is True
    assert data["disclaimer"]


@pytest.mark.parametrize("transcript", ["", "   "])
def test_empty_transcript_is_rejected(
    client: TestClient,
    transcript: str,
) -> None:
    response = client.post(URL, json={"transcript": transcript})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_no_entities_returns_honest_limited_draft(
    client: TestClient,
) -> None:
    response = client.post(
        URL,
        json={
            "transcript": (
                "The patient joined the online consultation and greeted the "
                "doctor."
            )
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["medications"] == []
    assert data["diagnosis"] == (
        "Insufficient structured information for a draft diagnosis"
    )
    assert data["warnings"][0]["code"] == "NO_MEDICAL_ENTITIES_DETECTED"


def test_entities_are_deduplicated_case_insensitively(
    client: TestClient,
) -> None:
    response = client.post(
        URL,
        json={
            "transcript": (
                "The patient has fever, Fever and FEVER. CBC and cbc were "
                "advised."
            )
        },
    )
    data = response.json()["data"]
    assert data["identified_symptoms"] == ["fever"]
    assert data["recommended_lab_tests"] == ["cbc"]


def test_urgent_patterns_add_review_warning(client: TestClient) -> None:
    response = client.post(
        URL,
        json={
            "transcript": (
                "The patient has severe chest pain, difficulty breathing and "
                "oxygen saturation of 86 percent."
            )
        },
    )
    data = response.json()["data"]
    assert data["warnings"][0]["code"] == "URGENT_REVIEW_RECOMMENDED"
    assert data["diagnosis"] == "Draft diagnosis pending doctor review"


def test_ner_failure_is_standardized() -> None:
    class FailingNER:
        def extract(self, transcript: str):
            raise RuntimeError("private model failure")

    app.dependency_overrides[get_summarize_service] = lambda: SummarizeService(
        FailingNER(),
        Settings(_env_file=None),
    )
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            response = test_client.post(
                URL,
                json={"transcript": "Patient reports fever and headache."},
            )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "NER_EXTRACTION_FAILED"
    assert "traceback" not in response.text.casefold()


def test_explicit_dummy_mode() -> None:
    app.dependency_overrides[get_summarize_service] = lambda: real_service(
        prescription_dummy_mode=True
    )
    try:
        with TestClient(app) as test_client:
            response = test_client.post(
                URL,
                json={"transcript": "Patient reports fever and headache."},
            )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["message"] == "Dummy prescription draft generated"
    assert response.json()["data"]["is_dummy"] is True
