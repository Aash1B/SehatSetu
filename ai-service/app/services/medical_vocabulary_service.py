"""Validated, patient-independent medical vocabulary resources."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

RESOURCE_DIR = Path(__file__).resolve().parents[1] / "resources" / "medical_vocabulary"
RESOURCE_FILES = (
    "medicines.json", "common_indian_brands.json", "symptoms.json",
    "lab_tests.json", "dosage_terms.json", "medical_abbreviations.json",
    "hindi_terms.json", "hinglish_aliases.json", "clinical_terms.json",
    "pronunciation_aliases.json",
)


class VocabularyValidationError(ValueError):
    """Raised when a vocabulary resource is unsafe or ambiguous."""


class MedicalVocabularyService:
    """Load validated vocabulary for context and conservative matching."""

    def __init__(self, resource_dir: Path = RESOURCE_DIR) -> None:
        self.resource_dir = resource_dir
        self.resources = self._load()

    def _load(self) -> dict[str, Any]:
        loaded: dict[str, Any] = {}
        aliases: dict[str, str] = {}
        for filename in RESOURCE_FILES:
            path = self.resource_dir / filename
            try:
                value = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise VocabularyValidationError(f"Invalid vocabulary resource: {filename}") from exc
            if not isinstance(value, dict) or value.get("schema_version") != 1:
                raise VocabularyValidationError(f"Unsupported vocabulary schema: {filename}")
            terms = value.get("terms")
            if not isinstance(terms, list) or any(not isinstance(term, str) or not term.strip() for term in terms):
                raise VocabularyValidationError(f"Invalid terms: {filename}")
            folded = [term.strip().casefold() for term in terms]
            if len(folded) != len(set(folded)):
                raise VocabularyValidationError(f"Duplicate terms: {filename}")
            mapping = value.get("aliases", {})
            if not isinstance(mapping, dict):
                raise VocabularyValidationError(f"Invalid aliases: {filename}")
            for source, target in mapping.items():
                key = str(source).strip().casefold()
                normalized = str(target).strip()
                if not key or not normalized or (key in aliases and aliases[key].casefold() != normalized.casefold()):
                    raise VocabularyValidationError(f"Conflicting alias: {source}")
                aliases[key] = normalized
            loaded[filename] = value
        loaded["aliases"] = aliases
        return loaded

    @property
    def terms(self) -> tuple[str, ...]:
        values: list[str] = []
        for filename in RESOURCE_FILES:
            values.extend(self.resources[filename]["terms"])
        return tuple(dict.fromkeys(values))

    def initial_prompt(self, previous_text: str | None = None, limit: int = 1200) -> str:
        context = "Medical consultation vocabulary: " + ", ".join(self.terms) + "."
        if previous_text:
            context += " Previous verified context: " + " ".join(previous_text.split()[-50:])
        return context[:limit]

    def aliases(self) -> dict[str, str]:
        return dict(self.resources["aliases"])


@lru_cache
def get_medical_vocabulary_service() -> MedicalVocabularyService:
    return MedicalVocabularyService()
