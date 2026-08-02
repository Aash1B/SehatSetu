"""Medical scoring, correction, repetition, and candidate safety tests."""
import pytest

from app.services.transcription_safety_service import (
    analyze_repetition, canonicalize_medical_expression,
    correction_candidates, safety_signature, score_dosages,
)

@pytest.mark.parametrize(("left","right"),[
    ("500 mg","500 milligrams"),("50 mcg","fifty micrograms"),
    ("1 tablet","one tab"),("twice daily","two times daily"),
    ("once daily","one time daily"),("three times daily","TID"),
    ("5 mL","five millilitres"),("10 IU","ten international units"),
])
def test_safe_dosage_equivalences(left,right):
    assert canonicalize_medical_expression(left)==canonicalize_medical_expression(right)

@pytest.mark.parametrize(("left","right"),[
    ("500 mg","500 mcg"),("5 ml","5 mg"),("5 mg","50 mg"),
    ("0.5 mg","5 mg"),("once daily","twice daily"),
    ("one tablet","two tablets"),("daily","weekly"),
    ("before food","after food"),
])
def test_unsafe_dosage_distinctions_remain_different(left,right):
    assert canonicalize_medical_expression(left)!=canonicalize_medical_expression(right)

def test_dosage_metrics_keep_strict_and_normalized_separate():
    result=score_dosages(["500 milligrams","twice daily","after food"],"Metformin 500 milligrams twice daily after food","Metformin 500 mg BID after food")
    assert result.strict_dosage_recall==pytest.approx(1/3)
    assert result.normalized_dosage_recall==1
    assert result.dosage_number_accuracy==1
    assert result.dosage_unit_accuracy==1
    assert result.frequency_accuracy==1
    assert result.timing_instruction_accuracy==1

@pytest.mark.parametrize("text",[
    "fever fever fever fever fever fever",
    "take medicine now take medicine now take medicine now",
    "5-5-5-5-5-5-5-5-5",
    "Paracetamol Paracetamol Paracetamol",
])
def test_repetition_patterns_are_detected(text):
    assert analyze_repetition(text,2).detected

def test_observed_base_repetition_is_detected():
    text="Paracetamol 500 mg twice daily after food. " + "fever headache "*45
    result=analyze_repetition(text,4)
    assert result.detected
    assert "disproportionate_length" in result.reasons

def test_repeated_timestamps_and_audio_end_expansion():
    result=analyze_repetition("normal words",2,[(0,1),(0,1),(1,5)])
    assert {"repeated_segment_timestamps","audio_end_expansion"} <= set(result.reasons)
    assert result.affected_segment_indexes==(0,1)

@pytest.mark.parametrize(("text","candidate"),[
    ("Panto-Presol 40 mg once daily","pantoprazole"),
    ("Level thyroxine 50 mcg once daily","levothyroxine"),
    ("A tour of a statin 10 mg at bedtime","atorvastatin"),
    ("met four men 500 mg twice daily","metformin"),
])
def test_contextual_correction_candidates_do_not_rewrite(text,candidate):
    results=correction_candidates(text)
    assert results[0]["corrected_candidate"]==candidate
    assert results[0]["requires_review"] is True
    assert candidate not in text.casefold()

def test_correction_requires_medication_context():
    assert correction_candidates("We discussed a tour of a statin in class.")==[]

def test_correction_preserves_safety_signature():
    original="No allergy. Panto-Presol 40 mg once daily."
    before=safety_signature(original); result=correction_candidates(original)
    assert result and before["numbers"]==("40",) and before["negations"]==("no",)
