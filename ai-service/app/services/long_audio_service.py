"""Duration-based long-audio planning and overlap-safe segment assembly."""
from __future__ import annotations
from dataclasses import dataclass

from app.services.transcript_merge_service import merge_transcripts


@dataclass(frozen=True)
class AudioWindow:
    index: int
    start: float
    end: float


def plan_audio_windows(duration: float, chunk_seconds: int, overlap_seconds: int) -> list[AudioWindow]:
    if duration <= 0: return []
    if overlap_seconds >= chunk_seconds: raise ValueError("overlap must be shorter than chunk")
    windows=[]; start=0.0; index=0
    while start < duration:
        end=min(duration,start+chunk_seconds); windows.append(AudioWindow(index,start,end))
        if end >= duration: break
        start=end-overlap_seconds; index+=1
    return windows


def assemble_window_transcripts(items: list[tuple[AudioWindow,str]]) -> str:
    merged=""
    for _,text in sorted(items,key=lambda item:item[0].index): merged=merge_transcripts(merged,text)
    return merged


def shift_timestamps(window: AudioWindow, segments: list[tuple[float,float,str]]) -> list[tuple[float,float,str]]:
    return [(window.start+start,window.start+end,text) for start,end,text in segments]
