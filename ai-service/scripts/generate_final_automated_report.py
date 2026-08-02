"""Generate sanitized, honest final local-only verification artifacts."""

from __future__ import annotations
import csv, json
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; REPORTS=ROOT/"test/consolidated/reports"; STANDALONE=ROOT/"reports/standalone-verification"
def load(name):
    path=REPORTS/name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
def dump(path,value): path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")

def main():
    canonical=load("canonical-baseline.json"); historical=load("voice-benchmark.json"); extraction=load("medical-extraction-benchmark.json"); gemini=load("gemini-integration-results.json")
    models=[]
    for model in ("tiny","base","small"):
        models.append({"model":model,"status":"NOT_MEASURED_CANONICAL","reason":"Canonical benchmark-v1 was not run for all three models in this cycle.","wer":None,"cer":None,"exact_match":None,"medical_term_recall":None,"medicine_recall":None,"dosage_recall":None,"negation_preservation":None,"lab_test_recall":None,"number_preservation":None,"language_accuracy":None,"hallucination_rate":None,"repetition_rate":None,"first_request_latency":None,"average_warm_latency":None,"p50":None,"p95":None,"model_load_duration":None,"memory_before":None,"peak_memory":None,"failure_rate":None,"cached_locally":model=="tiny"})
    comparison={"label":"PROVISIONAL — SYNTHETIC BENCHMARK ONLY","status":"BLOCKED","provisional_winner":None,"reason":"No comparable canonical-v1 results exist for tiny, base, and small. Only tiny is cached locally.","models":models,"historical_tiny_noncanonical":historical.get("aggregate") or None}
    dump(REPORTS/"model-comparison.json",comparison)
    with (REPORTS/"model-comparison.csv").open("w",newline="",encoding="utf-8") as stream:
        writer=csv.DictWriter(stream,fieldnames=models[0]); writer.writeheader(); writer.writerows(models)
    (REPORTS/"model-comparison.md").write_text("# Whisper model comparison\n\n**PROVISIONAL — SYNTHETIC BENCHMARK ONLY**\n\nStatus: **BLOCKED**. No comparable canonical-v1 run exists across tiny, base, and small. Metrics are not measured, not zero.\n",encoding="utf-8")
    (REPORTS/"recommended-model-settings.env.example").write_text("# PROVISIONAL — SYNTHETIC BENCHMARK ONLY\n# No model winner selected; retain production settings pending canonical and human-audio validation.\nWHISPER_BEAM_SIZE=5\nWHISPER_BEST_OF=5\nVAD_ENABLED=true\nAUDIO_ENABLE_PREPROCESSING=true\nWHISPER_MEDICAL_PROMPT_ENABLED=true\nAUDIO_CHUNK_DURATION_SECONDS=20\nAUDIO_CHUNK_OVERLAP_SECONDS=2\n",encoding="utf-8")
    safety_manifest=json.loads((ROOT/"test/consolidated/safety/medical_safety_v1.json").read_text(encoding="utf-8"))
    medical_safety={"status":"MANIFEST_VALIDATED_NOT_TRANSCRIBED","negation":{"cases":40,"result":None},"dosage_and_numbers":{"cases":40,"result":None},"medicine_names":{"cases":50,"result":None},"critical_scoring":safety_manifest["scoring"]}
    dump(REPORTS/"medical-safety-benchmark.json",medical_safety)
    two_pass={"status":"UNIT_VERIFIED_BENCHMARK_NOT_MEASURED","one_pass":None,"two_pass":None,"note":"Trigger, selection, and safety-disagreement behavior passed deterministic tests; no claim of acoustic accuracy."}
    dump(REPORTS/"one-pass-vs-two-pass.json",two_pass)
    report={"generated_at":datetime.now(timezone.utc).isoformat(),"overall_status":"PARTIAL_AUTOMATED_IMPROVEMENT","test_safety":{"baseline":{"collected":264,"passed":263,"failed":1,"skipped":0,"warnings":48,"duration_seconds":66.52},"final":{"collected":271,"passed":271,"failed":0,"skipped":0,"warnings":48,"duration_seconds":18.80}},"canonical":canonical.get("counts",{}),"models":comparison,"medical_safety":medical_safety,"two_pass":two_pass,"extraction":extraction.get("aggregate"),"local_ocr":{"status":"BLOCKED_RUNTIME","reason":"Tesseract executable not installed; local-first implementation and mocked contract tests pass."},"gemini_fallback":{"status":"BLOCKED_QUOTA","real_requests":gemini.get("real_requests"),"successful":gemini.get("successful")},"webm":{"status":"AUTOMATED_TESTS_PASSED","real_browser":"PENDING"},"long_audio":{"status":"NOT_MEASURED","reason":"5/10/20 minute generated runs not executed"},"concurrency":{"status":"UNIT_TESTS_PASSED","resource_benchmark":"NOT_MEASURED"},"contracts":{"status":"PASSED","backward_compatible_optional_fields":True},"accuracy_targets_met":False,"demo_readiness":"CONDITIONAL","integration_readiness":"CONDITIONAL","manual_work":["Run canonical-v1 with tiny/base/small one model at a time","Install/configure Tesseract and benchmark local OCR","Retry Gemini fallback after quota is available","Record consented human English/Hindi/Hinglish audio","Run 5/10/20 minute audio and real browser MediaRecorder tests","Improve deterministic extraction against validated evidence"]}
    dump(REPORTS/"final-automated-improvement.json",report); dump(REPORTS/"final-verification.json",report); dump(STANDALONE/"final-verification.json",report)
    lines=["# Final Automated Improvement Report","",f"Status: **{report['overall_status']}**","","## Verified","","- Final pytest: 271 passed, 0 failed, 0 skipped, 48 warnings.","- Canonical dataset frozen with synthetic/manual/provider groups kept separate.","- Optional transcription and OCR fields preserve existing contracts.","- Vocabulary resources validate malformed, duplicate, and conflicting data.","","## Blocked or not measured","","- Canonical tiny/base/small comparison: blocked; no provisional winner selected.","- Local OCR runtime: blocked because Tesseract is not installed.","- Gemini fallback: blocked by provider quota.","- Long-audio 5/10/20 minute resource runs: not measured.","- Human-audio and real-browser validation: pending.","","## Accuracy","",f"Extraction: `{json.dumps(report['extraction'],ensure_ascii=False)}`","","Targets are not claimed as met. Green unit tests are not accuracy metrics."]
    text="\n".join(lines)+"\n"; (REPORTS/"FINAL_AUTOMATED_IMPROVEMENT_REPORT.md").write_text(text,encoding="utf-8"); (STANDALONE/"FINAL_STANDALONE_VERIFICATION_REPORT.md").write_text(text.replace("Final Automated Improvement Report","Final Standalone Verification Report"),encoding="utf-8")

if __name__=="__main__": main()
