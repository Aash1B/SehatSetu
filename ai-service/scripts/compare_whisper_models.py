"""Fair, sequential tiny/base/small comparison through the transcription API."""
from __future__ import annotations

import argparse
import csv
import ctypes
from ctypes import wintypes
import gc
import json
import os
import platform
import re
import statistics
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
REPORT_DIR = ROOT / "reports/standalone-verification"
MANIFEST = ROOT / "tests/fixtures/voice_dataset_manifest.json"
MODELS = ("tiny", "base", "small")


def rss_bytes() -> int | None:
    """Return current process working set without adding a dependency."""
    if os.name == "nt":
        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                        ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
                        ("PrivateUsage", ctypes.c_size_t)]
        counters = Counters(); counters.cb = ctypes.sizeof(counters)
        kernel = ctypes.WinDLL("kernel32"); function = ctypes.WinDLL("psapi").GetProcessMemoryInfo
        function.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        function.restype = wintypes.BOOL
        ok = function(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb)
        return int(counters.WorkingSetSize) if ok else None
    try:
        import resource
        value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return int(value * (1024 if sys.platform != "darwin" else 1))
    except Exception:
        return None


def peak_rss_bytes() -> int | None:
    if os.name != "nt":
        return rss_bytes()
    class Counters(ctypes.Structure):
        _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                    ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                    ("rest", ctypes.c_size_t * 7)]
    counters = Counters(); counters.cb = ctypes.sizeof(counters)
    kernel = ctypes.WinDLL("kernel32"); function = ctypes.WinDLL("psapi").GetProcessMemoryInfo
    function.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
    function.restype = wintypes.BOOL
    ok = function(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb)
    return int(counters.PeakWorkingSetSize) if ok else None


def mb(value: int | None) -> float | None:
    return round(value / 1024 / 1024, 2) if value is not None else None


def norm(text: str) -> str:
    return " ".join(re.sub(r"[^\w\s]", " ", text.casefold()).split())


def contains(actual: str, term: str) -> bool:
    return norm(term) in norm(actual)


def critical_errors(case: dict[str, Any], actual: str, detected: str | None) -> list[str]:
    errors: list[str] = []
    expected = case["expected_transcript"]
    expected_neg = case.get("expected_negations", [])
    actual_neg = set(re.findall(r"\b(?:no|not|never|denies?|without|nahi)\b", norm(actual)))
    missing_neg = [x for x in expected_neg if not contains(actual, x)]
    if missing_neg: errors.append("negation dropped")
    if not expected_neg and actual_neg: errors.append("negation reversed")
    for medicine in case.get("expected_medicines", []):
        if not contains(actual, medicine): errors.append("medicine omitted")
    expected_numbers = re.findall(r"\d+(?:\.\d+)?(?:/\d+)?", expected)
    actual_numbers = re.findall(r"\d+(?:\.\d+)?(?:/\d+)?", actual)
    if expected_numbers != actual_numbers:
        if "blood pressure" in norm(expected) or re.search(r"\d+/\d+", expected): errors.append("blood-pressure value changed")
        elif case.get("expected_tests") and any(re.search(r"\d", x) for x in case.get("expected_tests", [])): errors.append("lab value changed")
        elif case.get("expected_dosages"): errors.append("dosage number changed")
    units = r"\b(?:mg|mcg|g|ml|milligrams?|micrograms?)\b"
    canonical = {"milligram":"mg","milligrams":"mg","microgram":"mcg","micrograms":"mcg"}
    expected_units = [canonical.get(x.casefold(), x.casefold()) for x in re.findall(units, expected, re.I)]
    actual_units = [canonical.get(x.casefold(), x.casefold()) for x in re.findall(units, actual, re.I)]
    if expected_units != actual_units: errors.append("dosage unit changed")
    if not norm(actual): errors.append("transcript unexpectedly empty")
    words = norm(actual).split()
    if len(words) >= 8 and len(set(words)) / len(words) < .35: errors.append("severe repetition")
    if detected != "en": errors.append("language misdetected")
    return list(dict.fromkeys(errors))


def validate_manifest() -> tuple[dict[str, Any], list[dict[str, str]]]:
    source = json.loads(MANIFEST.read_text(encoding="utf-8"))
    included, excluded = [], []
    for case in source["cases"]:
        reasons = []
        fixture = MANIFEST.parent / case.get("file", "")
        if not case.get("enabled", True): reasons.append("disabled")
        if not fixture.is_file(): reasons.append("missing file")
        if case.get("consented") is not True or case.get("contains_patient_data") is not False: reasons.append("unsafe fixture metadata")
        if case.get("synthetic_content") is not True: reasons.append("not validated synthetic content")
        expected = str(case.get("expected_transcript", "")).strip()
        if not expected: reasons.append("missing/placeholder expected transcript")
        if case.get("language") in {"hi", "hi-Latn"} and str(case.get("tts_culture", "")).lower().startswith("en"):
            reasons.append("unsupported-language TTS (en-US voice for Hindi/Hinglish)")
        if reasons: excluded.append({"id": case.get("id", "unknown"), "reason": "; ".join(reasons)})
        else: included.append(case)
    fixed = {**source, "cases": included, "comparison_validation": {"source_manifest": str(MANIFEST.relative_to(ROOT)), "scorable": len(included), "excluded": excluded}}
    return fixed, excluded


def worker(model: str, fixed_manifest: Path, output: Path) -> int:
    os.environ.update({
        "APP_ENV": "testing", "WHISPER_MODEL_SIZE": model, "WHISPER_DEVICE": "cpu",
        "WHISPER_COMPUTE_TYPE": "int8", "WHISPER_BEAM_SIZE": "5", "WHISPER_BEST_OF": "5",
        "VAD_ENABLED": "true", "AUDIO_ENABLE_PREPROCESSING": "true",
        "WHISPER_MEDICAL_PROMPT_ENABLED": "true", "AUDIO_CHUNK_DURATION_SECONDS": "20",
        "AUDIO_CHUNK_OVERLAP_SECONDS": "2", "WHISPER_CONDITION_ON_PREVIOUS_TEXT": "true",
    })
    started = time.perf_counter(); before = rss_bytes()
    try:
        from app.services.transcription_service import get_transcription_service
        from scripts.benchmark_voice_accuracy import EndpointClient, run
        service = get_transcription_service()
        load_started = time.perf_counter(); service._get_model(); load_seconds = time.perf_counter() - load_started
        after = rss_bytes()
        client = EndpointClient(None, True, None)
        manifest = json.loads(fixed_manifest.read_text(encoding="utf-8"))
        warm_case = manifest["cases"][0]; warm_path = fixed_manifest.parent / warm_case["file"]
        warm_status, _, warm_seconds = client.transcribe(warm_path, {**warm_case, "language": "auto"})
        report = run(fixed_manifest, output, client, "auto")
        counts = {name: 0 for name in ("negation dropped", "negation reversed", "medicine omitted", "medicine hallucinated", "dosage number changed", "dosage unit changed", "lab value changed", "blood-pressure value changed", "transcript unexpectedly empty", "severe repetition", "language misdetected")}
        cases_by_id = {x["id"]: x for x in manifest["cases"]}; worst = []
        for result in report["results"]:
            case = cases_by_id[result["id"]]; actual = result.get("raw_transcript") or ""
            errors = critical_errors(case, actual, result.get("detected_language"))
            for error in errors: counts[error] += 1
            if errors: worst.append({"case_id": result["id"], "expected_transcript": case["expected_transcript"], "actual_transcript": actual, "critical_error_types": errors, "language": case["language"], "category": case["category"], "model": model})
        aggregate = report["aggregate"]
        aggregate.update({"model": model, "load_success": True, "model_load_seconds": load_seconds,
                          "warmup_status": warm_status, "warmup_seconds": warm_seconds,
                          "process_memory_before_load_mb": mb(before), "process_memory_after_load_mb": mb(after),
                          "peak_process_memory_mb": mb(peak_rss_bytes()), "total_benchmark_seconds": time.perf_counter()-started})
        output.mkdir(parents=True, exist_ok=True)
        (output / "worker-result.json").write_text(json.dumps({"status":"COMPLETE", "aggregate":aggregate, "critical_error_counts":counts, "worst_cases":worst, "results":report["results"]}, indent=2, ensure_ascii=False), encoding="utf-8")
        service._model = None; gc.collect()
        return 0
    except Exception as exc:
        output.mkdir(parents=True, exist_ok=True)
        (output / "worker-result.json").write_text(json.dumps({"status":"BLOCKED", "model":model, "reason":f"{type(exc).__name__}: {exc}", "total_benchmark_seconds":time.perf_counter()-started}, indent=2), encoding="utf-8")
        return 2


def choose_winner(completed: list[dict[str, Any]]) -> str | None:
    if not completed: return None
    def score(item: dict[str, Any]) -> tuple[Any, ...]:
        a, c = item["aggregate"], item["critical_error_counts"]
        return (c["negation dropped"] + c["negation reversed"], c["dosage number changed"] + c["dosage unit changed"] + c["blood-pressure value changed"],
                -(a.get("medicine_recall") or 0), -(a.get("important_term_recall") or 0), a.get("average_wer") if a.get("average_wer") is not None else 999,
                a.get("hallucination_rate") or 0, -(a.get("language_detection_accuracy") or 0), a.get("failed_request_rate") or 0,
                a.get("average_processing_seconds") or 999, a.get("peak_process_memory_mb") or 999999)
    return min(completed, key=score)["aggregate"]["model"]


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--worker", choices=MODELS); parser.add_argument("--manifest", type=Path); parser.add_argument("--output", type=Path); parser.add_argument("--reuse-workers", action="store_true"); args = parser.parse_args()
    if args.worker: return worker(args.worker, args.manifest.resolve(), args.output.resolve())
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    fixed, excluded = validate_manifest(); fixed_path = ROOT / ".tmp/whisper-model-comparison-manifest.json"; fixed_path.parent.mkdir(exist_ok=True)
    # Preserve paths relative to tests/fixtures by locating the fixed manifest there.
    fixed_path = MANIFEST.parent / ".whisper-model-comparison-manifest.json"
    fixed_path.write_text(json.dumps(fixed, indent=2, ensure_ascii=False), encoding="utf-8")
    outcomes = []
    try:
        for model in MODELS:
            destination = ROOT / ".tmp" / f"whisper-comparison-{model}"
            if not args.reuse_workers:
                command = [sys.executable, str(Path(__file__).resolve()), "--worker", model, "--manifest", str(fixed_path), "--output", str(destination)]
                subprocess.run(command, cwd=ROOT, check=False)
            result_path = destination / "worker-result.json"
            outcomes.append(json.loads(result_path.read_text(encoding="utf-8")) if result_path.exists() else {"status":"BLOCKED", "model":model, "reason":"worker produced no result"})
    finally:
        fixed_path.unlink(missing_ok=True)
    cases_by_id={x["id"]:x for x in fixed["cases"]}
    for outcome in outcomes:
        if outcome.get("status") != "COMPLETE": continue
        counts={name:0 for name in ("negation dropped","negation reversed","medicine omitted","medicine hallucinated","dosage number changed","dosage unit changed","lab value changed","blood-pressure value changed","transcript unexpectedly empty","severe repetition","language misdetected")}; worst=[]
        for result in outcome.get("results",[]):
            case=cases_by_id[result["id"]]; actual=result.get("raw_transcript") or ""; errors=critical_errors(case,actual,result.get("detected_language"))
            for error in errors: counts[error]+=1
            if errors: worst.append({"case_id":result["id"],"expected_transcript":case["expected_transcript"],"actual_transcript":actual,"critical_error_types":errors,"language":case["language"],"category":case["category"],"model":outcome["aggregate"]["model"]})
        outcome["critical_error_counts"],outcome["worst_cases"]=counts,worst
    complete = [x for x in outcomes if x.get("status") == "COMPLETE"]; winner = choose_winner(complete)
    report = {"title":"Whisper Model Comparison", "generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
              "dataset":{"manifest":"tests/fixtures/voice_dataset_manifest.json", "total_cases":len(fixed["cases"])+len(excluded), "scorable_cases":len(fixed["cases"]), "excluded_cases":excluded, "classification":"synthetic-only"},
              "settings":{"device":"cpu","compute_type":"int8","beam_size":5,"best_of":5,"vad_enabled":True,"preprocessing_enabled":True,"medical_prompt_enabled":True,"language_mode":"auto","chunk_seconds":20,"overlap_seconds":2,"condition_on_previous_text":True,"warmup":"one API request excluded"},
              "environment":{"os":platform.platform(),"python":platform.python_version(),"cpu":"11th Gen Intel(R) Core(TM) i7-11370H @ 3.30GHz","gpu":"Intel Iris Xe Graphics; NVIDIA GeForce MX450 (CPU inference used)","total_ram_gib":15.74,"available_ram_before_benchmark_gib":6.57,"available_disk_before_benchmark_gib":250.84,"faster_whisper":"1.2.1","compute_type":"int8"}, "models":outcomes, "provisional_winner":winner}
    (REPORT_DIR/"whisper-model-comparison.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    fields=["model","status","average_wer","average_cer","important_term_recall","medicine_recall","dosage_recall","negation_preservation_rate","number_preservation","language_detection_accuracy","hallucination_rate","repeated_text_rate","failed_request_rate","first_request_seconds","average_processing_seconds","median_processing_seconds","p95_processing_seconds","model_load_seconds","process_memory_before_load_mb","process_memory_after_load_mb","peak_process_memory_mb","total_benchmark_seconds"]
    with (REPORT_DIR/"whisper-model-comparison.csv").open("w",newline="",encoding="utf-8") as stream:
        writer=csv.DictWriter(stream,fieldnames=fields); writer.writeheader()
        for item in outcomes:
            a=item.get("aggregate",{}); writer.writerow({k:(a.get(k) if k not in {"model","status"} else (a.get("model") if k=="model" else item.get("status"))) for k in fields})
    lines=["# Whisper Model Comparison","","## Dataset","",f"- Manifest used: `tests/fixtures/voice_dataset_manifest.json`",f"- Total cases: {len(fixed['cases'])+len(excluded)}",f"- Scorable cases: {len(fixed['cases'])}","- Classification: synthetic-only (human validation still required)","","Excluded cases:",""]+[f"- `{x['id']}`: {x['reason']}" for x in excluded]
    lines += ["","## Environment","",f"- OS: {platform.platform()}",f"- Python: {platform.python_version()}","- CPU: 11th Gen Intel Core i7-11370H","- GPU: Intel Iris Xe / NVIDIA MX450 (not used)","- Available RAM before benchmark: 6.57 GiB of 15.74 GiB","- Available disk before benchmark: 250.84 GiB","- faster-whisper: 1.2.1","- Device / compute type: CPU / int8","","## Results Table","","| Model | Status | WER | CER | Medical recall | Medicine recall | Dosage recall | Negation | Numbers | Language | Hallucination | Repetition | Failure | Avg latency | p95 | Load | Peak MB |","|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for item in outcomes:
        a=item.get("aggregate",{}); val=lambda k: a.get(k,"—")
        lines.append(f"| {a.get('model',item.get('model','?'))} | {item['status']} | {val('average_wer')} | {val('average_cer')} | {val('important_term_recall')} | {val('medicine_recall')} | {val('dosage_recall')} | {val('negation_preservation_rate')} | {val('number_preservation')} | {val('language_detection_accuracy')} | {val('hallucination_rate')} | {val('repeated_text_rate')} | {val('failed_request_rate')} | {val('average_processing_seconds')} | {val('p95_processing_seconds')} | {val('model_load_seconds')} | {val('peak_process_memory_mb')} |")
    lines += ["","## Critical Errors",""]
    for item in outcomes:
        lines += [f"### {item.get('aggregate',{}).get('model',item.get('model','unknown'))}","",json.dumps(item.get("critical_error_counts",{}),ensure_ascii=False),""]
        for case in item.get("worst_cases",[])[:3]: lines += [f"- `{case['case_id']}` ({case['language']}, {case['category']}): {', '.join(case['critical_error_types'])}. Expected: “{case['expected_transcript']}” Actual: “{case['actual_transcript']}”"]
    lines += ["## Winner","",f"Provisional winner: **{winner or 'none (all models blocked)'}**. Selection follows the requested safety-first ordering. Results are synthetic-only; human recordings remain required.","","## Render Recommendation","","- Verified from repository: CPU/int8, one Uvicorn worker, and runtime model download/cache behavior (the image does not pre-download Whisper).","- Measured locally: see load, latency, and memory columns above.","- Inferred: use one worker; choose the winner for accuracy and tiny for the lowest-memory profile. Persistent model caching or image pre-download should be evaluated to reduce cold-start risk.","- Unresolved: the repository does not state the Render instance RAM, CPU allocation, persistent disk, or exact cold-start limits.","","## Final Verdict","",f"1. Best model: {winner or 'not determined'}",f"2. Fastest model: {min(complete,key=lambda x:x['aggregate']['average_processing_seconds'])['aggregate']['model'] if complete else 'not determined'}",f"3. Least memory: {min(complete,key=lambda x:x['aggregate'].get('peak_process_memory_mb') or 1e12)['aggregate']['model'] if complete else 'not determined'}","4. Best negation preservation: see results table (ties remain ties).","5. Best medicine recall: see results table.","6. Best dosage recall: see results table.",f"7. Local development: {winner or 'not determined'}","8. Render: tiny for low-memory; accuracy winner only after instance-capacity validation.",f"9. All three tested: {'yes' if len(complete)==3 else 'no'}","10. Synthetic audio only: yes","11. Endpoint/schema changed: no","12. Anything staged: no","13. Commit created: no","14. Anything pushed: no","15. Deployment performed: no"]
    (REPORT_DIR/"whisper-model-comparison.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
    (REPORT_DIR/"recommended-whisper-model.env.example").write_text(f"WHISPER_MODEL_SIZE={winner or 'tiny'}\nWHISPER_DEVICE=cpu\nWHISPER_COMPUTE_TYPE=int8\nWHISPER_NUM_WORKERS=1\n",encoding="utf-8")
    return 0 if complete else 2


if __name__ == "__main__": raise SystemExit(main())
