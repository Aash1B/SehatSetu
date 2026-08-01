"""Consent-gated real OCR benchmark using the existing approved endpoint."""
from __future__ import annotations
import argparse,csv,json,re,sys,time,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT)); REPORTS=ROOT/"reports/standalone-verification"

def norm(s:str)->str: return " ".join(re.sub(r"[^\w\s]"," ",unicodedata.normalize("NFKC",s).casefold()).split())
def distance(a:list[str],b:list[str])->int:
    p=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        c=[i]
        for j,y in enumerate(b,1): c.append(min(c[-1]+1,p[j]+1,p[j-1]+(x!=y)))
        p=c
    return p[-1]
def recall(items:list[str],text:str): return None if not items else sum(norm(x) in norm(text) for x in items)/len(items)

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument("--manifest",type=Path,default=ROOT/"tests/fixtures/ocr/ocr_dataset_manifest.json"); ap.add_argument("--output-dir",type=Path,default=REPORTS); ap.add_argument("--base-url"); ap.add_argument("--use-test-client",action="store_true"); ap.add_argument("--request-delay",type=float,default=13.0); args=ap.parse_args(); manifest=json.loads(args.manifest.read_text(encoding="utf-8")); rows=[]
    if args.use_test_client:
        import os; os.environ["APP_ENV"]="testing"; from fastapi.testclient import TestClient; from app.main import app; client=TestClient(app); url="/api/v1/ocr/analyze"
    else:
        import httpx; client=httpx.Client(timeout=180); url=(args.base_url or "http://127.0.0.1:8000").rstrip("/")+"/api/v1/ocr/analyze"
    for case in manifest["documents"]:
        path=args.manifest.parent/case["file"]
        safety=case.get("consented") is True and case.get("anonymized") is True and case.get("contains_patient_data") is False and bool(str(case.get("expected_text","")).strip())
        if not safety: rows.append({"id":case["id"],"status":"SKIPPED","reason":"consent/anonymization/expected-text gate rejected entry"}); continue
        if not path.is_file(): rows.append({"id":case["id"],"status":"SKIPPED" if case.get("optional") else "FAILED","reason":"fixture missing"}); continue
        started=time.perf_counter()
        with path.open("rb") as f: response=client.post(url,files={"file":(path.name,f)},data={"language":"auto","include_summary":"false","include_medical_analysis":"false"})
        data=response.json().get("data") or {}; actual=data.get("raw_ocr_text") or data.get("extracted_text") or ""; expected=case["expected_text"]; words=norm(expected).split()
        rows.append({"id":case["id"],"document_type":case["document_type"],"visual_condition":case.get("visual_condition"),"file_type":case.get("file_type"),"multi_page":case.get("id")=="LAB010","status":"PASSED" if response.is_success else "FAILED","http_status":response.status_code,"text_error_rate":distance(words,norm(actual).split())/len(words),"important_field_recall":recall(case.get("important_fields",[]),actual),"medicine_recall":recall(case.get("expected_medicines",[]),actual),"dosage_recall":recall(case.get("expected_dosages",[]),actual),"lab_test_recall":recall(case.get("expected_lab_tests",[]),actual),"numeric_value_accuracy":recall(case.get("expected_lab_values",[]),actual),"unit_accuracy":recall(case.get("expected_units",[]),actual),"empty_extraction":not bool(norm(actual)),"page_failures":sum(not p.get("extracted_text","").strip() for p in data.get("pages",[])),"latency_seconds":time.perf_counter()-started})
        if args.request_delay and case is not manifest["documents"][-1]: time.sleep(args.request_delay)
    measured=[x for x in rows if x["status"]=="PASSED"]
    def avg(field):
        values=[x[field] for x in measured if x.get(field) is not None]; return sum(values)/len(values) if values else None
    lats=sorted(x["latency_seconds"] for x in measured); p95=lats[min(len(lats)-1,int(.95*len(lats)))] if lats else None
    groups={};
    for name,pred in {"clean":lambda x:x.get("visual_condition")=="clean","rotated":lambda x:x.get("visual_condition")=="rotated","low_contrast":lambda x:x.get("visual_condition")=="low_contrast","blurred":lambda x:x.get("visual_condition")=="blurred","pdf":lambda x:x.get("file_type")=="pdf"}.items():
        subset=[x for x in measured if pred(x)]; groups[name]={"documents":len(subset),"success_rate":len(subset)/max(1,sum(pred(x) for x in rows))}
    report={"status":"COMPLETE" if measured and not any(x["status"]=="FAILED" for x in rows) else ("PARTIAL" if measured else "BLOCKED"),"dataset_label":"synthetic rendered OCR benchmark documents","aggregate":{"documents":len(rows),"passed":len(measured),"failed":sum(x["status"]=="FAILED" for x in rows),"skipped":sum(x["status"]=="SKIPPED" for x in rows),"prescriptions":sum(x.get("document_type")=="prescription" for x in measured),"lab_reports":sum(x.get("document_type")=="lab-report" for x in measured),"ocr_similarity":None if avg("text_error_rate") is None else max(0,1-avg("text_error_rate")),"important_field_recall":avg("important_field_recall"),"medicine_recall":avg("medicine_recall"),"dosage_recall":avg("dosage_recall"),"lab_test_recall":avg("lab_test_recall"),"numeric_value_accuracy":avg("numeric_value_accuracy"),"unit_accuracy":avg("unit_accuracy"),"empty_extraction_rate":avg("empty_extraction"),"average_latency_seconds":avg("latency_seconds"),"p95_latency_seconds":p95,"page_failure_rate":sum(x.get("page_failures",0) for x in measured)/max(1,sum(1 for x in measured)),"groups":groups},"results":rows}; reports=args.output_dir; reports.mkdir(parents=True,exist_ok=True); (reports/"ocr-benchmark.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    fields=sorted({k for r in rows for k in r});
    with (reports/"ocr-benchmark.csv").open("w",newline="",encoding="utf-8") as f: w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(rows)
    (reports/"ocr-benchmark.md").write_text("# OCR Benchmark\n\nDataset: synthetic rendered OCR benchmark documents\n\nStatus: "+report["status"]+"\n\n```json\n"+json.dumps(report["aggregate"],indent=2)+"\n```\n",encoding="utf-8"); print(json.dumps(report["aggregate"],indent=2)); return 0 if measured and not report["aggregate"]["failed"] else 2
if __name__=="__main__": raise SystemExit(main())
