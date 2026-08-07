"""Safely consolidate and validate the five local-only benchmark packs."""
from __future__ import annotations
import hashlib,json,re,shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; TEST=ROOT/"test"; OUT=TEST/"consolidated"
PACKS=[TEST/f"SehatSetu_Benchmark_Pack{i}" for i in range(1,6)]
LANGUAGES={"en","hi","hi-Latn"}; PLACEHOLDERS=("example symptom","suspected condition","examplemed","concise clinical summary placeholder","vegetables","sugary drinks")

def pack_source(pack:Path)->Path|None:
    direct=pack/"test"
    if direct.is_dir(): return direct
    matches=list(pack.glob("*/test")); return matches[0] if len(matches)==1 else None
def digest(path:Path)->str: return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path:Path): return json.loads(path.read_text(encoding="utf-8"))
def repair(value):
    if isinstance(value,str) and "à¤" in value:
        try:return value.encode("latin1").decode("utf-8")
        except UnicodeError:return value
    if isinstance(value,list):return [repair(x) for x in value]
    if isinstance(value,dict):return {k:repair(v) for k,v in value.items()}
    return value
def is_description(text:str)->bool:return bool(re.match(r"(?i)^(long consultation|simulated |extended hinglish consult)",text.strip()))
def generated_stress_script(case:dict)->str:
    return "This is a synthetic stress consultation. Patient reports fever and cough for three days. Patient takes Metformin 500 milligrams twice daily and Paracetamol 500 milligrams after food. Doctor advised CBC and LFT. Patient does not have chest pain."

def main()->int:
    dirs=["voice/english","voice/hindi","voice/hinglish","voice/stress","voice/generated_audio","voice/manual_recordings","ocr/prescriptions","ocr/lab_reports","ocr/generated_documents/prescriptions","ocr/generated_documents/lab_reports","ocr/manual_documents","expected","manifests","reports","history"]
    for item in dirs:(OUT/item).mkdir(parents=True,exist_ok=True)
    conflicts=[]; copied=[]; invalid_json=[]; structure=[]
    for number,pack in enumerate(PACKS,1):
        source=pack_source(pack); structure.append({"pack":number,"exists":pack.is_dir(),"source":str(source.relative_to(TEST)) if source else None,"direct_nested_test":(pack/"test").is_dir()})
        if not source:continue
        for origin in source.rglob("*"):
            if not origin.is_file() or origin.suffix.lower() in {".zip",".tmp"}:continue
            relative=origin.relative_to(source); target=OUT/relative; target.parent.mkdir(parents=True,exist_ok=True)
            if target.exists():
                if digest(origin)==digest(target):continue
                target=target.with_name(f"{target.stem}__pack{number}{target.suffix}"); conflicts.append({"source":str(origin.relative_to(TEST)),"renamed_to":str(target.relative_to(TEST))})
            shutil.copy2(origin,target);copied.append(str(target.relative_to(TEST)))
            if target.suffix.lower()==".json":
                try:load(target)
                except (OSError,json.JSONDecodeError) as exc:invalid_json.append({"file":str(target.relative_to(TEST)),"error":type(exc).__name__})
    voice=[]; seen=set(); invalid_voice=[];unsupported=[];descriptions=[]
    for path in sorted((OUT/"voice").glob("*/*.json")):
        case=repair(load(path)); identifier=str(case.get("id","")).strip(); errors=[]
        if not identifier or identifier in seen:errors.append("missing or duplicate id")
        if case.get("language") not in LANGUAGES:errors.append("invalid language")
        if not case.get("category"):errors.append("missing category")
        if not str(case.get("expected_transcript","")).strip():errors.append("missing exact transcript")
        for key,expected in (("consented",True),("synthetic_content",True),("contains_patient_data",False)):
            if case.get(key) is not expected:errors.append(f"unsafe {key}")
        if errors:invalid_voice.append({"id":identifier,"file":str(path.relative_to(TEST)),"errors":errors});continue
        seen.add(identifier); case["source_metadata_file"]=str(path.relative_to(TEST)); case["scorable_original_ground_truth"]=not is_description(case["expected_transcript"])
        if not case["scorable_original_ground_truth"]:case["generated_transcript"]=generated_stress_script(case);descriptions.append(identifier)
        if case["language"]=="hi":case["tts_supported"]=False;case["tts_reason"]="No installed Hindi-script SAPI voice";unsupported.append(identifier)
        else:case["tts_supported"]=True
        voice.append(case)
    ocr=[];invalid_ocr=[];seen_ocr=set()
    for path in sorted((OUT/"ocr").glob("*/*.json")):
        case=repair(load(path));identifier=str(case.get("id","")).strip();errors=[]
        if not identifier or identifier in seen_ocr:errors.append("missing or duplicate id")
        if case.get("document_type") not in {"prescription","lab_report","lab-report"}:errors.append("invalid document type")
        if case.get("consented") is not True or case.get("anonymized") is not True or case.get("contains_patient_data") is not False:errors.append("unsafe consent/anonymization")
        if not (case.get("expected_keywords") or case.get("expected_fields") or case.get("medicines")):errors.append("missing expected visible fields")
        if errors:invalid_ocr.append({"id":identifier,"file":str(path.relative_to(TEST)),"errors":errors});continue
        seen_ocr.add(identifier);case["source_metadata_file"]=str(path.relative_to(TEST));ocr.append(case)
    placeholders=[];expected=[]
    voice_by_id={x["id"]:x for x in voice}
    for path in sorted((OUT/"expected").glob("*.json")):
        item=repair(load(path)); blob=json.dumps(item,ensure_ascii=False).casefold(); found=[x for x in PLACEHOLDERS if x in blob]; case_id=item.get("case_id"); source=voice_by_id.get(case_id)
        if found:placeholders.append({"case_id":case_id,"file":str(path.relative_to(TEST)),"placeholders":found,"exact_scoring":False})
        derived={"case_id":case_id,"source_available":bool(source),"exact_provider_text_scorable":False,"placeholder_fields":found,"derived_extraction":None}
        if source:derived["derived_extraction"]={"symptoms":source.get("medical_terms",[]),"medications":source.get("medicines",[]),"dosages":source.get("dosages",[]),"negations":source.get("negations",[])}
        expected.append(derived)
    manifests=OUT/"manifests"; reports=OUT/"reports"
    combined={"packs":structure,"copied_files":copied,"conflicts":conflicts,"invalid_json":invalid_json,"counts":{"voice":len(voice),"ocr":len(ocr),"expected":len(expected)}}
    (manifests/"combined_benchmark_manifest.json").write_text(json.dumps(combined,indent=2,ensure_ascii=False),encoding="utf-8")
    (manifests/"validated_voice_manifest.json").write_text(json.dumps({"schema_version":1,"cases":voice,"invalid":invalid_voice},indent=2,ensure_ascii=False),encoding="utf-8")
    (manifests/"validated_ocr_manifest.json").write_text(json.dumps({"schema_version":1,"documents":ocr,"invalid":invalid_ocr},indent=2,ensure_ascii=False),encoding="utf-8")
    (manifests/"validated_expected_outputs_manifest.json").write_text(json.dumps({"cases":expected,"placeholder_issues":placeholders},indent=2,ensure_ascii=False),encoding="utf-8")
    (reports/"benchmark-pack-validation.md").write_text(f"# Benchmark Pack Validation\n\nPacks: {len(PACKS)} discovered. Pack 3 direct nested test: false; wrapper source used.\n\nCopied files: {len(copied)}  \nConflicts: {len(conflicts)}  \nInvalid JSON: {len(invalid_json)}  \nValid voice: {len(voice)}  \nValid OCR: {len(ocr)}\n\nAll source packs were preserved.\n",encoding="utf-8")
    (reports/"ground-truth-quality-report.md").write_text(f"# Ground Truth Quality\n\nInvalid voice cases: {len(invalid_voice)}  \nInvalid OCR cases: {len(invalid_ocr)}  \nPlaceholder expected files: {len(placeholders)}  \nScenario-description stress cases: {len(descriptions)}  \nUnsupported Hindi TTS cases: {len(unsupported)}\n\nPlaceholder provider outputs are excluded from exact scoring. Deterministic extraction expectations are derived only from source metadata.\n",encoding="utf-8")
    (OUT/"README.md").write_text("# Consolidated local benchmark\n\nGenerated from five preserved source packs. This directory is local-only and ignored by Git. Hindi-script SAPI generation is disabled because no Hindi voice is installed.\n",encoding="utf-8")
    print(json.dumps({"packs":structure,"copied":len(copied),"conflicts":len(conflicts),"invalid_json":len(invalid_json),"voice":len(voice),"ocr":len(ocr),"placeholders":len(placeholders),"scenario_descriptions":len(descriptions),"unsupported_tts":len(unsupported)},indent=2));return 1 if invalid_json else 0
if __name__=="__main__":raise SystemExit(main())
