"""Benchmark the real transcription endpoint against consented local fixtures."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import statistics
import sys
import time
import unicodedata
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
DEFAULT_MANIFEST = ROOT / "tests/fixtures/voice_dataset_manifest.json"
DEFAULT_REPORT_DIR = ROOT / "reports/standalone-verification"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def edit_distance(left: list[str], right: list[str]) -> int:
    previous = list(range(len(right) + 1))
    for index, a in enumerate(left, 1):
        current = [index]
        for offset, b in enumerate(right, 1):
            current.append(min(current[-1] + 1, previous[offset] + 1,
                               previous[offset - 1] + (a != b)))
        previous = current
    return previous[-1]


def error_rate(expected: str, actual: str, characters: bool = False) -> float | None:
    expected_n, actual_n = normalize(expected), normalize(actual)
    source = list(expected_n) if characters else expected_n.split()
    target = list(actual_n) if characters else actual_n.split()
    return edit_distance(source, target) / len(source) if source else None


def recall(expected: list[str], actual: str) -> float | None:
    if not expected:
        return None
    normalized = normalize(actual)
    return sum(normalize(item) in normalized for item in expected) / len(expected)


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int((len(ordered) - 1) * fraction))]


class EndpointClient:
    def __init__(self, base_url: str | None, use_test_client: bool, api_key: str | None):
        self.api_key = api_key
        if use_test_client:
            os.environ["APP_ENV"] = "testing"
            from fastapi.testclient import TestClient
            from app.main import app
            self.client = TestClient(app)
            self.url = "/api/v1/transcribe"
        else:
            import httpx
            self.client = httpx.Client(timeout=180)
            self.url = (base_url or "http://127.0.0.1:8000").rstrip("/") + "/api/v1/transcribe"

    def transcribe(self, path: Path, case: dict[str, Any]) -> tuple[int, dict[str, Any], float]:
        headers = {"X-Internal-API-Key": self.api_key} if self.api_key else {}
        started = time.perf_counter()
        with path.open("rb") as stream:
            response = self.client.post(
                self.url,
                headers=headers,
                files={"file": (path.name, stream, case.get("content_type") or "application/octet-stream")},
                data={"language": case.get("language", "auto"), "include_segments": "true"},
            )
        return response.status_code, response.json(), time.perf_counter() - started


def run(manifest_path: Path, output_dir: Path, client: EndpointClient, force_language: str | None = None) -> dict[str, Any]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    results: list[dict[str, Any]] = []
    for case in manifest["cases"]:
        fixture = manifest_path.parent / case["file"]
        if not case.get("enabled", True):
            results.append({"id": case["id"], "status": "SKIPPED", "reason": "disabled"})
            continue
        safety_errors=[]
        if case.get("consented") is not True: safety_errors.append("consent not confirmed")
        if case.get("synthetic_content") is not True: safety_errors.append("content not confirmed synthetic")
        if case.get("contains_patient_data") is not False: safety_errors.append("patient-data status unsafe")
        if not str(case.get("expected_transcript", "")).strip(): safety_errors.append("expected transcript missing")
        if safety_errors:
            results.append({"id":case["id"],"status":"SKIPPED","reason":"; ".join(safety_errors),"unsafe_rejected":True})
            continue
        if not fixture.is_file():
            status = "SKIPPED" if case.get("optional", False) else "FAILED"
            results.append({"id": case["id"], "status": status, "reason": "fixture missing", "file": str(fixture.relative_to(ROOT))})
            continue
        try:
            request_case={**case,"language":force_language or case.get("language","auto")}
            http_status, payload, latency = client.transcribe(fixture, request_case)
            data = payload.get("data") or {}
            actual = data.get("raw_transcript") or data.get("transcript") or ""
            expected = case.get("expected_transcript", "")
            success = 200 <= http_status < 300
            result = {
                "id": case["id"], "file": case["file"], "language": case.get("language"), "category": case.get("category"),
                "expected_transcript": expected, "raw_transcript": data.get("raw_transcript"),
                "cleaned_transcript": data.get("cleaned_transcript"), "detected_language": data.get("detected_language"),
                "requested_language": data.get("requested_language", case.get("language")), "warnings": data.get("warnings", []),
                "processing_duration_seconds": latency, "http_status": http_status,
                "error_code": (payload.get("error") or {}).get("code"), "wer": error_rate(expected, actual),
                "cer": error_rate(expected, actual, True), "important_term_recall": recall(case.get("important_terms", []), actual),
                "sentence_exact_match": normalize(expected) == normalize(actual),
                "medicine_recall": recall(case.get("expected_medicines", []), actual),
                "dosage_recall": recall(case.get("expected_dosages", []), actual),
                "test_name_recall": recall(case.get("expected_tests", []), actual),
                "number_preservation": recall(re.findall(r"\d+(?:\.\d+)?", expected), actual),
                "negation_preserved": recall(case.get("expected_negations", []), actual),
                "empty_transcript": success and not normalize(actual),
                "repeated_text_indicator": bool(re.search(r"\b(.{4,40}?)\b(?:\s+\1){2,}", normalize(actual))),
                "hallucination_indicator": not expected and bool(normalize(actual)),
                "status": "PASSED" if success else "FAILED",
            }
            results.append(result)
        except Exception as exc:
            results.append({"id": case["id"], "status": "FAILED", "reason": type(exc).__name__})

    measured = [item for item in results if item.get("status") == "PASSED"]
    def average(field: str) -> float | None:
        values = [float(item[field]) for item in measured if item.get(field) is not None]
        return statistics.fmean(values) if values else None
    latencies = [float(item["processing_duration_seconds"]) for item in measured]
    language_cases = [item for item in measured if item.get("language") not in {None, "auto", "hi-Latn"}]
    aggregate = {
        "total": len(results), "passed": sum(x["status"] == "PASSED" for x in results),
        "failed": sum(x["status"] == "FAILED" for x in results), "skipped": sum(x["status"] == "SKIPPED" for x in results),
        "average_wer": average("wer"), "median_wer": statistics.median([x["wer"] for x in measured if x.get("wer") is not None]) if any(x.get("wer") is not None for x in measured) else None,
        "average_cer": average("cer"), "important_term_recall": average("important_term_recall"),
        "sentence_exact_match_rate": average("sentence_exact_match"),
        "medicine_recall": average("medicine_recall"), "dosage_recall": average("dosage_recall"),
        "test_name_recall": average("test_name_recall"), "number_preservation": average("number_preservation"),
        "negation_preservation_rate": average("negation_preserved"),
        "language_detection_accuracy": (sum(x.get("detected_language") == x.get("language") for x in language_cases) / len(language_cases)) if language_cases else None,
        "empty_transcript_rate": (sum(bool(x.get("empty_transcript")) for x in measured) / len(measured)) if measured else None,
        "average_processing_seconds": statistics.fmean(latencies) if latencies else None,
        "median_processing_seconds": statistics.median(latencies) if latencies else None,
        "p95_processing_seconds": percentile(latencies, .95),
        "first_request_seconds": latencies[0] if latencies else None,
        "warm_request_average_seconds": statistics.fmean(latencies[1:]) if len(latencies)>1 else None,
        "failed_request_rate": (sum(x["status"] == "FAILED" for x in results) / len(results)) if results else None,
        "hallucination_rate": (sum(bool(x.get("hallucination_indicator")) for x in measured) / len(measured)) if measured else None,
        "repeated_text_rate": (sum(bool(x.get("repeated_text_indicator")) for x in measured) / len(measured)) if measured else None,
    }
    def grouped(field: str) -> dict[str, dict[str, float | int | None]]:
        groups={}
        for item in measured:
            key=str(item.get(field) or "unknown"); groups.setdefault(key,[]).append(item)
        return {key:{"count":len(items),"average_wer":statistics.fmean([x["wer"] for x in items if x.get("wer") is not None]) if any(x.get("wer") is not None for x in items) else None,"medical_recall":statistics.fmean([x["important_term_recall"] for x in items if x.get("important_term_recall") is not None]) if any(x.get("important_term_recall") is not None for x in items) else None,"average_latency":statistics.fmean([x["processing_duration_seconds"] for x in items])} for key,items in groups.items()}
    report = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "aggregate": aggregate,"per_language":grouped("language"),"per_category":grouped("category"), "results": results}
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "voice-benchmark.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    fields = sorted({key for item in results for key in item})
    with (output_dir / "voice-benchmark.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields); writer.writeheader()
        for item in results: writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v for k, v in item.items()})
    lines = ["# Voice Accuracy Benchmark", "", f"Status: {'BLOCKED' if not measured else 'COMPLETE'}", "", "## Aggregate", "", "```json", json.dumps(aggregate, indent=2), "```", "", "## Cases", "", "| ID | Status | HTTP | WER | Reason |", "|---|---:|---:|---:|---|"]
    lines += [f"| {x['id']} | {x['status']} | {x.get('http_status','')} | {x.get('wer','')} | {x.get('reason','')} |" for x in results]
    (output_dir / "voice-benchmark.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    history=output_dir/"history"; history.mkdir(exist_ok=True)
    stamp=time.strftime("%Y%m%dT%H%M%SZ",time.gmtime())
    shutil.copy2(output_dir/"voice-benchmark.json",history/f"voice-benchmark-{stamp}.json")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_REPORT_DIR)
    parser.add_argument("--base-url")
    parser.add_argument("--use-test-client", action="store_true")
    parser.add_argument("--api-key", default=os.getenv("INTERNAL_API_KEY"))
    parser.add_argument("--force-language", choices=["auto","en","hi","hi-Latn"])
    args = parser.parse_args()
    report = run(args.manifest.resolve(), args.output_dir.resolve(), EndpointClient(args.base_url, args.use_test_client, args.api_key),args.force_language)
    print(json.dumps(report["aggregate"], indent=2))
    if report["aggregate"]["failed"]:
        return 1
    return 0 if report["aggregate"]["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
