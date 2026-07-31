"""Tests for script and mixed-language detection."""

import pytest

from app.core.exceptions import AppException
from app.services.language_service import (
    language_service,
    normalize_output_language,
)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Patient has fever", "en"),
        ("मुझे सीने में दर्द है", "hi"),
        ("mujhe do din se bukhar hai", "hi-Latn"),
        ("রোগীর জ্বর আছে", "bn"),
        ("நோயாளிக்கு காய்ச்சல்", "ta"),
    ],
)
def test_language_detection(text: str, expected: str) -> None:
    assert language_service.resolve(text).detected == expected


def test_explicit_language_and_output_are_trusted() -> None:
    result = language_service.resolve("mixed text", "hi", "en")
    assert result.detected == "hi"
    assert result.output == "en"


def test_unsupported_language_is_rejected() -> None:
    with pytest.raises(AppException) as exc_info:
        language_service.resolve("text", "fr")
    assert exc_info.value.code == "UNSUPPORTED_LANGUAGE"


@pytest.mark.parametrize(
    ("output_language", "expected"),
    [
        pytest.param(None, "hi", id="omitted-or-null"),
        ("", "hi"),
        ("auto", "hi"),
        ("en", "en"),
        ("en-US", "en"),
        ("en-GB", "en"),
        ("English", "en"),
        ("EN", "en"),
        ("hi", "hi"),
        ("hi-IN", "hi"),
        ("Hindi", "hi"),
        ("हिंदी", "hi"),
        ("hi-Latn", "hi-Latn"),
        ("HI-LATN", "hi-Latn"),
        ("Hinglish", "hi-Latn"),
        ("Bengali", "bn"),
        ("Bangla", "bn"),
        (" Marathi ", "mr"),
        ("gUjArAtI", "gu"),
        ("Punjabi", "pa"),
        ("Tamil", "ta"),
        ("Telugu", "te"),
        ("Kannada", "kn"),
        ("Malayalam", "ml"),
        ("Urdu", "ur"),
    ],
)
def test_output_language_normalization(
    output_language: str | None,
    expected: str,
) -> None:
    result = language_service.resolve(
        "मरीज को बुखार है",
        "auto",
        output_language,
    )
    assert result.output == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (" English ", "en"),
        ("Hindi", "hi"),
        ("Hinglish", "hi-Latn"),
        ("Bengali", "bn"),
        ("Marathi", "mr"),
        ("Gujarati", "gu"),
        ("Punjabi", "pa"),
        ("Tamil", "ta"),
        ("Telugu", "te"),
        ("Kannada", "kn"),
        ("Malayalam", "ml"),
        ("Urdu", "ur"),
        ("Hi", "hi"),
    ],
)
def test_input_language_names_are_normalized(
    value: str,
    expected: str,
) -> None:
    result = language_service.resolve("mixed text", value)
    assert result.detected == expected


def test_invalid_output_language_is_rejected() -> None:
    with pytest.raises(AppException) as exc_info:
        language_service.resolve("text", "en", "xyz")
    assert exc_info.value.code == "UNSUPPORTED_LANGUAGE"
    assert exc_info.value.message == "Unsupported output language."
    assert exc_info.value.details == {
        "received": "xyz",
        "supported_codes": [
            "en",
            "hi",
            "hi-Latn",
            "bn",
            "mr",
            "gu",
            "pa",
            "ta",
            "te",
            "kn",
            "ml",
            "ur",
        ],
        "accepted_aliases": ["English", "Hindi", "Hinglish", "auto"],
    }


def test_output_language_defaults_to_english_without_detection() -> None:
    assert normalize_output_language(None) == "en"
    assert normalize_output_language("") == "en"
    assert normalize_output_language("auto") == "en"
