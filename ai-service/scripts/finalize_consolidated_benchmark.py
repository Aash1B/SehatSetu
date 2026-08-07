"""Build local detailed and sanitized project reports from measured artifacts."""
from __future__ import annotations
import json, platform, shutil, subprocess, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; REPORTS=ROOT/"test/consolidated/reports"; PROJECT=ROOT/"reports/standalone-verification"
def read(name):
    path=REPORTS/name
    try:return json.loads(path.read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError):return {}
def pct(value): return "not measured" if value is None else f"{value*100:.2f}%"
def main():
    combined=read("../manifests/combined_benchmark_manifest.json")
    voice=read("voice-benchmark.json"); tuning=read("transcription-tuning.json"); ocr=read("ocr-benchmark.json"); gemini=read("gemini-integration-results.json"); extraction=read("medical-extraction-benchmark.json"); safety=read("generation-safety-benchmark.json")
    va=voice.get("aggregate",{}); oa=ocr.get("aggregate",{}); ea=extraction.get("aggregate",{})
    tracked=subprocess.run(["git","ls-files","test"],cwd=ROOT,capture_output=True,text=True).stdout.splitlines()
    staged=subprocess.run(["git","diff","--cached","--name-only","--","test"],cwd=ROOT,capture_output=True,text=True).stdout.splitlines()
    ignored=[]
    for i in range(1,6):
        rel=f"test/SehatSetu_Benchmark_Pack{i}"; p=subprocess.run(["git","check-ignore","-v",rel],cwd=ROOT,capture_output=True,text=True); ignored.append({"pack":i,"ignored":p.returncode==0,"rule":p.stdout.strip()})
    audio=json.loads((ROOT/"test/consolidated/manifests/generated_audio_manifest.json").read_text(encoding="utf-8")); ocrm=json.loads((ROOT/"test/consolidated/manifests/generated_ocr_manifest.json").read_text(encoding="utf-8")); validated=json.loads((ROOT/"test/consolidated/manifests/validated_expected_outputs_manifest.json").read_text(encoding="utf-8"))
    checks=[
      {"name":"pack-validation","status":"PASSED"},{"name":"json-validation","status":"PASSED" if not combined.get("invalid_json") else "FAILED"},
      {"name":"audio-decode","status":"PASSED"},{"name":"environment-app-health-openapi-ffmpeg","status":"PASSED"},
      {"name":"voice-benchmark","status":"PASSED" if va.get("passed") and not va.get("failed") else "FAILED"},
      {"name":"transcription-tuning","status":"PASSED" if tuning.get("status")=="COMPLETE" else "BLOCKED"},
      {"name":"ocr-benchmark","status":"BLOCKED","reason":"Gemini provider quota exhausted; 20/20 endpoint calls failed"},
      {"name":"gemini-integration","status":"BLOCKED","reason":"Credential detected, but provider quota exhausted; 0/3 succeeded"},
      {"name":"medical-extraction","status":"PASSED" if ea.get("cases") else "BLOCKED"},
      {"name":"generation-safety","status":safety.get("status","BLOCKED")},
      {"name":"full-pytest","status":"BLOCKED","reason":"ai-service/tests directory is absent; 0 tests collected"},
      {"name":"focused-endpoint-tests","status":"BLOCKED","reason":"named test files are absent"},
      {"name":"dashboard-tests","status":"BLOCKED","reason":"tests/test_evaluation_dashboard.py is absent"},
    ]
    counts={s:sum(x["status"]==s for x in checks) for s in ("PASSED","FAILED","SKIPPED","BLOCKED","MOCKED")}
    report={"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"overall_status":"PARTIAL","environment":{"python":platform.python_version(),"ffmpeg":True,"ffprobe":True,"whisper":"ready: faster-whisper tiny","ocr":"blocked: provider quota","gemini_credential_present":bool(gemini.get("credential_detected"))},"packs":combined.get("packs",[]),"git":{"all_packs_ignored":all(x["ignored"] for x in ignored),"ignore_checks":ignored,"tracked_test_files":tracked,"staged_test_files":staged},"merge":{"copied":len(combined.get("copied_files",[])),"conflicts":combined.get("conflicts",[]),"invalid_json":combined.get("invalid_json",[])},"datasets":{"valid_voice":combined.get("counts",{}).get("voice"),"valid_ocr":combined.get("counts",{}).get("ocr"),"placeholder_expected_files":len(validated.get("placeholder_issues",[])),"generated_audio":len(audio.get("cases",[])),"unsupported_tts":len(audio.get("unsupported_language_cases",[])),"generated_ocr":len(ocrm.get("documents",[]))},"voice":va,"tuning":{"status":tuning.get("status"),"label":tuning.get("label"),"recommended_configuration":tuning.get("recommended_configuration"),"recommended_env":tuning.get("recommended_env")},"ocr":{"status":"BLOCKED","aggregate":oa},"gemini":{"status":"BLOCKED","real_requests":gemini.get("real_requests"),"successful":gemini.get("successful")},"medical_extraction":ea,"generation_safety":safety,"test_results":{"executed":0,"passed":0,"failed":0,"blocked_suites":3,"reason":"Project test sources absent"},"counts":counts,"checks":checks,"scope":{"nestjs_modified":False,"frontend_modified":False,"deployment_work":False,"commit_created":False,"pushed":False}}
    REPORTS.mkdir(parents=True,exist_ok=True); (REPORTS/"final-benchmark.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    lines=["# Sehat-Setu Final Benchmark Report","","Overall status: **PARTIAL** — local voice and extraction evaluation completed; OCR/Gemini and automated suites are blocked.","","## Data and Git safety","",f"- Five packs discovered; all ignored by `/test/`: {report['git']['all_packs_ignored']}",f"- Files staged under `test/`: {len(staged)}; tracked under `test/`: {len(tracked)}",f"- Merge conflicts: {len(report['merge']['conflicts'])}; invalid JSON: {len(report['merge']['invalid_json'])}",f"- Placeholder expected-output files excluded from exact scoring: {report['datasets']['placeholder_expected_files']}","","## Generated fixtures","",f"- Synthetic audio variants: {report['datasets']['generated_audio']} (unsupported Hindi-script TTS: {report['datasets']['unsupported_tts']})",f"- Synthetic rendered OCR benchmark documents: {report['datasets']['generated_ocr']}","","## Voice benchmark — synthetic TTS","",f"- Requests: {va.get('passed',0)}/{va.get('total',0)} passed; WER {pct(va.get('average_wer'))}; CER {pct(va.get('average_cer'))}",f"- Medical terms {pct(va.get('important_term_recall'))}; medicines {pct(va.get('medicine_recall'))}; dosage {pct(va.get('dosage_recall'))}; negation {pct(va.get('negation_preservation_rate'))}",f"- Language accuracy {pct(va.get('language_detection_accuracy'))}; p95 latency {va.get('p95_processing_seconds','not measured')} s",f"- Provisional best configuration: `{tuning.get('recommended_configuration') or 'not measured'}`",f"- Label: {tuning.get('label','not measured')}","","## OCR and Gemini","",f"- OCR: BLOCKED — 0/20 succeeded because the configured Gemini quota returned 429; accuracy is not measured.",f"- Gemini: BLOCKED — {gemini.get('successful',0)}/{gemini.get('real_requests',0)} real requests succeeded because quota was exhausted.","","## Medical extraction and generation safety","",f"- Scorable extraction cases: {ea.get('cases',0)}; symptom recall {pct(ea.get('symptom_recall'))}; condition recall {pct(ea.get('condition_recall'))}; medicine recall {pct(ea.get('medicine_recall'))}; dosage recall {pct(ea.get('dosage_recall'))}; negation {pct(ea.get('negation_preservation'))}.","- Generation safety: BLOCKED; no successful real provider output was available for scoring.","","## Automated tests and readiness","","- App import, health, OpenAPI, environment, FFmpeg, ffprobe, audio decoding: PASSED.","- Pytest: BLOCKED; `ai-service/tests/` is absent, so 0 tests were collected and no prior counts were reused.",f"- Check totals: {counts}","","## Limitations and scope","","- Synthetic TTS is not representative of real human English/Hindi/Hinglish speech.","- Native Hindi TTS is unavailable; non-native Hinglish is reported separately.","- OCR and generation require a provider quota reset or billing capacity before rerun.","- Real human recordings and manual OCR documents remain future work.","- No NestJS, frontend, deployment, Git staging, commit, or push work was performed.",""]
    (REPORTS/"FINAL_BENCHMARK_REPORT.md").write_text("\n".join(lines),encoding="utf-8")
    PROJECT.mkdir(parents=True,exist_ok=True); sanitized=[x for x in lines if "transcript" not in x.casefold()]
    (PROJECT/"FINAL_STANDALONE_VERIFICATION_REPORT.md").write_text("\n".join(sanitized),encoding="utf-8")
    print(json.dumps({"status":"PARTIAL","counts":counts,"report":str(REPORTS/"FINAL_BENCHMARK_REPORT.md")},indent=2)); return 0
if __name__=="__main__": raise SystemExit(main())
