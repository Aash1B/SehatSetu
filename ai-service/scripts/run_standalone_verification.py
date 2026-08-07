"""Run or reuse consolidated local-only standalone benchmark checks."""
from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; REPORTS=ROOT/"test/consolidated/reports"; MAN=ROOT/"test/consolidated/manifests"
def run(command, required=True):
    result=subprocess.run(command,cwd=ROOT)
    if result.returncode and required: raise SystemExit(result.returncode)
    return result.returncode
def main():
    parser=argparse.ArgumentParser(); group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--fast",action="store_true"); group.add_argument("--integration",action="store_true"); group.add_argument("--full",action="store_true")
    parser.add_argument("--rerun-benchmarks",action="store_true",help="Rerun expensive voice/OCR/Gemini calls instead of reusing reports")
    args=parser.parse_args(); py=sys.executable; REPORTS.mkdir(parents=True,exist_ok=True)
    run([py,"scripts/consolidate_benchmark_packs.py"]); run([py,"scripts/validate_environment.py"])
    run([py,"-c","from fastapi.testclient import TestClient; from app.main import app; c=TestClient(app); assert c.get('/health').status_code==200; assert c.get('/openapi.json').status_code==200"])
    if args.integration or args.full:
        tests=ROOT/"tests"
        if tests.is_dir(): run([py,"-m","pytest","-q"])
        else: print("BLOCKED: ai-service/tests is absent; no pytest results fabricated")
    if args.full:
        run([py,"scripts/generate_consolidated_audio.py"]); run([py,"scripts/generate_consolidated_ocr.py"])
        if args.rerun_benchmarks or not (REPORTS/"voice-benchmark.json").exists():
            run([py,"scripts/benchmark_voice_accuracy.py","--manifest",str(MAN/"generated_audio_manifest.json"),"--output-dir",str(REPORTS),"--use-test-client"],False)
        if args.rerun_benchmarks or not (REPORTS/"transcription-tuning.json").exists():
            run([py,"scripts/tune_transcription_settings.py","--manifest",str(MAN/"generated_audio_manifest.json"),"--output-dir",str(REPORTS),"--use-test-client"],False)
        if args.rerun_benchmarks or not (REPORTS/"ocr-benchmark.json").exists():
            run([py,"scripts/benchmark_ocr_accuracy.py","--manifest",str(MAN/"generated_ocr_manifest.json"),"--output-dir",str(REPORTS),"--use-test-client","--request-delay","0"],False)
        if args.rerun_benchmarks or not (REPORTS/"gemini-integration-results.json").exists(): run([py,"scripts/test_gemini_integration.py"],False)
        run([py,"scripts/benchmark_extraction_and_safety.py"]); run([py,"scripts/finalize_consolidated_benchmark.py"]); run([py,"evaluation_dashboard/app.py"])
    final=REPORTS/"final-benchmark.json"
    if final.exists(): print(json.dumps(json.loads(final.read_text(encoding="utf-8")).get("counts",{}),indent=2))
    return 0
if __name__=="__main__": raise SystemExit(main())
