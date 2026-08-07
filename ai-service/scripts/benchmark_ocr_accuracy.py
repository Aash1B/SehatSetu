"""Consent-gated real OCR benchmark using the existing approved endpoint."""
from __future__ import annotations
import argparse,csv,json,re,sys,time,unicodedata
from difflib import SequenceMatcher
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT)); REPORTS=ROOT/"reports/standalone-verification"

def norm(s:str)->str: return " ".join(re.sub(r"[^\w\s]"," ",unicodedata.normalize("NFKC",s).casefold()).split())
def comparison_normalize(text:str,ignored_phrases:list[str]|None=None)->str:
    value=unicodedata.normalize("NFKC",str(text or ""))
    value=re.sub(r"---\s*Page\s+\d+\s*---"," ",value,flags=re.I)
    for phrase in ignored_phrases or []: value=re.sub(re.escape(unicodedata.normalize("NFKC",phrase))," ",value,flags=re.I)
    return norm(value)
def strict_similarity(expected:str,actual:str)->float:
    return SequenceMatcher(None,unicodedata.normalize("NFC",expected),unicodedata.normalize("NFC",actual)).ratio()
def token_similarity(expected:str,actual:str)->float:
    left,right=norm(expected).split(),norm(actual).split(); denominator=max(len(left),len(right))
    return 1-(distance(left,right)/denominator) if denominator else 1.0
def distance(a:list[str],b:list[str])->int:
    p=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        c=[i]
        for j,y in enumerate(b,1): c.append(min(c[-1]+1,p[j]+1,p[j-1]+(x!=y)))
        p=c
    return p[-1]
def recall(items:list[str],text:str): return None if not items else sum(norm(x) in norm(text) for x in items)/len(items)

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument("--manifest",type=Path,default=ROOT/"tests/fixtures/ocr/ocr_dataset_manifest.json"); ap.add_argument("--output-dir",type=Path,default=REPORTS); ap.add_argument("--base-url"); ap.add_argument("--use-test-client",action="store_true"); ap.add_argument("--disable-gemini",action="store_true"); ap.add_argument("--request-delay",type=float,default=13.0); args=ap.parse_args(); manifest=json.loads(args.manifest.read_text(encoding="utf-8")); ignored=manifest.get("comparison_ignored_phrases",[]); rows=[]
    if args.use_test_client:
        import os; os.environ["APP_ENV"]="testing";
        if args.disable_gemini: os.environ["GEMINI_API_KEY"]=""
        from fastapi.testclient import TestClient; from app.main import app; client=TestClient(app); url="/api/v1/ocr/analyze"
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
        normalized_expected=comparison_normalize(expected,ignored); normalized_actual=comparison_normalize(actual,ignored)
        pages=data.get("pages",[]); variants=[page.get("variant_selected") for page in pages if page.get("variant_selected")]
        rows.append({"id":case["id"],"document_type":case["document_type"],"visual_condition":case.get("visual_condition"),"file_type":case.get("file_type"),"multi_page":case.get("id")=="LAB010","status":"PASSED" if response.is_success else "FAILED","http_status":response.status_code,"engine":data.get("engine"),"confidence":data.get("confidence"),"cache_hit":data.get("cache_hit",False),"fallback_used":data.get("fallback_used",False),"selected_variants":"|".join(variants),"strict_full_text_similarity":strict_similarity(expected,actual),"normalized_full_text_similarity":SequenceMatcher(None,normalized_expected,normalized_actual).ratio(),"token_level_similarity":token_similarity(normalized_expected,normalized_actual),"text_error_rate":distance(words,norm(actual).split())/len(words),"important_field_recall":recall(case.get("important_fields",[]),actual),"medicine_recall":recall(case.get("expected_medicines",[]),actual),"dosage_recall":recall(case.get("expected_dosages",[]),actual),"lab_test_recall":recall(case.get("expected_lab_tests",[]),actual),"numeric_value_accuracy":recall(case.get("expected_lab_values",[]),actual),"unit_accuracy":recall(case.get("expected_units",[]),actual),"empty_extraction":not bool(norm(actual)),"page_failures":sum(p.get("status")=="failed" for p in pages),"latency_seconds":time.perf_counter()-started})
        if args.request_delay and case is not manifest["documents"][-1]: time.sleep(args.request_delay)
    measured=[x for x in rows if x["status"]=="PASSED"]
    def avg(field):
        values=[x[field] for x in measured if x.get(field) is not None]; return sum(values)/len(values) if values else None
    lats=sorted(x["latency_seconds"] for x in measured); p95=lats[min(len(lats)-1,int(.95*len(lats)))] if lats else None
    groups={};
    for name,pred in {"clean":lambda x:x.get("visual_condition")=="clean","rotated":lambda x:x.get("visual_condition")=="rotated","low_contrast":lambda x:x.get("visual_condition")=="low_contrast","blurred":lambda x:x.get("visual_condition")=="blurred","pdf":lambda x:x.get("file_type")=="pdf"}.items():
        subset=[x for x in measured if pred(x)]; groups[name]={"documents":len(subset),"success_rate":len(subset)/max(1,sum(pred(x) for x in rows))}
    variant_usage={}
    for row in measured:
        for name in filter(None,str(row.get("selected_variants","")).split("|")): variant_usage[name]=variant_usage.get(name,0)+1
    legacy_similarity=None if avg("text_error_rate") is None else max(0,1-avg("text_error_rate"))
    report={"status":"COMPLETE" if measured and not any(x["status"]=="FAILED" for x in rows) else ("PARTIAL" if measured else "BLOCKED"),"dataset_label":"synthetic rendered OCR benchmark documents","gemini_disabled":args.disable_gemini,"scorer":{"legacy_similarity_before_fix":legacy_similarity,"root_cause":"Legacy 1-WER was clamped at zero because raw OCR includes configured synthetic headers/disclaimers and service page markers.","ignored_phrases":ignored},"aggregate":{"documents":len(rows),"passed":len(measured),"failed":sum(x["status"]=="FAILED" for x in rows),"skipped":sum(x["status"]=="SKIPPED" for x in rows),"prescriptions":sum(x.get("document_type")=="prescription" for x in measured),"lab_reports":sum(x.get("document_type")=="lab-report" for x in measured),"strict_full_text_similarity":avg("strict_full_text_similarity"),"normalized_full_text_similarity":avg("normalized_full_text_similarity"),"token_level_similarity":avg("token_level_similarity"),"important_field_recall":avg("important_field_recall"),"medicine_recall":avg("medicine_recall"),"dosage_recall":avg("dosage_recall"),"lab_test_recall":avg("lab_test_recall"),"numeric_value_accuracy":avg("numeric_value_accuracy"),"unit_accuracy":avg("unit_accuracy"),"confidence":avg("confidence"),"empty_extraction_rate":avg("empty_extraction"),"average_latency_seconds":avg("latency_seconds"),"p95_latency_seconds":p95,"page_failure_rate":sum(x.get("page_failures",0) for x in measured)/max(1,sum(1 for x in measured)),"page_success_rate":1-(sum(x.get("page_failures",0) for x in measured)/max(1,sum(1 for x in measured))),"local_ocr_success_rate":sum(x.get("engine")=="tesseract" for x in measured)/len(rows) if rows else None,"gemini_fallback_rate":sum(bool(x.get("fallback_used")) for x in measured)/len(measured) if measured else None,"cache_hit_rate":sum(bool(x.get("cache_hit")) for x in measured)/len(measured) if measured else None,"variant_usage":variant_usage,"groups":groups},"results":rows}; reports=args.output_dir; reports.mkdir(parents=True,exist_ok=True); (reports/"ocr-benchmark.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    fields=sorted({k for r in rows for k in r});
    with (reports/"ocr-benchmark.csv").open("w",newline="",encoding="utf-8") as f: w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(rows)
    (reports/"ocr-benchmark.md").write_text("# OCR Benchmark\n\nDataset: synthetic rendered OCR benchmark documents\n\nStatus: "+report["status"]+"\n\n```json\n"+json.dumps(report["aggregate"],indent=2)+"\n```\n",encoding="utf-8"); print(json.dumps(report["aggregate"],indent=2)); return 0 if measured and not report["aggregate"]["failed"] else 2
if __name__=="__main__": raise SystemExit(main())
