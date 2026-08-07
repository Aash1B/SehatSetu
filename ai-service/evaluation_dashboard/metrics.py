"""Presentation-safe dashboard metric helpers."""
from typing import Any

def display(value: Any, percent: bool=False) -> str:
    if value is None: return "Not measured"
    if isinstance(value,float): return f"{value*100:.1f}%" if percent else f"{value:.3f}"
    return str(value)

def overview(data: dict[str,Any]) -> dict[str,Any]:
    verification=data.get("verification",{}); environment=verification.get("environment",{})
    gemini=data.get("gemini",{}); tuning=data.get("tuning",{}); ocr=data.get("ocr",{}).get("aggregate",{})
    datasets=verification.get("datasets",{}); extraction=data.get("extraction",{}).get("aggregate",{}); safety=data.get("safety",{})
    return {"status":verification.get("overall_status","NOT MEASURED"),**verification.get("counts",{}),"model":environment.get("configured_model",environment.get("whisper","Not measured")),"ffmpeg":environment.get("ffmpeg_available",environment.get("ffmpeg")),"gemini_ready":environment.get("gemini_key_present",environment.get("gemini_credential_present")),"gemini_success_rate":(gemini.get("successful",0)/gemini.get("real_requests",1)) if gemini.get("real_requests") else None,"usable_voice_cases":datasets.get("valid_voice"),"excluded_placeholders":datasets.get("placeholder_expected_files"),"synthetic_tts_count":datasets.get("generated_audio"),"unsupported_tts_count":datasets.get("unsupported_tts"),"ocr_similarity":ocr.get("ocr_similarity"),"ocr_numeric_accuracy":ocr.get("numeric_value_accuracy"),"ocr_passed":ocr.get("passed"),"extraction_symptom_recall":extraction.get("symptom_recall"),"extraction_medicine_recall":extraction.get("medicine_recall"),"generation_safety_violations":safety.get("violations"),"best_whisper_configuration":tuning.get("recommended_configuration")}
