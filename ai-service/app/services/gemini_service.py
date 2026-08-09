"""Google Gemini provider for grounded consultation summaries."""

from __future__ import annotations

import json
from functools import lru_cache
from time import perf_counter
from typing import Protocol, TypeVar

import httpx
from fastapi import status
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from app.core.config import Settings, get_settings
from app.core.doctor_category_rules import ALLOWED_DOCTOR_CATEGORIES
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.consultation_summary import SummaryMedicalEntities
from app.schemas.doctor_recommendation import GeminiDoctorRecommendation

logger = get_logger(__name__)
ResponseT = TypeVar("ResponseT", bound=BaseModel)

SUMMARY_INSTRUCTIONS = """\
Create a concise clinical consultation summary for a doctor's dashboard.

Requirements:
- Use only facts present in the supplied transcript and medical entities.
- Never invent symptoms, diagnoses, medications, advice, or measurements.
- Do not confirm a diagnosis or imply that the summary replaces a doctor.
- Preserve uncertainty, negation, allergies, pregnancy, age, and medication
  context exactly when supplied.
- Preserve clinically important information without repetition.
- Use a professional tone and no more than 150 words.
- Return valid JSON with exactly these keys:
  chief_complaint, history_of_present_illness, allergies, vital_signs,
  doctor_advice, clinical_summary.
- Use null, empty arrays, or empty objects when information is missing.
- Do not wrap the JSON in Markdown.
"""

DOCTOR_ROUTING_INSTRUCTIONS = """\
You are a medical appointment routing assistant.
Recommend a doctor category using only the reported issue and symptoms.
You are not diagnosing the patient. Never suggest medicines or treatments.
Choose exactly one primary category and zero to two alternatives only from
the supplied allowed-category list. Never return doctor names or book care.
Return only valid JSON matching the required response schema.
"""


class GeminiModels(Protocol):
    """Minimal generate-content interface used by this service."""

    def generate_content(self, **kwargs: object) -> object:
        """Generate content using a configured Gemini model."""


class GeminiClient(Protocol):
    """Minimal injectable Google GenAI client interface."""

    models: GeminiModels


class GeminiService:
    """Build prompts, call Gemini, and normalize provider failures."""

    def __init__(
        self,
        settings: Settings,
        client: GeminiClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client

    def generate_consultation_summary(
        self,
        transcript: str,
        medical_entities: SummaryMedicalEntities | None,
    ) -> str:
        """Generate summary text grounded only in the supplied consultation."""
        started_at = perf_counter()
        client = self._get_client()
        prompt = self.build_prompt(transcript, medical_entities)
        logger.info("Gemini summary request started")

        try:
            response = client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SUMMARY_INSTRUCTIONS,
                    temperature=self._settings.gemini_temperature,
                    max_output_tokens=self._settings.gemini_max_output_tokens,
                    thinking_config=self._thinking_config(),
                    response_mime_type="application/json",
                ),
            )
        except httpx.TimeoutException as exc:
            logger.warning("Gemini summary request timed out")
            raise AppException(
                "Summary generation timed out",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                code="GEMINI_TIMEOUT",
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Gemini summary network request failed")
            raise AppException(
                "Unable to connect to the summary generation service",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_NETWORK_ERROR",
            ) from exc
        except errors.APIError as exc:
            self._raise_api_error(exc)

        output_text = getattr(response, "text", None)
        summary = output_text.strip() if isinstance(output_text, str) else ""
        finish_reason = self._get_finish_reason(response)
        response_text_empty = not bool(summary)
        logger.info(
            "Gemini summary diagnostics: length=%d finish_reason=%s "
            "response_text_empty=%s",
            len(summary),
            finish_reason,
            response_text_empty,
        )
        if response_text_empty:
            raise AppException(
                "Gemini returned an empty summary",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_EMPTY_RESPONSE",
            )
        if finish_reason == "MAX_TOKENS":
            raise AppException(
                "Gemini could not complete the summary within the token limit",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_RESPONSE_TRUNCATED",
            )
        logger.info(
            "Gemini summary response received in %.2f ms",
            (perf_counter() - started_at) * 1000,
        )
        return summary

    def generate_vision_ocr(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
    ) -> str:
        """Extract plain text from one image using the shared Gemini client."""
        client = self._get_client()
        started_at = perf_counter()
        try:
            response = client.models.generate_content(
                model=self._settings.gemini_model,
                contents=[
                    prompt,
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type,
                    ),
                ],
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=(
                        self._settings.gemini_ocr_max_output_tokens
                    ),
                    thinking_config=self._thinking_config(),
                    response_mime_type="text/plain",
                ),
            )
        except httpx.TimeoutException as exc:
            raise AppException(
                "Gemini Vision OCR timed out",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                code="GEMINI_TIMEOUT",
            ) from exc
        except httpx.RequestError as exc:
            raise AppException(
                "Unable to connect to Gemini Vision OCR",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_NETWORK_ERROR",
            ) from exc
        except errors.APIError as exc:
            self._raise_api_error(exc)

        text = self._safely_extract_response_text(response)
        if not text:
            raise AppException(
                "Gemini Vision returned no readable text",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_EMPTY_RESPONSE",
            )
        logger.info(
            "Gemini Vision OCR response received latency_ms=%.2f "
            "character_count=%d",
            (perf_counter() - started_at) * 1000,
            len(text),
        )
        return text

    def classify_doctor_category(
        self,
        issue: str,
        symptoms: list[str],
        age: int | None,
    ) -> GeminiDoctorRecommendation:
        """Classify an unclear request into an allowed doctor category."""
        client = self._get_client()
        prompt = json.dumps(
            {
                "issue": issue,
                "symptoms": symptoms,
                "age": age,
                "allowed_categories": ALLOWED_DOCTOR_CATEGORIES,
            },
            ensure_ascii=False,
        )
        logger.info("Gemini doctor-category fallback started")
        response = client.models.generate_content(
            model=self._settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=DOCTOR_ROUTING_INSTRUCTIONS,
                temperature=0.1,
                max_output_tokens=300,
                response_mime_type="application/json",
            ),
        )
        output_text = getattr(response, "text", None)
        if not isinstance(output_text, str) or not output_text.strip():
            raise ValueError("Gemini returned an empty routing response")
        result = GeminiDoctorRecommendation.model_validate_json(output_text)
        logger.info("Gemini doctor-category fallback completed")
        return result

    def generate_gemini_response(
        self,
        *,
        prompt: str,
        system_instruction: str,
        response_model: type[ResponseT],
        temperature: float = 0.1,
        max_output_tokens: int = 600,
        sensitive_content: bool = True,
    ) -> ResponseT:
        """Generate and validate a reusable structured Gemini response."""
        client = self._get_client()
        logger.info(
            "Structured Gemini request started operation=%s model=%s",
            response_model.__name__,
            self._settings.gemini_model,
        )
        try:
            response = client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                    thinking_config=self._thinking_config(),
                    response_mime_type="application/json",
                    response_schema=self._gemini_compatible_schema(
                        response_model
                    ),
                ),
            )
        except httpx.TimeoutException as exc:
            raise AppException(
                "AI generation timed out",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                code="GEMINI_TIMEOUT",
            ) from exc
        except httpx.RequestError as exc:
            raise AppException(
                "Unable to connect to the AI generation service",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_NETWORK_ERROR",
            ) from exc
        except errors.APIError as exc:
            self._raise_api_error(exc)
        except ValueError as exc:
            logger.exception(
                "Gemini structured request configuration failed operation=%s",
                response_model.__name__,
            )
            raise AppException(
                "Gemini structured output configuration is incompatible",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="GEMINI_CONFIGURATION_ERROR",
                details={"stage": "request_configuration"},
            ) from exc

        self._log_structured_response_diagnostics(
            response,
            response_model,
            include_content_preview=not sensitive_content,
        )
        result = self.parse_structured_response(response, response_model)
        logger.info("Structured Gemini response validated")
        return result

    @staticmethod
    def parse_structured_response(
        response: object,
        response_model: type[ResponseT],
    ) -> ResponseT:
        """Use SDK-native parsed output, with a safe JSON text fallback."""
        finish_reason = GeminiService._get_finish_reason(response)
        if finish_reason == "MAX_TOKENS":
            raise AppException(
                "Gemini structured response was truncated",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_RESPONSE_TRUNCATED",
                details={"stage": "generation", "finish_reason": finish_reason},
            )
        if finish_reason in {"SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT"}:
            raise AppException(
                "Gemini blocked the structured response",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_BLOCKED_RESPONSE",
                details={"stage": "safety_block"},
            )
        blocked_reason = GeminiService._get_blocked_reason(response)
        candidates = getattr(response, "candidates", None)
        if blocked_reason and not candidates:
            raise AppException(
                "Gemini blocked the structured response",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_BLOCKED_RESPONSE",
                details={"stage": "safety_block"},
            )
        parsed = getattr(response, "parsed", None)
        try:
            if parsed is not None:
                if isinstance(parsed, response_model):
                    return parsed
                return response_model.model_validate(parsed)

            output_text = GeminiService._safely_extract_response_text(response)
            if not output_text:
                raise AppException(
                    "Gemini returned an empty response",
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    code="GEMINI_EMPTY_RESPONSE",
                )
            payload = json.loads(GeminiService._extract_json_object(output_text))
            return response_model.model_validate(payload)
        except AppException:
            raise
        except json.JSONDecodeError as exc:
            logger.warning("Gemini structured response JSON decode failed")
            raise AppException(
                "Gemini returned invalid JSON",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_JSON_DECODE_ERROR",
                details={"stage": "json_decode"},
            ) from exc
        except ValidationError as exc:
            fields = [
                ".".join(str(part) for part in error["loc"])
                for error in exc.errors()
            ]
            logger.warning(
                "Gemini structured response schema validation failed errors=%s",
                exc.errors(),
            )
            raise AppException(
                "Gemini returned an invalid structured response",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_SCHEMA_VALIDATION_ERROR",
                details={"stage": "schema_validation", "fields": fields},
            ) from exc
        except (TypeError, ValueError) as exc:
            logger.warning("Gemini structured response extraction failed")
            raise AppException(
                "Gemini returned an invalid structured response",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_INVALID_RESPONSE",
                details={"stage": "response_extraction"},
            ) from exc

    @staticmethod
    def _strip_markdown_json_fence(value: str) -> str:
        """Remove one optional Markdown code fence around fallback JSON."""
        candidate = value.strip()
        if not candidate.startswith("```"):
            return candidate
        lines = candidate.splitlines()
        if lines and lines[0].strip().lower() in {"```", "```json"}:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()

    @staticmethod
    def _extract_json_object(value: str) -> str:
        """Extract the first complete JSON object without unsafe evaluation."""
        candidate = GeminiService._strip_markdown_json_fence(value)
        decoder = json.JSONDecoder()
        for index, character in enumerate(candidate):
            if character != "{":
                continue
            try:
                payload, _ = decoder.raw_decode(candidate[index:])
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict):
                return json.dumps(payload, ensure_ascii=False)
        raise json.JSONDecodeError("No valid JSON object found", candidate, 0)

    @staticmethod
    def _gemini_compatible_schema(
        response_model: type[BaseModel],
    ) -> dict[str, object]:
        """Remove JSON Schema metadata unsupported by Gemini's v1beta API."""

        def clean(value: object) -> object:
            if isinstance(value, dict):
                return {
                    key: clean(item)
                    for key, item in value.items()
                    if key not in {"additionalProperties", "title", "examples"}
                }
            if isinstance(value, list):
                return [clean(item) for item in value]
            return value

        schema = clean(response_model.model_json_schema())
        if not isinstance(schema, dict):
            raise ValueError("Pydantic did not produce an object schema")
        return schema

    @staticmethod
    def _safely_extract_response_text(response: object) -> str:
        """Read candidate text parts before using the SDK convenience property."""
        candidates = getattr(response, "candidates", None) or []
        parts: list[str] = []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            for part in getattr(content, "parts", None) or []:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text:
                    parts.append(text)
        if parts:
            return "".join(parts).strip()
        try:
            output_text = getattr(response, "text", None)
        except Exception:
            return ""
        return output_text.strip() if isinstance(output_text, str) else ""

    @staticmethod
    def _get_blocked_reason(response: object) -> str | None:
        """Return a safe prompt block reason without response content."""
        feedback = getattr(response, "prompt_feedback", None)
        reason = getattr(feedback, "block_reason", None)
        if reason is None:
            return None
        normalized = str(reason).rsplit(".", maxsplit=1)[-1]
        return None if normalized in {"0", "BLOCK_REASON_UNSPECIFIED"} else normalized

    @staticmethod
    def _log_structured_response_diagnostics(
        response: object,
        response_model: type[BaseModel],
        include_content_preview: bool = True,
    ) -> None:
        """Log bounded development diagnostics without request or key data."""
        parsed = getattr(response, "parsed", None)
        raw_text = GeminiService._safely_extract_response_text(response)
        candidates = getattr(response, "candidates", None) or []
        logger.info(
            "Gemini structured response metadata operation=%s "
            "response_type=%s parsed_type=%s candidates=%d finish_reason=%s "
            "blocked_reason=%s",
            response_model.__name__,
            type(response).__name__,
            type(parsed).__name__,
            len(candidates),
            GeminiService._get_finish_reason(response),
            GeminiService._get_blocked_reason(response),
        )
        if include_content_preview:
            logger.debug(
                "Gemini structured diagnostics operation=%s response_type=%s "
                "response_none=%s parsed_type=%s parsed_preview=%r "
                "text_type=%s text_preview=%r candidates=%d "
                "finish_reason=%s blocked_reason=%s",
                response_model.__name__,
                type(response).__name__,
                response is None,
                type(parsed).__name__,
                repr(parsed)[:1000],
                type(raw_text).__name__,
                raw_text[:1000],
                len(candidates),
                GeminiService._get_finish_reason(response),
                GeminiService._get_blocked_reason(response),
            )

    @staticmethod
    def _get_finish_reason(response: object) -> str:
        """Return the first candidate finish reason without response content."""
        candidates = getattr(response, "candidates", None)
        if not candidates:
            return "UNKNOWN"
        finish_reason = getattr(candidates[0], "finish_reason", None)
        if finish_reason is None:
            return "UNKNOWN"
        return str(finish_reason).rsplit(".", maxsplit=1)[-1]

    def _thinking_config(self) -> types.ThinkingConfig:
        """Use the lowest supported thinking mode for concise summarization."""
        if "2.5" in self._settings.gemini_model:
            return types.ThinkingConfig(
                thinking_budget=self._settings.gemini_thinking_budget,
                include_thoughts=False,
            )
        return types.ThinkingConfig(
            thinking_level=types.ThinkingLevel.MINIMAL,
            include_thoughts=False,
        )

    @staticmethod
    def build_prompt(
        transcript: str,
        medical_entities: SummaryMedicalEntities | None,
    ) -> str:
        """Build a structured prompt without logging or altering patient data."""
        entities = (
            medical_entities.model_dump(exclude_none=True)
            if medical_entities is not None
            else {}
        )
        return (
            "<consultation_transcript>\n"
            f"{transcript}\n"
            "</consultation_transcript>\n"
            "<medical_entities>\n"
            f"{json.dumps(entities, ensure_ascii=False)}\n"
            "</medical_entities>"
        )

    def _get_client(self) -> GeminiClient:
        """Create the latest Google GenAI SDK client lazily."""
        if not self._settings.gemini_model.strip():
            raise AppException(
                "Gemini model is not configured",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="GEMINI_CONFIGURATION_ERROR",
                details={"stage": "configuration", "field": "GEMINI_MODEL"},
            )
        if self._client is not None:
            return self._client
        if not self._settings.gemini_api_key:
            raise AppException(
                "Gemini API key is not configured",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="GEMINI_API_KEY_MISSING",
            )

        retry_options = types.HttpRetryOptions(
            attempts=self._settings.gemini_max_retries + 1,
            http_status_codes=[429, 500, 502, 503, 504],
        )
        self._client = genai.Client(
            api_key=self._settings.gemini_api_key.get_secret_value(),
            http_options=types.HttpOptions(
                timeout=int(self._settings.gemini_timeout_seconds * 1000),
                retry_options=retry_options,
            ),
        )
        return self._client

    @staticmethod
    def _raise_api_error(exc: errors.APIError) -> None:
        """Map Gemini HTTP failures to stable application errors."""
        if exc.code == 429:
            logger.warning("Gemini summary request was rate limited")
            raise AppException(
                "Summary generation is temporarily rate limited",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                code="GEMINI_RATE_LIMITED",
            ) from exc
        if exc.code == 404:
            logger.warning("Configured Gemini model was not found")
            raise AppException(
                "The configured Gemini model is unavailable",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="GEMINI_MODEL_NOT_FOUND",
            ) from exc
        invalid_key = (
            exc.code in {401, 403}
            or exc.status == "API_KEY_INVALID"
            or "api key" in (exc.message or "").lower()
        )
        if invalid_key:
            logger.warning("Gemini rejected the configured API credentials")
            raise AppException(
                "Gemini API key is invalid or unauthorized",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="GEMINI_API_KEY_INVALID",
            ) from exc
        if exc.code == 400:
            logger.error(
                "Gemini request was rejected status=%s message=%s",
                exc.status,
                (exc.message or "")[:1000],
            )
            raise AppException(
                "Gemini rejected the structured generation request",
                status_code=status.HTTP_502_BAD_GATEWAY,
                code="GEMINI_REQUEST_FAILED",
                details={"stage": "provider_request"},
            ) from exc

        logger.error("Gemini summary API request failed with status %s", exc.code)
        raise AppException(
            "Summary generation service is unavailable",
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="GEMINI_API_ERROR",
        ) from exc
@lru_cache
def get_gemini_service() -> GeminiService:
    """Return a shared Gemini service using the configured settings."""
    return GeminiService(get_settings())
