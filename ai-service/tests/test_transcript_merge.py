"""Tests for overlap-aware multilingual transcript merging."""

import pytest

from app.services.transcript_merge_service import merge_transcripts


@pytest.mark.parametrize(
    ("previous", "current", "expected"),
    [
        (
            "the patient has fever and cough",
            "fever and cough for two days",
            "the patient has fever and cough for two days",
        ),
        (
            "मरीज को बुखार और खांसी है",
            "और खांसी है दो दिन से",
            (
                "मरीज को बुखार और खांसी है "
                "दो दिन से"
            ),
        ),
        (
            "patient ko fever aur cough hai",
            "fever aur cough hai do din se",
            "patient ko fever aur cough hai do din se",
        ),
    ],
)
def test_merge_transcripts(
    previous: str, current: str, expected: str
) -> None:
    assert merge_transcripts(previous, current) == expected
