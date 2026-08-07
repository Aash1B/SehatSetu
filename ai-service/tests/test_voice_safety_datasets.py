import json
from pathlib import Path

from app.services.transliteration_service import transliteration_service

BASE=Path("tests/fixtures/voice_safety")

def test_safety_set_minimum_counts_and_labels():
    expected={"negation-safety.json":40,"dosage-number-safety.json":40,"medicine-safety.json":50,"lab-vital-safety.json":20}
    for name,minimum in expected.items():
        data=json.loads((BASE/name).read_text(encoding="utf-8"))
        assert len(data["cases"])>=minimum
        assert "text-only" in data["classification"]
        assert all(case["synthetic"] is True for case in data["cases"])

def test_negation_pairs_have_distinct_positive_and_negative_text():
    cases=json.loads((BASE/"negation-safety.json").read_text(encoding="utf-8"))["cases"]
    assert all(case["positive"]!=case["negative"] for case in cases)

def test_offline_hindi_transliteration_preserves_english_medical_terms():
    value=transliteration_service.romanize_hindi("मरीज Metformin 500 mg लेता है")
    assert "Metformin 500 mg" in value
    assert not any("\u0900"<=char<="\u097f" for char in value)
