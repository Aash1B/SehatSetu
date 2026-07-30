"""Tests for Gemini-backed, doctor-reviewed prescription drafts."""

import asyncio

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.exceptions import AppException
from app.main import app
from app.schemas.prescription import (
    PrescriptionData,
    PrescriptionMedication,
    PrescriptionStructuredOutput,
)
from app.schemas.prescription import PrescriptionRequest
from app.services.prescription_service import (
    PrescriptionService,
    get_prescription_service,
)

API_URL = "/api/v1/generate-prescription"


class SuccessfulPrescriptionService:
    """Return deterministic validated data without an external API call."""

    async def generate(self, request: object) -> PrescriptionData:
        return PrescriptionData(
            medications=[
                PrescriptionMedication(
                    medicine="Paracetamol",
                    dosage="500 mg",
                    frequency="Twice daily",
                    route="Oral",
                    duration="3 days",
                    instructions="Suggested for doctor consideration after meals.",
                )
            ],
            warnings=["Review allergy history before prescribing."],
        )


@pytest.fixture
def client():
    """Provide a test client with Gemini generation mocked."""
    app.dependency_overrides[get_prescription_service] = (
        SuccessfulPrescriptionService
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_prescription_endpoint_returns_validated_draft(
    client: TestClient,
) -> None:
    response = client.post(
        API_URL,
        json={
            "summary": "Patient reports fever and body ache for two days.",
            "medical_entities": {"symptoms": ["fever", "body ache"]},
        },
    )
    data = response.json()["data"]

    assert response.status_code == 200
    assert data["medications"][0]["medicine"] == "Paracetamol"
    assert data["requires_doctor_review"] is True
    assert "Doctor approval required" in data["disclaimer"]


@pytest.mark.parametrize("summary", ["", "   ", "short"])
def test_prescription_rejects_empty_or_short_summary(
    client: TestClient, summary: str
) -> None:
    response = client.post(API_URL, json={"summary": summary})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_prescription_timeout_uses_standard_error(client: TestClient) -> None:
    class TimeoutService:
        async def generate(self, request: object) -> PrescriptionData:
            raise AppException(
                "AI generation timed out",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                code="GEMINI_TIMEOUT",
            )

    app.dependency_overrides[get_prescription_service] = TimeoutService
    response = client.post(
        API_URL,
        json={"summary": "Patient has a sufficiently detailed clinical summary."},
    )
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "GEMINI_TIMEOUT"


def test_medication_schema_rejects_empty_objects() -> None:
    with pytest.raises(ValueError):
        PrescriptionMedication.model_validate(
            {
                "medicine": "",
                "dosage": "",
                "frequency": "",
                "route": "",
                "duration": "",
                "instructions": "",
            }
        )


def test_service_removes_duplicate_medications() -> None:
    medication = PrescriptionMedication(
        medicine="Paracetamol",
        dosage="500 mg",
        frequency="Twice daily",
        route="Oral",
        duration="3 days",
        instructions="For doctor consideration.",
    )

    class FakeGemini:
        def generate_gemini_response(self, **kwargs: object) -> PrescriptionData:
            return PrescriptionData(medications=[medication, medication])

    result = asyncio.run(
        PrescriptionService(FakeGemini()).generate(
            PrescriptionRequest(
                summary=(
                    "Patient takes Paracetamol 500 mg Twice daily by Oral "
                    "route for 3 days. For doctor consideration."
                )
            )
        )
    )
    assert len(result.medications) == 1


def test_service_removes_controlled_medication_suggestions() -> None:
    controlled = PrescriptionMedication(
        medicine="Tramadol",
        dosage="50 mg",
        frequency="Once daily",
        route="Oral",
        duration="2 days",
        instructions="For doctor consideration.",
    )

    class FakeGemini:
        def generate_gemini_response(self, **kwargs: object) -> PrescriptionData:
            return PrescriptionData(medications=[controlled])

    result = asyncio.run(
        PrescriptionService(FakeGemini()).generate(
            PrescriptionRequest(
                summary=(
                    "Patient reports taking Tramadol 50 mg Once daily by Oral "
                    "route for 2 days. For doctor consideration."
                )
            )
        )
    )
    assert result.medications == []
    assert any("controlled-medication" in warning for warning in result.warnings)


def test_service_removes_ungrounded_and_allergy_matching_medications() -> None:
    invented = PrescriptionMedication(medicine="InventedDrug")
    allergic = PrescriptionMedication(medicine="Penicillin")

    class FakeGemini:
        def generate_gemini_response(self, **kwargs: object) -> PrescriptionData:
            return PrescriptionData(medications=[invented, allergic])

    result = asyncio.run(
        PrescriptionService(FakeGemini()).generate(
            PrescriptionRequest(
                summary=(
                    "Patient is allergic to Penicillin and reports fever."
                ),
                medical_entities={"allergies": ["Penicillin"]},
            )
        )
    )
    assert result.medications == []
    assert any("allergy" in warning.casefold() for warning in result.warnings)


@pytest.mark.parametrize(
    "output_language",
    [None, "", "auto", "English", "EN", "hi-Latn"],
)
def test_prescription_api_accepts_normalized_output_languages(
    client: TestClient,
    output_language: str | None,
) -> None:
    class FakeGemini:
        def generate_gemini_response(
            self, **kwargs: object
        ) -> PrescriptionStructuredOutput:
            return PrescriptionStructuredOutput()

    app.dependency_overrides[get_prescription_service] = lambda: (
        PrescriptionService(FakeGemini())
    )
    payload: dict[str, object] = {
        "summary": "Patient has fever for two days.",
        "language": "auto",
    }
    if output_language is not None:
        payload["output_language"] = output_language
    response = client.post(API_URL, json=payload)
    assert response.status_code == 200


def test_prescription_api_rejects_invalid_language(client: TestClient) -> None:
    class FakeGemini:
        def generate_gemini_response(
            self, **kwargs: object
        ) -> PrescriptionStructuredOutput:
            return PrescriptionStructuredOutput()

    app.dependency_overrides[get_prescription_service] = lambda: (
        PrescriptionService(FakeGemini())
    )
    response = client.post(
        API_URL,
        json={
            "summary": "Patient has fever for two days.",
            "output_language": "xyz",
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_LANGUAGE"
