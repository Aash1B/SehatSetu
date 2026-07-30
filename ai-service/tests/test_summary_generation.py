"""Tests for Gemini-backed consultation summary generation."""

from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from google.genai import errors

from app.core.config import Settings
from app.main import app
from app.services.gemini_service import GeminiService
from app.services.summary_service import SummaryService, get_summary_service

API_URL = "/api/v1/generate-summary"
TRANSCRIPT = (
    "Patient has fever and headache for three days. "
    "Blood pressure is 140/90."
)
ENTITIES = {
    "symptoms": ["fever", "headache"],
    "duration": ["three days"],
    "vital_signs": {"blood_pressure": "140/90"},
}


class FakeModels:
    """Record request arguments and return or raise a configured result."""

    def __init__(self, result: object) -> None:
        self.result = result
        self.calls: list[dict[str, object]] = []

    def generate_content(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


class FakeGeminiClient:
    """Small stand-in for the Google GenAI client."""

    def __init__(self, result: object) -> None:
        self.models = FakeModels(result)


def make_service(
    result: object,
) -> tuple[SummaryService, FakeGeminiClient]:
    """Create a summary service with isolated settings and a fake client."""
    client = FakeGeminiClient(result)
    settings = Settings(gemini_api_key="test-key", _env_file=None)
    gemini_service = GeminiService(settings, client)
    return SummaryService(gemini_service), client


@pytest.fixture
def client():
    """Provide a test client and clear dependency overrides afterward."""
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def request_summary(client: TestClient, **overrides: object):
    """Submit the standard summary request with optional changes."""
    payload: dict[str, object] = {
        "transcript": TRANSCRIPT,
        "medical_entities": ENTITIES,
    }
    payload.update(overrides)
    return client.post(API_URL, json=payload)


def test_successful_summary_uses_configured_gemini_request(
    client: TestClient,
) -> None:
    expected = (
        "The patient presented with fever and headache for three days. "
        "Blood pressure measured 140/90."
    )
    service, fake_client = make_service(SimpleNamespace(text=expected))
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["request_id"]
    assert body["meta"]["processing_time_ms"] >= 0
    body.pop("meta")
    assert body == {
        "success": True,
        "message": "Summary generated successfully",
        "data": {"summary": expected},
    }
    call = fake_client.models.calls[0]
    assert call["model"] == "gemini-flash-latest"
    assert "140/90" in str(call["contents"])
    config = call["config"]
    assert config.temperature == 0.2
    assert config.max_output_tokens == 300
    assert config.thinking_config.thinking_level == "MINIMAL"
    assert config.thinking_config.include_thoughts is False
    assert "150 words" in config.system_instruction


def test_gemini_2_5_disables_thinking() -> None:
    settings = Settings(
        gemini_api_key="test-key",
        gemini_model="gemini-2.5-flash",
        _env_file=None,
    )
    provider = GeminiService(settings, FakeGeminiClient(SimpleNamespace()))

    thinking_config = provider._thinking_config()

    assert thinking_config.thinking_budget == 0
    assert thinking_config.include_thoughts is False


def test_full_multi_sentence_summary_is_returned_without_slicing(
    client: TestClient,
) -> None:
    expected = (
        "The patient reported fever and headache for three days. "
        "Blood pressure was 140/90, and the patient is allergic to penicillin. "
        "The doctor advised rest, hydration, and further monitoring."
    )
    response_object = SimpleNamespace(
        text=expected,
        candidates=[SimpleNamespace(finish_reason="STOP")],
    )
    service, _ = make_service(response_object)
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 200
    assert response.json()["data"]["summary"] == expected
    assert len(response.json()["data"]["summary"]) > 100


@pytest.mark.parametrize("transcript", ["", "   ", "too short"])
def test_empty_or_short_transcript_returns_validation_error(
    client: TestClient, transcript: str
) -> None:
    response = request_summary(client, transcript=transcript)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_missing_transcript_returns_validation_error(
    client: TestClient,
) -> None:
    response = client.post(API_URL, json={"medical_entities": ENTITIES})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_gemini_timeout_returns_safe_gateway_timeout(
    client: TestClient,
) -> None:
    request = httpx.Request("POST", "https://generativelanguage.googleapis.com")
    service, _ = make_service(httpx.ReadTimeout("timed out", request=request))
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "GEMINI_TIMEOUT"


def test_gemini_network_error_returns_safe_bad_gateway(
    client: TestClient,
) -> None:
    request = httpx.Request("POST", "https://generativelanguage.googleapis.com")
    service, _ = make_service(
        httpx.ConnectError("connection failed", request=request)
    )
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GEMINI_NETWORK_ERROR"


def test_gemini_api_failure_returns_safe_bad_gateway(
    client: TestClient,
) -> None:
    error = errors.ServerError(
        500,
        {"error": {"message": "private provider detail", "status": "INTERNAL"}},
    )
    service, _ = make_service(error)
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GEMINI_API_ERROR"
    assert "private provider detail" not in response.text


def test_gemini_rate_limit_returns_retryable_error(
    client: TestClient,
) -> None:
    error = errors.ClientError(
        429,
        {
            "error": {
                "message": "quota exhausted",
                "status": "RESOURCE_EXHAUSTED",
            }
        },
    )
    service, _ = make_service(error)
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "GEMINI_RATE_LIMITED"


@pytest.mark.parametrize("output_text", ["short"])
def test_malformed_gemini_response_is_rejected(
    client: TestClient, output_text: str | None
) -> None:
    service, _ = make_service(SimpleNamespace(text=output_text))
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "INVALID_SUMMARY_RESPONSE"


@pytest.mark.parametrize("output_text", [None, "", "   "])
def test_empty_gemini_response_has_meaningful_error(
    client: TestClient, output_text: str | None
) -> None:
    service, _ = make_service(SimpleNamespace(text=output_text))
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GEMINI_EMPTY_RESPONSE"


def test_max_tokens_finish_reason_is_not_returned_as_complete(
    client: TestClient,
) -> None:
    response_object = SimpleNamespace(
        text="The patient presented with fever and",
        candidates=[SimpleNamespace(finish_reason="MAX_TOKENS")],
    )
    service, _ = make_service(response_object)
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GEMINI_RESPONSE_TRUNCATED"


def test_invalid_medical_entities_returns_validation_error(
    client: TestClient,
) -> None:
    response = request_summary(client, medical_entities="not-an-object")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_missing_gemini_api_key_returns_service_unavailable(
    client: TestClient,
) -> None:
    settings = Settings(gemini_api_key=None, _env_file=None)
    service = SummaryService(GeminiService(settings))
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "GEMINI_API_KEY_MISSING"


def test_invalid_gemini_api_key_returns_service_unavailable(
    client: TestClient,
) -> None:
    error = errors.ClientError(
        400,
        {"error": {"message": "invalid API key", "status": "API_KEY_INVALID"}},
    )
    service, _ = make_service(error)
    app.dependency_overrides[get_summary_service] = lambda: service

    response = request_summary(client)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "GEMINI_API_KEY_INVALID"
