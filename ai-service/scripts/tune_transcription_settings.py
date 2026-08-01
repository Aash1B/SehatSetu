"""Sequential, opt-in transcription tuning without automatic model downloads."""

from __future__ import annotations
import argparse, csv, json, os, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports/standalone-verification"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url")
    parser.add_argument("--manifest", type=Path, default=ROOT / "tests/fixtures/voice/voice_dataset_manifest.json")
    parser.add_argument("--output-dir", type=Path, default=REPORTS)
    parser.add_argument("--use-test-client", action="store_true")
    parser.add_argument("--allow-model-download", action="store_true", help="Acknowledge that the configured model may be downloaded")
    args = parser.parse_args()
    reports = args.output_dir
    configured_model = os.getenv("WHISPER_MODEL_SIZE", "tiny")
    configs = [
        {"name":"configured-balanced","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"5","WHISPER_BEST_OF":"5","VAD_ENABLED":"true","AUDIO_ENABLE_PREPROCESSING":"true"},
        {"name":"beam-1","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"1","WHISPER_BEST_OF":"1","VAD_ENABLED":"true","AUDIO_ENABLE_PREPROCESSING":"true"},
        {"name":"beam-3","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"3","WHISPER_BEST_OF":"3","VAD_ENABLED":"true","AUDIO_ENABLE_PREPROCESSING":"true"},
        {"name":"vad-off","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"5","WHISPER_BEST_OF":"5","VAD_ENABLED":"false","AUDIO_ENABLE_PREPROCESSING":"true"},
        {"name":"preprocessing-off","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"5","WHISPER_BEST_OF":"5","VAD_ENABLED":"true","AUDIO_ENABLE_PREPROCESSING":"false"},
        {"name":"medical-prompt-off","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"5","WHISPER_BEST_OF":"5","VAD_ENABLED":"true","WHISPER_MEDICAL_PROMPT_ENABLED":"false"},
        {"name":"auto-language-window-20","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"5","WHISPER_BEST_OF":"5","VAD_ENABLED":"true","LIVE_TRANSCRIPTION_WINDOW_SECONDS":"20","LIVE_TRANSCRIPTION_OVERLAP_SECONDS":"2","FORCE_LANGUAGE":"auto"},
        {"name":"previous-text-off-window-30","WHISPER_MODEL_SIZE":configured_model,"WHISPER_BEAM_SIZE":"5","WHISPER_BEST_OF":"5","VAD_ENABLED":"true","WHISPER_CONDITION_ON_PREVIOUS_TEXT":"false","LIVE_TRANSCRIPTION_WINDOW_SECONDS":"30","LIVE_TRANSCRIPTION_OVERLAP_SECONDS":"4"},
    ]
    rows = []
    for config in configs:
        output = reports / "tuning-runs" / config["name"]
        command = [sys.executable, str(ROOT / "scripts/benchmark_voice_accuracy.py"), "--manifest", str(args.manifest), "--output-dir", str(output)]
        command += ["--use-test-client"] if args.use_test_client else ["--base-url", args.base_url or "http://127.0.0.1:8000"]
        if config.get("FORCE_LANGUAGE"): command += ["--force-language",config["FORCE_LANGUAGE"]]
        environment = {**os.environ, **config}
        if not args.allow_model_download:
            environment["HF_HUB_OFFLINE"] = "1"
        started = time.perf_counter()
        process = subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, text=True)
        report_path = output / "voice-benchmark.json"
        aggregate = json.loads(report_path.read_text(encoding="utf-8"))["aggregate"] if report_path.exists() else {}
        rows.append({"configuration":config["name"],"model":configured_model,"beam_size":config.get("WHISPER_BEAM_SIZE"),"best_of":config.get("WHISPER_BEST_OF"),"vad":config.get("VAD_ENABLED"),"preprocessing":config.get("AUDIO_ENABLE_PREPROCESSING","true"),"medical_prompt":config.get("WHISPER_MEDICAL_PROMPT_ENABLED","true"),"condition_on_previous_text":config.get("WHISPER_CONDITION_ON_PREVIOUS_TEXT","true"),"language_mode":config.get("FORCE_LANGUAGE","explicit"),"noise_reduction":config.get("AUDIO_ENABLE_NOISE_REDUCTION","true"),"chunk_duration":config.get("LIVE_TRANSCRIPTION_WINDOW_SECONDS","configured"),"overlap":config.get("LIVE_TRANSCRIPTION_OVERLAP_SECONDS","configured"),"exit_code":process.returncode,"elapsed_seconds":round(time.perf_counter()-started,3),**aggregate})
    eligible = [row for row in rows if row.get("passed", 0) and not row.get("failed", 0)]
    ranked = sorted(eligible, key=lambda row: (-(row.get("negation_preservation_rate") or 0),-(row.get("dosage_recall") or 0),-(row.get("important_term_recall") or 0),-(row.get("medicine_recall") or 0),row.get("average_wer",999),row.get("hallucination_rate",999),-(row.get("language_detection_accuracy") or 0),row.get("average_processing_seconds",999)))
    recommendation = ranked[0]["configuration"] if ranked else None
    report = {"status":"COMPLETE" if recommendation else "BLOCKED","reason":None if recommendation else "No enabled real voice fixtures produced successful measurements","configurations":rows,"recommended_configuration":recommendation,"recommended_env":None if not recommendation else next(item for item in configs if item["name"] == recommendation)}
    report["label"] = "PROVISIONAL - BASED ON SYNTHETIC TTS"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "transcription-tuning.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    fields = sorted({key for row in rows for key in row})
    with (reports / "transcription-tuning.csv").open("w", newline="", encoding="utf-8") as stream:
        writer=csv.DictWriter(stream,fieldnames=fields); writer.writeheader(); writer.writerows(rows)
    markdown = ["# Transcription Tuning", "", "**PROVISIONAL - BASED ON SYNTHETIC TTS**", "", f"Status: {report['status']}", "", report.get("reason") or f"Recommended: {recommendation}", "", "No production defaults were modified.", "", "```json", json.dumps(rows, indent=2), "```"]
    (reports / "transcription-tuning.md").write_text("\n".join(markdown)+"\n", encoding="utf-8")
    env = ["# PROVISIONAL - BASED ON SYNTHETIC TTS"]
    if recommendation:
        env += [f"{key}={value}" for key,value in report["recommended_env"].items() if key != "name"]
    (reports / "recommended-transcription-settings.env.example").write_text("\n".join(env)+"\n", encoding="utf-8")
    print(json.dumps(report, indent=2)); return 0 if recommendation else 2

if __name__ == "__main__": raise SystemExit(main())
