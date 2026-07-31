"""Extensible supported-language registry."""

from dataclasses import dataclass


@dataclass(frozen=True)
class LanguageDefinition:
    """Language metadata shared by AI endpoints."""

    code: str
    name: str
    whisper_code: str | None
    script: str


SUPPORTED_LANGUAGES = {
    item.code: item
    for item in (
        LanguageDefinition("en", "English", "en", "Latin"),
        LanguageDefinition("hi", "Hindi", "hi", "Devanagari"),
        LanguageDefinition("hi-Latn", "Hinglish", "hi", "Latin"),
        LanguageDefinition("bn", "Bengali", "bn", "Bengali"),
        LanguageDefinition("mr", "Marathi", "mr", "Devanagari"),
        LanguageDefinition("gu", "Gujarati", "gu", "Gujarati"),
        LanguageDefinition("pa", "Punjabi", "pa", "Gurmukhi"),
        LanguageDefinition("ta", "Tamil", "ta", "Tamil"),
        LanguageDefinition("te", "Telugu", "te", "Telugu"),
        LanguageDefinition("kn", "Kannada", "kn", "Kannada"),
        LanguageDefinition("ml", "Malayalam", "ml", "Malayalam"),
        LanguageDefinition("ur", "Urdu", "ur", "Arabic"),
    )
}
SUPPORTED_LANGUAGE_CODES = ("auto", *SUPPORTED_LANGUAGES)
