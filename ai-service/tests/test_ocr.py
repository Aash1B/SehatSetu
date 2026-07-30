"""Tests for Gemini Vision medical OCR with all provider calls mocked."""

from io import BytesIO
from pathlib import Path

import fitz
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings
from app.core.exceptions import AppException
from app.main import app
from app.schemas.ocr import LabFinding, OCRMedicalAnalysis
from app.services.ocr_service import OCRService, get_ocr_service


class FakeGemini:
    """Return deterministic OCR pages and structured analysis."""

    def __init__(self, pages: list[str] | None = None) -> None:
        self.pages = iter(pages or ["Laboratory Report\nHemoglobin 18 g/dL"])
        self.image_mime_types: list[str] = []

    def generate_vision_ocr(
        self, image_bytes: bytes, mime_type: str, prompt: str
    ) -> str:
        assert image_bytes
        assert "Do not summarize" in prompt
        self.image_mime_types.append(mime_type)
        return next(self.pages)

    def generate_gemini_response(self, **kwargs) -> OCRMedicalAnalysis:
        assert "ocr_text" in kwargs["prompt"]
        return OCRMedicalAnalysis(
            document_type="Lab report",
            summary="Hemoglobin is above the printed reference range.",
            key_findings=["Hemoglobin"],
            abnormal_findings=[
                LabFinding(
                    parameter="Hemoglobin",
                    value="18",
                    unit="g/dL",
                    reference_range="12-16",
                    status="high",
                )
            ],
            recommendations=["Review with the treating clinician."],
        )


@pytest.fixture
def client():
    fake = FakeGemini()
    service = OCRService(Settings(_env_file=None), fake)
    app.dependency_overrides[get_ocr_service] = lambda: service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_png() -> bytes:
    stream = BytesIO()
    Image.new("RGB", (100, 50), "white").save(stream, format="PNG")
    return stream.getvalue()


def make_pdf(page_count: int = 1) -> bytes:
    document = fitz.open()
    for page_number in range(page_count):
        page = document.new_page()
        page.insert_text((72, 72), f"Medical page {page_number + 1}")
    value = document.tobytes()
    document.close()
    return value


def test_image_ocr_success(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ocr/analyze",
        files={"file": ("report.png", make_png(), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "OCR completed successfully."
    assert body["data"]["engine"] == "gemini-vision"
    assert "Hemoglobin" in body["data"]["extracted_text"]
    assert body["data"]["abnormal_findings"][0]["status"] == "high"
    assert body["data"]["recommendations"]


@pytest.mark.parametrize(
    ("output_language", "expected"),
    [
        (None, "en"),
        ("", "en"),
        ("auto", "en"),
        ("en", "en"),
        ("en-US", "en"),
        ("English", "en"),
        ("hi", "hi"),
        ("Hindi", "hi"),
        ("hi-Latn", "hi-Latn"),
        ("Hinglish", "hi-Latn"),
        ("  EN-gb  ", "en"),
    ],
)
def test_ocr_output_language_aliases(
    client: TestClient,
    output_language: str | None,
    expected: str,
) -> None:
    form = {} if output_language is None else {
        "output_language": output_language
    }
    response = client.post(
        "/api/v1/ocr/analyze",
        files={"file": ("report.png", make_png(), "image/png")},
        data=form,
    )
    assert response.status_code == 200
    assert response.json()["data"]["output_language"] == expected


def test_ocr_rejects_unsupported_output_language(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/ocr/analyze",
        files={"file": ("report.png", make_png(), "image/png")},
        data={"output_language": "Klingon"},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "UNSUPPORTED_LANGUAGE"
    assert error["details"]["received"] == "Klingon"


@pytest.mark.parametrize("page_count", [1, 3])
def test_pdf_and_multipage_pdf_ocr(page_count: int) -> None:
    fake = FakeGemini(
        [f"Extracted page {number}" for number in range(1, page_count + 1)]
    )
    service = OCRService(Settings(_env_file=None), fake)
    app.dependency_overrides[get_ocr_service] = lambda: service
    try:
        with TestClient(app) as test_client:
            response = test_client.post(
                "/api/v1/ocr/analyze",
                files={
                    "file": (
                        "report.pdf",
                        make_pdf(page_count),
                        "application/pdf",
                    )
                },
            )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["pages"]) == page_count
    assert [page["page_number"] for page in data["pages"]] == list(
        range(1, page_count + 1)
    )
    assert fake.image_mime_types == ["image/png"] * page_count


def test_unsupported_type(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ocr/analyze",
        files={"file": ("report.txt", b"medical text", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "OCR_UNSUPPORTED_FILE_TYPE"


def test_empty_pdf_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ocr/analyze",
        files={"file": ("report.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "OCR_CORRUPTED_FILE"


def test_invalid_image_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ocr/analyze",
        files={
            "file": (
                "report.png",
                b"\x89PNG\r\n\x1a\ninvalid",
                "image/png",
            )
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "OCR_CORRUPTED_FILE"


@pytest.mark.parametrize(
    ("provider_code", "expected_status"),
    [("GEMINI_TIMEOUT", 504), ("GEMINI_API_ERROR", 502)],
)
def test_gemini_failure_is_mapped(
    tmp_path: Path,
    provider_code: str,
    expected_status: int,
) -> None:
    class FailingGemini(FakeGemini):
        def generate_vision_ocr(self, *args, **kwargs) -> str:
            raise AppException(
                "Provider failed",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code=provider_code,
            )

    path = tmp_path / "report.png"
    path.write_bytes(make_png())
    service = OCRService(Settings(_env_file=None), FailingGemini())
    with pytest.raises(AppException) as exc_info:
        service.analyze(path, "image/png", "auto", None, True)
    assert exc_info.value.code == "GEMINI_OCR_FAILED"
    assert exc_info.value.status_code == expected_status
