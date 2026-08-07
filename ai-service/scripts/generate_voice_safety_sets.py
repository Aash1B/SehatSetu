"""Generate deterministic text-only safety sets (no patient data or accuracy claims)."""
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"tests/fixtures/voice_safety"

def paired_negations():
    findings=[("fever","no fever"),("chest pain","denies chest pain"),("vomiting","no vomiting"),("dizziness","does not feel dizzy"),("known drug allergy","no known drug allergy"),("shortness of breath","no shortness of breath"),("cough and fever","cough but no fever"),("pain with swelling","pain without swelling"),("test result is positive","test result is negative"),("taking medication","not taking medication")]
    words=["no","not","denies","denied","without","negative","never","does not","did not","नहीं","नहीं है","मना करता है","nahi","nahi hai","bina"]
    rows=[]
    for i in range(40):
        positive,negative=findings[i%len(findings)]; rows.append({"id":f"neg-{i+1:02d}","pair_id":f"pair-{i+1:02d}","positive":f"Patient reports {positive}.","negative":f"Patient reports {negative}.","negation_term":words[i%len(words)] if i>=len(findings) else negative.split()[0],"synthetic":True})
    return rows

def dosage_cases():
    strengths=[("5 mg","50 mg"),("15 mg","50 mg"),("0.5 mg","5 mg"),("500 mg","500 mcg")]
    rows=[]
    for i in range(40):
        left,right=strengths[i%4]; medicine=("Paracetamol","Metformin","Amlodipine","Levothyroxine")[i%4]; freq=("once daily","twice daily","three times daily")[i%3]; timing=("before food","after food")[i%2]
        rows.append({"id":f"dose-{i+1:02d}","text":f"Take {medicine} {left} {freq} {timing} for five days.","contrast":f"Take {medicine} {right} {freq} {timing} for fifteen days.","medicine":medicine,"strength":left,"frequency":freq,"timing":timing,"duration":"five days","synthetic":True})
    return rows

def medicine_cases():
    medicines=["Paracetamol","Azithromycin","Amoxicillin","Metformin","Pantoprazole","Levothyroxine","Atorvastatin","Amlodipine","Cetirizine","Salbutamol","Sumatriptan"]
    return [{"id":f"med-{i+1:02d}","text":f"Patient takes {medicines[i%len(medicines)]} 5 mg once daily.","medicine":medicines[i%len(medicines)],"synthetic":True} for i in range(50)]

def lab_cases():
    values=[("blood pressure","100/70"),("blood pressure","170/100"),("creatinine","1.8 mg/dL"),("creatinine","18 mg/dL"),("haemoglobin","11.5 g/dL"),("haemoglobin","15 g/dL"),("blood sugar","180 mg/dL"),("blood sugar","118 mg/dL"),("HbA1c","7.5%")]
    return [{"id":f"lab-{i+1:02d}","text":f"The {name} is {value}.","test":name,"value":value,"synthetic":True} for i,(name,value) in enumerate((values*3)[:20])]

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    sets={"negation-safety.json":paired_negations(),"dosage-number-safety.json":dosage_cases(),"medicine-safety.json":medicine_cases(),"lab-vital-safety.json":lab_cases()}
    for name,cases in sets.items(): (OUT/name).write_text(json.dumps({"schema_version":1,"classification":"deterministic text-only synthetic safety set","cases":cases},indent=2,ensure_ascii=False),encoding="utf-8")
    print({name:len(cases) for name,cases in sets.items()})
if __name__=="__main__": main()
