"""Tests for Gemini native structured output and safe fallback parsing."""

from types import SimpleNamespace

import pytest

from app.core.config import Settings
from app.core.exceptions import AppException
from app.schemas.diet import DietStructuredOutput
from app.schemas.prescription import PrescriptionStructuredOutput
from app.services.gemini_service import GeminiService


class CapturingModels:
    """Capture generation arguments and return a configured SDK-like response."""

    def __init__(self, response: object) -> None:
        self.response = response
        self.kwargs: dict[str, object] = {}

    def generate_content(self, **kwargs: object) -> object:
        self.kwargs = kwargs
        return self.response


def make_provider(response: object) -> tuple[GeminiService, CapturingModels]:
    """Create an injected provider without real network access."""
    models = CapturingModels(response)
    client = SimpleNamespace(models=models)
    settings = Settings(gemini_api_key="test-key", _env_file=None)
    return GeminiService(settings, client), models


def test_native_parsed_prescription_and_response_schema_are_used() -> None:
    parsed = PrescriptionStructuredOutput(
        medications=[],
        warnings=["Insufficient information for medication suggestions."],
    )
    provider, models = make_provider(SimpleNamespace(parsed=parsed, text=None))

    result = provider.generate_gemini_response(
        prompt="safe test prompt",
        system_instruction="test",
        response_model=PrescriptionStructuredOutput,
    )

    assert result is parsed
    config = models.kwargs["config"]
    assert config.response_mime_type == "application/json"
    assert isinstance(config.response_schema, dict)
    assert "additionalProperties" not in str(config.response_schema)
    assert config.temperature == 0.1
    assert config.thinking_config is not None


def test_native_parsed_mapping_is_validated_for_diet() -> None:
    provider, _ = make_provider(
        SimpleNamespace(
            parsed={
                "recommended_foods": ["Oats"],
                "foods_to_limit": [],
                "foods_to_avoid": [],
                "meal_guidance": [],
                "notes": [],
                "requires_doctor_review": True,
                "disclaimer": "AI-generated diet recommendation.",
            }
        )
    )

    result = provider.generate_gemini_response(
        prompt="safe test prompt",
        system_instruction="test",
        response_model=DietStructuredOutput,
    )

    assert result.hydration == ""


def test_markdown_wrapped_json_is_supported_as_text_fallback() -> None:
    provider, _ = make_provider(
        SimpleNamespace(
            parsed=None,
            text=(
                "```json\n"
                '{"medications":[],"warnings":[],"requires_doctor_review":true,'
                '"disclaimer":"AI-generated draft. Doctor approval required."}'
                "\n```"
            ),
        )
    )

    result = provider.generate_gemini_response(
        prompt="safe test prompt",
        system_instruction="test",
        response_model=PrescriptionStructuredOutput,
    )
    assert result.requires_doctor_review is True


def test_unknown_top_level_field_is_rejected() -> None:
    provider, _ = make_provider(
        SimpleNamespace(
            parsed={
                "medications": [],
                "warnings": [],
                "requires_doctor_review": True,
                "disclaimer": "Doctor approval required.",
                "unexpected": "not allowed",
            }
        )
    )

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=PrescriptionStructuredOutput,
        )

    assert exc_info.value.code == "GEMINI_SCHEMA_VALIDATION_ERROR"


def test_invalid_text_fallback_has_stable_error() -> None:
    provider, _ = make_provider(
        SimpleNamespace(parsed=None, text="not valid json")
    )

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=DietStructuredOutput,
        )

    assert exc_info.value.code == "GEMINI_JSON_DECODE_ERROR"


def test_leading_prose_before_json_is_supported() -> None:
    provider, _ = make_provider(
        SimpleNamespace(
            parsed=None,
            text=(
                "Here is the result:\n"
                '{"recommended_foods":[],"foods_to_limit":[],'
                '"foods_to_avoid":[],"hydration":"","meal_guidance":[],'
                '"notes":[],"requires_doctor_review":true,'
                '"disclaimer":"Doctor review required."}'
            ),
        )
    )

    result = provider.generate_gemini_response(
        prompt="safe test prompt",
        system_instruction="test",
        response_model=DietStructuredOutput,
    )
    assert result.requires_doctor_review is True


def test_empty_response_has_distinct_error() -> None:
    provider, _ = make_provider(SimpleNamespace(parsed=None, text=None))

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=PrescriptionStructuredOutput,
        )
    assert exc_info.value.code == "GEMINI_EMPTY_RESPONSE"


def test_blocked_response_has_distinct_error() -> None:
    feedback = SimpleNamespace(block_reason="SAFETY")
    provider, _ = make_provider(
        SimpleNamespace(
            parsed=None,
            text=None,
            candidates=[],
            prompt_feedback=feedback,
        )
    )

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=PrescriptionStructuredOutput,
        )
    assert exc_info.value.code == "GEMINI_BLOCKED_RESPONSE"


def test_truncated_response_has_distinct_error() -> None:
    candidate = SimpleNamespace(finish_reason="MAX_TOKENS")
    provider, _ = make_provider(
        SimpleNamespace(
            parsed=None,
            text='{"recommended_foods":["Kh',
            candidates=[candidate],
        )
    )

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=DietStructuredOutput,
        )
    assert exc_info.value.code == "GEMINI_RESPONSE_TRUNCATED"


def test_missing_api_key_has_configuration_error() -> None:
    settings = Settings(gemini_api_key=None, _env_file=None)
    provider = GeminiService(settings)

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=DietStructuredOutput,
        )
    assert exc_info.value.code == "GEMINI_API_KEY_MISSING"


def test_missing_model_name_has_configuration_error() -> None:
    settings = Settings(
        gemini_api_key="test-key",
        gemini_model=" ",
        _env_file=None,
    )
    provider = GeminiService(settings, SimpleNamespace(models=CapturingModels(None)))

    with pytest.raises(AppException) as exc_info:
        provider.generate_gemini_response(
            prompt="safe test prompt",
            system_instruction="test",
            response_model=DietStructuredOutput,
        )
    assert exc_info.value.code == "GEMINI_CONFIGURATION_ERROR"
