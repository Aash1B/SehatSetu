"""Validation tests for patient-independent medical vocabulary."""

import json
from pathlib import Path

import pytest

from app.services.medical_vocabulary_service import (
    MedicalVocabularyService,
    RESOURCE_FILES,
    VocabularyValidationError,
)


def _copy_resources(destination: Path) -> None:
    source = Path("app/resources/medical_vocabulary")
    destination.mkdir(exist_ok=True)
    for name in RESOURCE_FILES:
        (destination / name).write_text((source / name).read_text(encoding="utf-8"), encoding="utf-8")


def test_resources_load_and_prompt_is_bounded() -> None:
    service = MedicalVocabularyService()
    assert "paracetamol" in service.terms
    assert "Crocin" in service.terms
    assert len(service.initial_prompt(limit=180)) <= 180


def test_malformed_resource_is_rejected(tmp_path: Path) -> None:
    _copy_resources(tmp_path)
    (tmp_path / "medicines.json").write_text("{", encoding="utf-8")
    with pytest.raises(VocabularyValidationError, match="Invalid vocabulary"):
        MedicalVocabularyService(tmp_path)


def test_duplicate_terms_are_rejected(tmp_path: Path) -> None:
    _copy_resources(tmp_path)
    path = tmp_path / "medicines.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["terms"] = ["Paracetamol", "paracetamol"]
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(VocabularyValidationError, match="Duplicate terms"):
        MedicalVocabularyService(tmp_path)


def test_conflicting_aliases_are_rejected(tmp_path: Path) -> None:
    _copy_resources(tmp_path)
    first = tmp_path / "hindi_terms.json"
    data = json.loads(first.read_text(encoding="utf-8"))
    data["aliases"]["mcg"] = "wrong-unit"
    first.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(VocabularyValidationError, match="Conflicting alias"):
        MedicalVocabularyService(tmp_path)
