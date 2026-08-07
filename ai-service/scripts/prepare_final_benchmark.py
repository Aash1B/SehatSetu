"""Create deterministic local-only canonical and medical-safety benchmark data."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "test" / "consolidated"


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def canonical() -> dict:
    voice = json.loads((BASE / "manifests/validated_voice_manifest.json").read_text(encoding="utf-8"))["cases"]
    ocr = json.loads((BASE / "manifests/validated_ocr_manifest.json").read_text(encoding="utf-8"))["documents"]
    included, excluded = [], []
    for case in voice:
        reasons = []
        if not case.get("consented"): reasons.append("missing consent")
        if case.get("contains_patient_data"): reasons.append("patient data")
        if not case.get("scorable_original_ground_truth"): reasons.append("placeholder or scenario ground truth")
        media = BASE / "voice/generated_audio" / ({"en":"english", "hi":"hindi", "hi-Latn":"hinglish"}.get(case["language"], "stress")) / f"{case['id']}.wav"
        if case.get("tts_supported") and not media.exists(): reasons.append("missing media")
        item = {**case, "dataset_group":"synthetic_tts", "media_path":str(media.relative_to(ROOT)) if media.exists() else None}
        (excluded if reasons else included).append({**item, "exclusion_reasons":reasons} if reasons else item)
    for document in ocr:
        matches = list((BASE / "ocr/generated_documents").rglob(f"{document['id']}.*"))
        reasons = [] if matches else ["missing media"]
        item = {**document, "dataset_group":"synthetic_rendered_ocr", "media_path":str(matches[0].relative_to(ROOT)) if matches else None}
        (excluded if reasons else included).append({**item, "exclusion_reasons":reasons} if reasons else item)
    return {"schema_version":1,"benchmark_version":"benchmark-v1","generated_at":datetime.now(timezone.utc).isoformat(),"groups":{"synthetic_tts":sum(x["dataset_group"]=="synthetic_tts" for x in included),"manual_audio":0,"synthetic_rendered_ocr":sum(x["dataset_group"]=="synthetic_rendered_ocr" for x in included),"manual_ocr":0,"mocked_tests":0,"real_gemini_provider":0},"included":included,"excluded":excluded}


def safety() -> dict:
    findings = ["fever","chest pain","drug allergy","vomiting","headache","shortness of breath","dizziness","cough","blurred vision","abdominal pain"]
    negations=[]
    for index in range(40):
        finding=findings[index % len(findings)]; denied=index % 2 == 1
        text=f"The fictional patient {'denies' if denied else 'reports'} {finding}."
        negations.append({"id":f"NEG{index+1:03}","text":text,"expected":{"finding":finding,"negated":denied},"critical_fields":["negated"],"synthetic":True,"contains_patient_data":False})
    dosage_pairs=[("5 mg","50 mg"),("15 mg","50 mg"),("0.5 mg","5 mg"),("one tablet","two tablets"),("once daily","twice daily"),("100/70","170/100"),("creatinine 1.8","creatinine 8.1"),("haemoglobin 11.5","haemoglobin 15.1"),("500 micrograms","500 milligrams"),("for five days","for fifteen days")]
    dosages=[]
    for index in range(40):
        value=dosage_pairs[index % len(dosage_pairs)][(index // len(dosage_pairs)) % 2]
        dosages.append({"id":f"DOS{index+1:03}","text":f"The fictional record states {value}.","expected":{"value":value},"critical_fields":["value","number","unit"],"synthetic":True,"contains_patient_data":False})
    medicines=["paracetamol","amoxicillin","aspirin","atorvastatin","azithromycin","cetirizine","ibuprofen","levothyroxine","metformin","pantoprazole","penicillin","telmisartan","Crocin","Dolo","Calpol","Glycomet","Thyronorm","Pan 40","Telma"]
    medicine_cases=[]
    for index in range(50):
        name=medicines[index % len(medicines)]
        medicine_cases.append({"id":f"MED{index+1:03}","text":f"The fictional transcript mentions {name} as an existing medicine.","expected":{"medicine":name},"critical_fields":["medicine_name","no_invention"],"synthetic":True,"contains_patient_data":False})
    return {"schema_version":1,"benchmark_version":"benchmark-v1","scoring":{"negation_loss_or_reversal":"critical_failure","dosage_number_or_unit_change":"critical_failure","medicine_invention":"critical_failure","number_loss":"critical_failure"},"groups":{"negation":negations,"dosage_and_numbers":dosages,"medicine_names":medicine_cases},"audio":{"status":"not_generated","reason":"Offline TTS generation is optional; manifests remain exact and deterministic.","unsupported_hindi_tts_separate":True}}


def main() -> None:
    manifest=canonical(); safety_manifest=safety()
    write_json(BASE / "manifests/canonical_benchmark_v1.json", manifest)
    write_json(BASE / "safety/medical_safety_v1.json", safety_manifest)
    baseline={"benchmark_version":"benchmark-v1","status":"FROZEN_NOT_EXECUTED","counts":{"included":len(manifest["included"]),"excluded":len(manifest["excluded"]),**manifest["groups"]},"metrics":"not measured","note":"Dataset validation is not an accuracy run."}
    write_json(BASE / "reports/canonical-baseline.json", baseline)
    (BASE / "reports/canonical-baseline.md").write_text("# Canonical baseline — benchmark-v1\n\nStatus: **FROZEN, NOT EXECUTED**. Dataset validation is not an accuracy score.\n\n"+"\n".join(f"- {key}: {value}" for key,value in baseline["counts"].items())+"\n",encoding="utf-8")


if __name__ == "__main__": main()
