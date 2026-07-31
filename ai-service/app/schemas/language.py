"""Shared multilingual request and response fields."""

from pydantic import BaseModel, Field


class LanguageMetadata(BaseModel):
    """Detected and requested language metadata."""

    detected: str
    output: str
    confidence: float = Field(default=1.0, ge=0, le=1)
