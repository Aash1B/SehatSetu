"""Lightweight script and Hinglish language detection."""

import re

from fastapi import status

from app.core.exceptions import AppException
from app.core.languages import SUPPORTED_LANGUAGES
from app.schemas.language import LanguageMetadata

SCRIPT_RANGES = (
    ("bn", "\u0980", "\u09ff"),
    ("gu", "\u0a80", "\u0aff"),
    ("pa", "\u0a00", "\u0a7f"),
    ("ta", "\u0b80", "\u0bff"),
    ("te", "\u0c00", "\u0c7f"),
    ("kn", "\u0c80", "\u0cff"),
    ("ml", "\u0d00", "\u0d7f"),
    ("ur", "\u0600", "\u06ff"),
)
HINGLISH_WORDS = {
    "mujhe", "hai", "hain", "dard", "bukhar", "khansi", "pet", "sir",
    "do", "din", "se", "mera", "meri", "nahi",
}
LANGUAGE_ALIASES = {
    definition.name.casefold(): code
    for code, definition in SUPPORTED_LANGUAGES.items()
}
LANGUAGE_ALIASES.update(
    {code.casefold(): code for code in SUPPORTED_LANGUAGES}
)
LANGUAGE_ALIASES.update(
    {
        "auto": "auto",
        "en-us": "en",
        "en-gb": "en",
        "hi-in": "hi",
        "hi_in": "hi",
        "hi_latn": "hi-Latn",
        "hi-latn": "hi-Latn",
        "हिंदी": "hi",
        "bangla": "bn",
    }
)
OUTPUT_LANGUAGE_ALIAS_EXAMPLES = ["English", "Hindi", "Hinglish", "auto"]


def normalize_output_language(
    value: str | None,
    detected_language: str | None = None,
) -> str:
    """Return one canonical output code or the detected/default language."""
    normalized = LanguageService.normalize(value, allow_auto=True)
    if normalized in {None, "auto"}:
        return (
            detected_language
            if detected_language in SUPPORTED_LANGUAGES
            else "en"
        )
    if normalized not in SUPPORTED_LANGUAGES:
        raise AppException(
            "Unsupported output language.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="UNSUPPORTED_LANGUAGE",
            details={
                "received": str(value).strip() if value is not None else None,
                "supported_codes": list(SUPPORTED_LANGUAGES),
                "accepted_aliases": OUTPUT_LANGUAGE_ALIAS_EXAMPLES,
            },
        )
    return normalized


class LanguageService:
    """Resolve explicit, native-script, and Romanized language input."""

    def resolve(
        self,
        text: str,
        language: str = "auto",
        output_language: str | None = None,
    ) -> LanguageMetadata:
        """Return validated detected/output language codes."""
        normalized_language = self.normalize(language, allow_auto=True)
        if normalized_language is None:
            normalized_language = "auto"
        if (
            normalized_language != "auto"
            and normalized_language not in SUPPORTED_LANGUAGES
        ):
            raise AppException(
                "Unsupported language",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="UNSUPPORTED_LANGUAGE",
                details={"supported": ["auto", *SUPPORTED_LANGUAGES]},
            )
        detected, confidence = (
            (normalized_language, 1.0)
            if normalized_language != "auto"
            else self.detect(text)
        )
        if detected not in SUPPORTED_LANGUAGES:
            detected, confidence = "en", 0.5
        output = normalize_output_language(output_language, detected)
        return LanguageMetadata(
            detected=detected, output=output, confidence=confidence
        )

    @staticmethod
    def normalize(
        value: str | None,
        *,
        allow_auto: bool,
    ) -> str | None:
        """Normalize names and codes case-insensitively."""
        if value is None or not str(value).strip():
            return None
        normalized = LANGUAGE_ALIASES.get(str(value).strip().casefold())
        if normalized == "auto" and not allow_auto:
            return None
        return normalized or str(value).strip()

    @staticmethod
    def detect(text: str) -> tuple[str, float]:
        """Detect supported scripts and common Romanized Hindi."""
        for code, start, end in SCRIPT_RANGES:
            if any(start <= character <= end for character in text):
                return code, 0.95
        if any("\u0900" <= character <= "\u097f" for character in text):
            return "hi", 0.95
        words = set(re.findall(r"[a-z]+", text.lower()))
        matches = words & HINGLISH_WORDS
        if len(matches) >= 2:
            return "hi-Latn", min(0.9, 0.55 + len(matches) * 0.05)
        return "en", 0.75


language_service = LanguageService()
