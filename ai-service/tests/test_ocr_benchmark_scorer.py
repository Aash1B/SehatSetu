"""Whole-text scorer tests keep boilerplate normalization separate from evidence."""

from scripts.benchmark_ocr_accuracy import comparison_normalize, strict_similarity, token_similarity

IGNORED=["SYNTHETIC HEADER","Not medical advice."]


def test_configured_boilerplate_and_page_marker_are_removed_only_for_normalized_score():
    expected="Paracetamol 500 mg twice daily"
    actual="--- Page 1 --- SYNTHETIC HEADER Paracetamol 500 mg twice daily Not medical advice."
    assert strict_similarity(expected,actual)<1
    normalized=comparison_normalize(actual,IGNORED)
    assert normalized==comparison_normalize(expected,IGNORED)
    assert token_similarity(comparison_normalize(expected,IGNORED),normalized)==1


def test_scorer_does_not_hide_safety_critical_differences():
    expected="Paracetamol 500 mg twice daily HbA1c 6.8 percent"
    changed="Paracetamol 50 mcg once daily HbA1c 8.6 percent"
    assert comparison_normalize(expected,IGNORED)!=comparison_normalize(changed,IGNORED)
    assert token_similarity(comparison_normalize(expected,IGNORED),comparison_normalize(changed,IGNORED))<1


def test_unicode_whitespace_and_harmless_punctuation_normalize():
    left="HbA1c: 6.8%\nBP 150/95"
    right="  hba1c  6.8 % ; BP 150/95  "
    assert comparison_normalize(left)==comparison_normalize(right)
