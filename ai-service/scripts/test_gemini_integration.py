"""Run bounded, synthetic-only Gemini checks through approved project endpoints."""
from __future__ import annotations
import json,os,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT)); REPORTS=ROOT/"test/consolidated/reports"

CASES=[
 ("summary-negation","/api/v1/generate-summary",{"transcript":"Patient reports fever and cough but denies chest pain. Diagnosis is not confirmed.","medical_entities":{"symptoms":["fever","cough"],"conditions":[]}}),
 ("prescription-allergy","/api/v1/generate-prescription",{"summary":"Patient reports fever, is allergic to penicillin, and no medicine dosage was provided.","medical_entities":{"allergies":["penicillin"]}}),
 ("diet-uncertainty","/api/v1/diet-recommendation",{"summary":"Patient may have migraine; diagnosis is not confirmed.","dietary_preference":"vegetarian"})]

def flatten(value):
    if isinstance(value,dict): return " ".join(flatten(v) for v in value.values())
    if isinstance(value,list): return " ".join(flatten(v) for v in value)
    return str(value)

def main()->int:
    from app.core.config import Settings
    settings=Settings(); configured=bool(settings.gemini_api_key and settings.gemini_api_key.get_secret_value().strip()); REPORTS.mkdir(parents=True,exist_ok=True)
    if not configured:
        report={"status":"BLOCKED","credential_detected":False,"real_requests":0,"mocked_requests":0,"results":[],"reason":"GEMINI_API_KEY is absent or empty"}
    else:
        os.environ["APP_ENV"]="testing"; from fastapi.testclient import TestClient; from app.main import app; rows=[]
        with TestClient(app) as client:
            for name,path,payload in CASES:
                started=time.perf_counter()
                try:
                    response=client.post(path,json=payload); body=response.json(); text=flatten(body.get("data") or {}).casefold()
                    rows.append({"id":name,"real":True,"http_status":response.status_code,"success":response.is_success,"latency_seconds":round(time.perf_counter()-started,3),"error_code":(body.get("error") or {}).get("code"),"schema_valid":response.is_success and isinstance(body.get("data"),dict),"negation_present":any(term in text for term in ("denies","denied","no chest pain","without chest pain")) if name=="summary-negation" else None,"doctor_review_present":bool((body.get("data") or {}).get("requires_doctor_review")) if name=="prescription-allergy" else None,"unsafe_cure_claim":any(term in text for term in ("cures","guaranteed cure"))})
                except Exception as exc: rows.append({"id":name,"real":True,"success":False,"error_code":type(exc).__name__})
        report={"status":"COMPLETE" if rows and all(x.get("success") for x in rows) else "FAIL","credential_detected":True,"real_requests":len(rows),"mocked_requests":0,"successful":sum(bool(x.get("success")) for x in rows),"results":rows}
    (REPORTS/"gemini-integration-results.json").write_text(json.dumps(report,indent=2),encoding="utf-8"); (REPORTS/"gemini-integration-results.md").write_text("# Gemini Integration\n\nStatus: "+report["status"]+"\n\nCredential detected: "+str(report["credential_detected"])+" (value never stored)\n\nReal requests: "+str(report["real_requests"])+"\n\n```json\n"+json.dumps(report.get("results",[]),indent=2)+"\n```\n",encoding="utf-8"); print(json.dumps({k:v for k,v in report.items() if k not in {"results"}},indent=2)); return 0 if report["status"]=="COMPLETE" else 2
if __name__=="__main__": raise SystemExit(main())
