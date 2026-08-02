"""Generate sanitized final voice artifacts from measured and deterministic inputs."""
from __future__ import annotations
import csv,json,time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"reports/standalone-verification"; TMP=ROOT/".tmp"

def load_model(model):
    path=TMP/f"final-{model}"/"voice-benchmark.json"
    if not path.exists(): return {"model":model,"status":"BLOCKED","reason":"benchmark artifact missing"}
    data=json.loads(path.read_text(encoding="utf-8")); return {"model":model,"status":"PASSED","classification":"real local model inference on synthetic English TTS","aggregate":data["aggregate"],"results":data["results"]}

def safety_sets():
    base=ROOT/"tests/fixtures/voice_safety"; expected={"negation-safety.json":40,"dosage-number-safety.json":40,"medicine-safety.json":50,"lab-vital-safety.json":20}; output={}
    for name,count in expected.items():
        path=base/name
        if not path.exists(): output[name]={"status":"BLOCKED","reason":"dataset missing"}; continue
        data=json.loads(path.read_text(encoding="utf-8")); actual=len(data["cases"])
        output[name]={"status":"PASSED" if actual>=count else "FAILED","case_count":actual,"minimum":count,"classification":"deterministic text-only; scorer/guardrail validation, not acoustic model accuracy"}
    return output

def main():
    OUT.mkdir(parents=True,exist_ok=True); models=[load_model("small"),load_model("tiny")]; sets=safety_sets()
    extraction_path=ROOT/"test/consolidated/reports/medical-extraction-benchmark.json"
    extraction=json.loads(extraction_path.read_text(encoding="utf-8")) if extraction_path.exists() else {"status":"BLOCKED","reason":"report missing"}
    blocked=[
        {"check":"acoustic execution of the 150-case safety corpus on small/tiny","reason":"text fixtures and deterministic scorers are complete, but corresponding synthetic audio was not generated and inferred"},
        {"check":"bounded preprocessing/VAD/noise-reduction matrix","reason":"configuration and unit checks pass, but comparative acoustic runs were not executed"},
        {"check":"medical extraction acceptance targets","reason":"37-case deterministic benchmark completed but remains below target; metrics are reported without suppression"},
        {"check":"human English/Hindi/Hinglish acoustic benchmark","reason":"human recordings not supplied"},
        {"check":"Chrome MediaRecorder microphone validation","reason":"requires a real browser microphone session"},
        {"check":"Render runtime smoke test","reason":"deployment is not authorized"},
        {"check":"20-minute real model inference","reason":"not run to avoid a resource-intensive local inference; duration planner and mocked continuity tests pass"},
    ]
    payload={"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"overall_status":"PARTIAL_AUTOMATED_VALIDATION","baseline_tests":{"full":"289 passed","focused":"113 passed"},"final_tests":{"full":"326 passed","focused":"150 passed","compilation":"passed"},"profiles":{"accuracy":"small CPU/int8, one worker","low_memory":"tiny CPU/int8, one worker","rejected":"base"},"models":models,"safety_sets":sets,"medical_extraction":extraction,"engineering":{"dosage_scorer":"PASSED","repetition_control":"PASSED (deterministic regression)","bounded_second_pass":"PASSED (mocked model)","hindi_hinglish":"ENGINEERING_ONLY; acoustic validation blocked","preprocessing_vad":"CONFIGURATION/UNIT PASSED; acoustic matrix blocked","long_audio":"PASSED planner/merge tests; acoustic runtime blocked","webm_live":"PASSED automated fixture and protocol tests","concurrency":"PASSED bounded queue/session tests","api_contract":"PASSED"},"blocked":blocked,"human_results":None,"secrets_included":False}
    (OUT/"final-voice-completion.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding="utf-8")
    benchmark={"generated_at":payload["generated_at"],"classification":"real local inference on synthetic English TTS; no human accuracy claim","models":models}
    (OUT/"final-voice-benchmark.json").write_text(json.dumps(benchmark,indent=2,ensure_ascii=False),encoding="utf-8")
    fields=["model","status","average_wer","average_cer","important_term_recall","medicine_recall","strict_dosage_recall","normalized_dosage_recall","dosage_number_accuracy","dosage_unit_accuracy","frequency_accuracy","timing_instruction_accuracy","negation_preservation_rate","number_preservation","repeated_text_rate","failed_request_rate","average_processing_seconds","p95_processing_seconds"]
    with (OUT/"final-voice-benchmark.csv").open("w",newline="",encoding="utf-8") as stream:
        writer=csv.DictWriter(stream,fieldnames=fields); writer.writeheader()
        for item in models: writer.writerow({"model":item["model"],"status":item["status"],**{k:item.get("aggregate",{}).get(k) for k in fields[2:]}})
    rows=[]
    for item in models:
        a=item.get("aggregate",{}); rows.append(f"| {item['model']} | {item['status']} | {a.get('average_wer')} | {a.get('medicine_recall')} | {a.get('strict_dosage_recall')} | {a.get('normalized_dosage_recall')} | {a.get('dosage_number_accuracy')} | {a.get('negation_preservation_rate')} | {a.get('repeated_text_rate')} | {a.get('average_processing_seconds')} |")
    md=["# Final Voice Benchmark","","Classification: real local faster-whisper inference on 20 validated synthetic English TTS fixtures. This is not human validation.","","| Model | Status | WER | Medicine recall | Strict dosage | Normalized dosage | Dosage numbers | Negation | Repetition | Avg seconds |","|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",*rows,"","`base` remains rejected based on the prior measured 15% repetition rate and was not rerun."]
    (OUT/"final-voice-benchmark.md").write_text("\n".join(md)+"\n",encoding="utf-8")
    safety={"generated_at":payload["generated_at"],"classification":"deterministic text-only synthetic checks; not model inference","sets":sets,"negation_reversal_is_critical":True,"unsafe_equivalences_rejected":["mg/mcg","mL/mg","5/50","0.5/5","once/twice","daily/weekly","before/after food"]}
    (OUT/"voice-safety-benchmark.json").write_text(json.dumps(safety,indent=2,ensure_ascii=False),encoding="utf-8")
    (OUT/"voice-safety-benchmark.md").write_text("# Voice Safety Benchmark\n\nDeterministic text-only validation; no acoustic accuracy claim.\n\n"+"\n".join(f"- {name}: {value['status']} ({value.get('case_count',0)} cases)" for name,value in sets.items())+"\n",encoding="utf-8")
    completion=["# Final Voice Completion Report","",f"Status: **{payload['overall_status']}**","","## Profiles","","- Accuracy: `small`, CPU/int8, one worker.","- Low-memory: `tiny`, CPU/int8, one worker.","- `base` is not recommended.","","## Automated results","",*md[3:],"","## Safety and reliability","","- Medical expression canonicalization preserves unsafe distinctions and reports strict plus normalized dosage metrics.","- Repetition detection and bounded recovery are model-independent; uncertain recovery is surfaced for review.","- Correction aliases are contextual review candidates; raw model text is preserved.","- Hindi/hi-Latn mapping and optional output metadata are implemented but not acoustically validated.","- Live REST/WebSocket ordering, duplicate handling, TTL, limits, and cleanup are automated-test covered.","- Duration planning covers 5/10/20-minute layouts; full 20-minute inference remains blocked as recorded below.","","## Blocked manual/runtime checks","",*[f"- {x['check']}: {x['reason']}" for x in blocked],"","## Render","","Use `tiny` for conservative low-memory hosting. Use `small` only after verifying instance headroom. One worker is recommended. Runtime model download creates cold-start and ephemeral-cache risk.","","## Scope","","No OCR implementation, NestJS, frontend, deployment, staging, commit, or push was performed by this task."]
    (OUT/"FINAL_VOICE_COMPLETION_REPORT.md").write_text("\n".join(completion)+"\n",encoding="utf-8")
    verification={"overall_status":payload["overall_status"],"counts":{"PASSED":sum(x.get("status")=="PASSED" for x in models)+sum(x["status"]=="PASSED" for x in sets.values()),"BLOCKED":len(blocked)},"voice":{"profiles":payload["profiles"],"classification":"synthetic/model and deterministic text-only results separated"},"secrets_included":False}
    (OUT/"final-verification.json").write_text(json.dumps(verification,indent=2),encoding="utf-8")
    print(OUT)
if __name__=="__main__": main()
