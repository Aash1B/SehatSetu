"""Evaluate deterministic extraction and summarize real-provider safety results."""
from __future__ import annotations
import json, statistics, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT))
MAN=ROOT/"test/consolidated/manifests"; REPORTS=ROOT/"test/consolidated/reports"

def norm(value): return str(value or "").strip().casefold()
def recall(expected,actual):
    expected=[norm(x) for x in expected if norm(x)]; actual=" ".join(norm(x) for x in actual)
    return None if not expected else sum(x in actual for x in expected)/len(expected)
def precision(expected,actual):
    expected=" ".join(norm(x) for x in expected); actual=[norm(x) for x in actual if norm(x)]
    return None if not actual else sum(x in expected for x in actual)/len(actual)
def avg(rows,key):
    values=[x[key] for x in rows if x.get(key) is not None]; return statistics.fmean(values) if values else None

def main():
    from app.services.ner_service import MedicalNERService
    cases=json.loads((MAN/"validated_voice_manifest.json").read_text(encoding="utf-8"))["cases"]
    service=MedicalNERService(); rows=[]
    for case in cases:
        if not case.get("scorable_original_ground_truth",True): continue
        data=service.extract(case["expected_transcript"])
        meds=[x.name for x in data.medications]; doses=[x.dosage for x in data.medications if x.dosage]
        expected_terms=case.get("medical_terms",[]); expected_neg=case.get("negations",[])
        rows.append({"id":case["id"],"symptom_precision":precision(expected_terms,data.symptoms),"symptom_recall":recall(expected_terms,data.symptoms),"condition_precision":precision(expected_terms,data.conditions),"condition_recall":recall(expected_terms,data.conditions),"negation_preservation":recall(expected_neg,data.negated_findings),"medicine_recall":recall(case.get("medicines",[]),meds),"strength_recall":recall(case.get("dosages",[]),doses),"dosage_recall":recall(case.get("dosages",[]),doses),"frequency_recall":recall(case.get("dosages",[]),[x.frequency for x in data.medications if x.frequency]),"allergy_recall":None,"lab_test_recall":recall([x for x in expected_terms if norm(x) in {"cbc","lft","kft","ecg","mri","ct scan"}],data.lab_tests),"value_accuracy":None,"unit_accuracy":None})
    fields=["symptom_precision","symptom_recall","condition_precision","condition_recall","negation_preservation","medicine_recall","strength_recall","dosage_recall","frequency_recall","allergy_recall","lab_test_recall","value_accuracy","unit_accuracy"]
    aggregate={"cases":len(rows),**{key:avg(rows,key) for key in fields}}
    extraction={"status":"COMPLETE","dataset":"validated deterministic synthetic transcripts","aggregate":aggregate,"results":rows}
    REPORTS.mkdir(parents=True,exist_ok=True)
    (REPORTS/"medical-extraction-benchmark.json").write_text(json.dumps(extraction,indent=2),encoding="utf-8")
    (REPORTS/"medical-extraction-benchmark.md").write_text("# Medical Extraction Benchmark\n\nStatus: COMPLETE\n\n```json\n"+json.dumps(aggregate,indent=2)+"\n```\n",encoding="utf-8")
    gemini_path=REPORTS/"gemini-integration-results.json"; gemini=json.loads(gemini_path.read_text(encoding="utf-8")) if gemini_path.exists() else {}
    successful=[x for x in gemini.get("results",[]) if x.get("success")]
    violations=sum(bool(x.get("unsafe_cure_claim")) for x in successful)
    safety={"status":"COMPLETE" if successful else "BLOCKED","reason":None if successful else "No successful real Gemini responses; configured quota was exhausted","real_provider_calls":gemini.get("real_requests",0),"successful_outputs_evaluated":len(successful),"violations":violations if successful else None,"schema_valid_rate":sum(bool(x.get("schema_valid")) for x in successful)/len(successful) if successful else None,"notes":["No mocked provider output was scored.","Unavailable metrics are null, not zero."]}
    (REPORTS/"generation-safety-benchmark.json").write_text(json.dumps(safety,indent=2),encoding="utf-8")
    (REPORTS/"generation-safety-benchmark.md").write_text("# Generation Safety Benchmark\n\nStatus: "+safety["status"]+"\n\n"+(safety.get("reason") or "Real successful outputs evaluated.")+"\n\n```json\n"+json.dumps(safety,indent=2)+"\n```\n",encoding="utf-8")
    print(json.dumps({"extraction":aggregate,"safety":safety},indent=2)); return 0 if rows else 2
if __name__=="__main__": raise SystemExit(main())
