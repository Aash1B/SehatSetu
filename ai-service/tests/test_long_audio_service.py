from app.services.long_audio_service import (
    assemble_window_transcripts, plan_audio_windows, shift_timestamps,
)

def test_plans_five_ten_and_twenty_minute_audio_by_duration():
    assert len(plan_audio_windows(300,20,2))==17
    assert len(plan_audio_windows(600,20,2))==34
    assert len(plan_audio_windows(1200,20,2))==67

def test_windows_have_overlap_and_cover_duration():
    windows=plan_audio_windows(65,20,2)
    assert windows[0].start==0 and windows[-1].end==65
    assert all(right.start==left.end-2 for left,right in zip(windows,windows[1:]))

def test_overlap_merge_removes_duplicate_boundary_text():
    windows=plan_audio_windows(38,20,2)
    merged=assemble_window_transcripts([(windows[0],"Patient has fever and cough"),(windows[1],"fever and cough but no chest pain")])
    assert merged=="Patient has fever and cough but no chest pain"

def test_timestamp_shift_preserves_continuity():
    window=plan_audio_windows(40,20,2)[1]
    assert shift_timestamps(window,[(0,1,"next")])==[(18,19,"next")]

def test_invalid_overlap_is_rejected():
    import pytest
    with pytest.raises(ValueError): plan_audio_windows(60,20,20)
