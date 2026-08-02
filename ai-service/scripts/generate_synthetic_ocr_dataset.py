"""Generate fictional, anonymized prescriptions and lab reports offline."""
from __future__ import annotations
import json,random
from pathlib import Path
from PIL import Image,ImageDraw,ImageEnhance,ImageFilter,ImageFont
import fitz

ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/"tests/fixtures/ocr"
FONT_PATH=Path("C:/Windows/Fonts/arial.ttf"); BOLD_PATH=Path("C:/Windows/Fonts/arialbd.ttf")
FONT=ImageFont.truetype(str(FONT_PATH),28); SMALL=ImageFont.truetype(str(FONT_PATH),24); BOLD=ImageFont.truetype(str(BOLD_PATH),34)

PRESCRIPTIONS=[
("rx-paracetamol","Paracetamol 500 mg","One tablet twice daily after food","5 days"),
("rx-azithromycin","Azithromycin 500 mg","One tablet once daily after food","3 days"),
("rx-metformin","Metformin 500 mg","One tablet twice daily with meals","30 days"),
("rx-pantoprazole","Pantoprazole 40 mg","One tablet once daily before breakfast","14 days"),
("rx-cetirizine","Cetirizine 10 mg","One tablet at bedtime","5 days"),
("rx-atorvastatin","Atorvastatin 10 mg","One tablet once daily at bedtime","30 days"),
("rx-levothyroxine","Levothyroxine 50 mcg","One tablet once daily before breakfast","30 days"),
("rx-amoxicillin","Amoxicillin 500 mg","One capsule three times daily after food","5 days"),
("rx-asthma","Salbutamol inhaler 100 mcg","Two puffs as needed by inhalation","7 days"),
("rx-migraine","Paracetamol 650 mg","One tablet as needed after food","3 days"),]
LABS=[
("lab-cbc",[("Haemoglobin","13.5","g/dL","12.0 - 16.0"),("WBC","7800","cells/uL","4000 - 11000")]),
("lab-kft",[("Creatinine","1.1","mg/dL","0.6 - 1.2"),("Urea","28","mg/dL","15 - 40")]),
("lab-lft",[("ALT","35","U/L","7 - 56"),("AST","30","U/L","10 - 40")]),
("lab-diabetes",[("Fasting Glucose","126","mg/dL","70 - 99"),("HbA1c","6.8","%","4.0 - 5.6")]),
("lab-thyroid",[("TSH","5.2","mIU/L","0.4 - 4.0"),("Free T4","1.0","ng/dL","0.8 - 1.8")]),
("lab-lipids",[("Total Cholesterol","220","mg/dL","Below 200"),("LDL","145","mg/dL","Below 100")]),
("lab-electrolytes",[("Sodium","139","mmol/L","135 - 145"),("Potassium","4.2","mmol/L","3.5 - 5.0")]),
("lab-iron",[("Serum Iron","55","mcg/dL","60 - 170"),("Ferritin","18","ng/mL","20 - 250")]),
("lab-vitamin",[("Vitamin B12","310","pg/mL","200 - 900"),("Vitamin D","24","ng/mL","30 - 100")]),
("lab-multipage",[("Haemoglobin","11.2","g/dL","12.0 - 16.0"),("Creatinine","1.4","mg/dL","0.6 - 1.2"),("ALT","62","U/L","7 - 56")]),]

def canvas(title:str,lines:list[str])->Image.Image:
    image=Image.new("RGB",(1400,1800),"white"); draw=ImageDraw.Draw(image); draw.rectangle((45,45,1355,1755),outline="#17365d",width=5); draw.text((90,80),"SEHAT-SETU SYNTHETIC TEACHING DOCUMENT",font=BOLD,fill="#17365d"); draw.text((90,145),title,font=BOLD,fill="black"); draw.text((90,205),"Fictional record — no patient identity",font=SMALL,fill="#555")
    y=300
    for line in lines: draw.text((100,y),line,font=FONT,fill="black"); y+=68
    draw.text((90,1660),"For OCR evaluation only. Not medical advice.",font=SMALL,fill="#555"); return image

def variant(image:Image.Image,index:int)->Image.Image:
    mode=index%5
    if mode==1: return image.rotate(4,expand=True,fillcolor="white")
    if mode==2: return ImageEnhance.Contrast(image).enhance(.48)
    if mode==3: return image.filter(ImageFilter.GaussianBlur(1.4))
    if mode==4:
        overlay=Image.new("RGBA",image.size,(0,0,0,0)); d=ImageDraw.Draw(overlay); d.polygon([(0,0),(500,0),(1000,1800),(650,1800)],fill=(0,0,0,45)); return Image.alpha_composite(image.convert("RGBA"),overlay).convert("RGB")
    return image

def main()->int:
    documents=[]
    for index,(identifier,medicine,instruction,duration) in enumerate(PRESCRIPTIONS):
        lines=["PRESCRIPTION",f"Medicine: {medicine}",f"Directions: {instruction}",f"Duration: {duration}","Doctor review required"]
        image=variant(canvas("Typed Prescription",lines),index); path=BASE/"prescriptions"/(identifier+".png"); path.parent.mkdir(parents=True,exist_ok=True); image.save(path,optimize=True)
        documents.append({"id":identifier,"file":str(path.relative_to(BASE)).replace("\\","/"),"document_type":"prescription","consented":True,"anonymized":True,"synthetic_content":True,"contains_patient_data":False,"expected_text":" ".join(lines),"important_fields":[medicine,instruction,duration],"expected_medicines":[medicine.split()[0]],"expected_dosages":[" ".join(medicine.split()[1:]),instruction],"expected_lab_tests":[],"expected_lab_values":[],"expected_units":[],"optional":False,"enabled":True,"visual_condition":["clear","rotated","low-contrast","blurred","shadow"][index%5]})
    for index,(identifier,values) in enumerate(LABS):
        lines=["LABORATORY REPORT","Test | Result | Unit | Reference Range"]+[" | ".join(row) for row in values]
        if identifier=="lab-multipage":
            path=BASE/"lab-reports"/(identifier+".pdf"); doc=fitz.open()
            for page_values in (values[:2],values[2:]):
                page=doc.new_page(width=595,height=842); page.insert_text((50,60),"SEHAT-SETU SYNTHETIC LAB REPORT",fontsize=16); page.insert_text((50,95),"Fictional record - no patient identity",fontsize=11); y=150
                for row in page_values: page.insert_text((50,y)," | ".join(row),fontsize=12); y+=40
            doc.save(path); doc.close()
        else:
            path=BASE/"lab-reports"/(identifier+".png"); path.parent.mkdir(parents=True,exist_ok=True); variant(canvas("Typed Laboratory Report",lines),index).save(path,optimize=True)
        documents.append({"id":identifier,"file":str(path.relative_to(BASE)).replace("\\","/"),"document_type":"lab-report","consented":True,"anonymized":True,"synthetic_content":True,"contains_patient_data":False,"expected_text":" ".join(lines),"important_fields":[row[0] for row in values],"expected_medicines":[],"expected_dosages":[],"expected_lab_tests":[row[0] for row in values],"expected_lab_values":[row[1] for row in values],"expected_units":[row[2] for row in values],"optional":False,"enabled":True,"visual_condition":["clear","rotated","low-contrast","blurred","shadow"][index%5]})
    (BASE/"ocr_dataset_manifest.json").write_text(json.dumps({"schema_version":2,"generator":"offline Pillow and PyMuPDF","documents":documents},indent=2),encoding="utf-8"); print(f"generated={len(documents)}"); return 0
if __name__=="__main__": raise SystemExit(main())
