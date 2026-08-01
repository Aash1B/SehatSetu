"""Render Pack 4 ground truth into local-only synthetic OCR documents."""
from __future__ import annotations
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageEnhance,ImageFilter,ImageFont
import fitz
ROOT=Path(__file__).resolve().parents[1]; CONS=ROOT/"test/consolidated"; MAN=CONS/"manifests"; BASE=CONS/"ocr/generated_documents"
FONT=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",28);BOLD=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf",34)
def render(title,lines):
    im=Image.new("RGB",(1400,1800),"white");d=ImageDraw.Draw(im);d.rectangle((50,50,1350,1750),outline="#244",width=4);d.text((90,85),"SEHAT-SETU SYNTHETIC BENCHMARK",font=BOLD,fill="#244");d.text((90,155),title,font=BOLD,fill="black");d.text((90,220),"Synthetic Benchmark Patient - no real identity",font=FONT,fill="#555");y=310
    for line in lines:d.text((100,y),line,font=FONT,fill="black");y+=65
    d.text((90,1660),"Synthetic use only - doctor review required",font=FONT,fill="#555");return im
def main():
    for kind in ("prescriptions","lab_reports"):
        for condition in ("clean","rotated","low_contrast","blurred","pdf"):
            (BASE/kind/condition).mkdir(parents=True,exist_ok=True)
    source=json.loads((MAN/"validated_ocr_manifest.json").read_text(encoding="utf-8")); docs=[]
    for index,case in enumerate(source["documents"]):
        kind="prescriptions" if case["document_type"]=="prescription" else "lab_reports";lines=[];meds=[];dosages=[];tests=[];values=[];units=[]
        if kind=="prescriptions":
            lines=["TYPED PRESCRIPTION"]
            for med in case.get("medicines",[]):
                line=f"Medicine: {med.get('name','')} | Dose: {med.get('dose','')} | Frequency: {med.get('frequency','')}";lines.append(line);meds.append(med.get("name",""));dosages += [med.get("dose",""),med.get("frequency","")]
            lines.append("Instruction: after food")
        else:
            lines=[f"LABORATORY REPORT | Panel: {case.get('panel','')}","Test | Result | Unit"]
            for field in case.get("expected_fields",[]):
                raw=str(field.get("value",""));parts=raw.split(maxsplit=1);value=parts[0] if parts else "";unit=parts[1] if len(parts)>1 else "";lines.append(f"{field.get('name','')} | {value} | {unit}");tests.append(field.get("name",""));values.append(value);units.append(unit)
        visible=" ".join(lines);condition=["clean","rotated","low_contrast","blurred","pdf"][index%5];folder=BASE/kind/condition;folder.mkdir(parents=True,exist_ok=True)
        if condition=="pdf" or case["id"]=="LAB010":
            path=folder/f"{case['id']}.pdf";pdf=fitz.open();chunks=[lines] if case["id"]!="LAB010" else [lines[:2],lines[2:]]
            for chunk in chunks:
                page=pdf.new_page(width=595,height=842);page.insert_text((45,55),"SEHAT-SETU SYNTHETIC BENCHMARK",fontsize=15);y=110
                for line in chunk:page.insert_text((45,y),line,fontsize=11);y+=35
            pdf.save(path);pdf.close();file_type="pdf"
        else:
            im=render("Typed Prescription" if kind=="prescriptions" else "Typed Lab Report",lines)
            if condition=="rotated":im=im.rotate(4,expand=True,fillcolor="white")
            elif condition=="low_contrast":im=ImageEnhance.Contrast(im).enhance(.5)
            elif condition=="blurred":im=im.filter(ImageFilter.GaussianBlur(1.3))
            path=folder/f"{case['id']}.png";im.save(path,optimize=True);file_type="image"
        important_fields=[str(value) for value in case.get("expected_keywords",[])]
        important_fields += [str(field.get("name","")) for field in case.get("expected_fields",[]) if field.get("name")]
        docs.append({"id":case["id"],"file":str(Path("..")/path.relative_to(CONS)).replace("\\","/"),"document_type":"prescription" if kind=="prescriptions" else "lab-report","visual_condition":condition,"file_type":file_type,"consented":True,"anonymized":True,"synthetic_content":True,"contains_patient_data":False,"expected_text":visible,"important_fields":important_fields,"expected_medicines":meds,"expected_dosages":[x for x in dosages if x],"expected_lab_tests":tests,"expected_lab_values":values,"expected_units":units,"optional":False,"enabled":True,"dataset_label":"synthetic rendered OCR benchmark document"})
    (MAN/"generated_ocr_manifest.json").write_text(json.dumps({"schema_version":1,"dataset_label":"synthetic rendered OCR benchmark documents","documents":docs},indent=2,ensure_ascii=False),encoding="utf-8");print(f"generated={len(docs)}");return 0
if __name__=="__main__":raise SystemExit(main())
