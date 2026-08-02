"""Run final small/tiny endpoint benchmarks on the validated English fixtures."""
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT))
SOURCE=ROOT/"tests/fixtures/voice_dataset_manifest.json"
REPORTS=ROOT/"reports/standalone-verification"

def validated_manifest() -> tuple[dict,list[dict]]:
    source=json.loads(SOURCE.read_text(encoding="utf-8")); kept=[]; excluded=[]
    for case in source["cases"]:
        path=SOURCE.parent/case["file"]; reasons=[]
        if not path.is_file(): reasons.append("missing fixture")
        if not case.get("expected_transcript"): reasons.append("missing exact transcript")
        if case.get("synthetic_content") is not True or case.get("contains_patient_data") is not False: reasons.append("unsafe metadata")
        if case.get("language") in {"hi","hi-Latn"} and str(case.get("tts_culture","")).startswith("en-"): reasons.append("unsupported-language TTS")
        if reasons: excluded.append({"id":case["id"],"reason":"; ".join(reasons)})
        else: kept.append(case)
    return {**source,"cases":kept},excluded

def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument("--models",nargs="+",choices=("small","tiny"),default=("small","tiny")); args=parser.parse_args()
    fixed,excluded=validated_manifest(); temp=SOURCE.parent/".final-voice-manifest.json"; temp.write_text(json.dumps(fixed),encoding="utf-8")
    results=[]
    try:
        for model in args.models:
            env=os.environ.copy(); env.update({"APP_ENV":"testing","WHISPER_MODEL_SIZE":model,"WHISPER_DEVICE":"cpu","WHISPER_COMPUTE_TYPE":"int8","AUDIO_CHUNK_DURATION_SECONDS":"20","AUDIO_CHUNK_OVERLAP_SECONDS":"2","TRANSCRIPTION_MAX_CONCURRENT_REQUESTS":"1"})
            command=[sys.executable,"-c",("import json,sys; from pathlib import Path; sys.path.insert(0,'.'); from scripts.benchmark_voice_accuracy import EndpointClient,run; "
                f"r=run(Path(r'{temp}'),Path(r'{ROOT/'.tmp'/('final-'+model)}'),EndpointClient(None,True,None),'auto'); print(json.dumps(r['aggregate']))")]
            import subprocess
            started=time.perf_counter(); completed=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,timeout=1800)
            worker=ROOT/".tmp"/f"final-{model}"/"voice-benchmark.json"
            if completed.returncode==0 and worker.exists():
                report=json.loads(worker.read_text(encoding="utf-8")); results.append({"model":model,"status":"PASSED","duration_seconds":time.perf_counter()-started,"aggregate":report["aggregate"],"results":report["results"]})
            else: results.append({"model":model,"status":"BLOCKED","reason":(completed.stderr or completed.stdout)[-2000:]})
    finally: temp.unlink(missing_ok=True)
    REPORTS.mkdir(parents=True,exist_ok=True)
    payload={"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"classification":"synthetic English TTS only","manifest":"tests/fixtures/voice_dataset_manifest.json","scorable_cases":len(fixed["cases"]),"excluded":excluded,"models":results}
    (REPORTS/"final-voice-benchmark.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps([{"model":x["model"],"status":x["status"],**x.get("aggregate",{})} for x in results],indent=2))
    return 0 if all(x["status"]=="PASSED" for x in results) else 2
if __name__=="__main__": raise SystemExit(main())
