"""Evidence-preserving OCR normalization and deterministic extraction."""

from __future__ import annotations
import re
from app.schemas.ocr import OCRCorrection, OCRStructuredEntity


def normalize_medical_text(raw:str)->tuple[str,list[OCRCorrection]]:
    text="\n".join(" ".join(line.split()) for line in raw.splitlines() if line.strip()); corrections=[]
    def spacing(match):
        replacement=f"{match.group(1)} {match.group(2)}"; corrections.append(OCRCorrection(source=match.group(0),replacement=replacement,reason="unit_spacing")); return replacement
    text=re.sub(r"\b(\d+(?:\.\d+)?)(mg|mcg|g|mL|IU|mmol/L|mg/dL|g/dL)\b",spacing,text,flags=re.I)
    return text,corrections


def extract_entities(text:str,page:int,confidence:float)->list[OCRStructuredEntity]:
    entities=[]
    patterns=[
        ("date",r"\b(?:date\s*[:\-]?\s*)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"),
        ("lab_test",r"\b(CBC|LFT|KFT|HbA1c|Hb|haemoglobin|creatinine)\s*[:\-]?\s*(\d+(?:\.\d+)?)?\s*([%A-Za-z/]+)?"),
        ("medicine",r"\b(Paracetamol|Amoxicillin|Metformin|Azithromycin|Pantoprazole|Atorvastatin|Levothyroxine|Telmisartan|Crocin|Dolo)\b(?:\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL|IU)))?(?:\s+(one|two|\d+)\s+(tablets?|capsules?|mL))?(?:\s+(once daily|twice daily|three times a day|OD|BD|BID|TID))?(?:\s+(for\s+(?:\d+|one|two|three|four|five|seven|ten)\s+days?))?(?:\s+(after food|before food|before breakfast|at bedtime))?"),
        ("medicine",r"\b(?:medicine|medication|prescription|drug)\s*[:\-]\s*([A-Za-z][A-Za-z0-9 .+/-]{2,80})"),
        ("blood_pressure",r"\b(?:BP|blood pressure)\s*[:\-]?\s*(\d{2,3}/\d{2,3})\b"),
        ("doctor",r"\b(Dr\.?\s+[A-Za-z][A-Za-z .]{1,50})"),
        ("hospital",r"\b([A-Za-z][A-Za-z &.-]{2,60}\s+(?:Hospital|Clinic|Medical Centre))\b"),
        ("patient",r"\bPatient(?:\s+Name)?\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,60})"),
        ("diagnosis",r"\b(?:diagnosis|clinical diagnosis|impression)\s*[:\-]\s*([^\n|;]{2,120})"),
        ("allergy",r"\b(?:allerg(?:y|ies)|allergic to)\s*[:\-]?\s*(?!none\b|no known\b|n/?k/?a\b)([A-Za-z][A-Za-z ,./-]{1,80})"),
        ("procedure",r"\b(?:past surgical history|surgery|procedure)\s*[:\-]\s*([^\n|;]{2,120})"),
    ]
    for kind,pattern in patterns:
        for match in re.finditer(pattern,text,re.I):
            groups=[value or "" for value in match.groups()]; source=match.group(0)
            entity=OCRStructuredEntity(kind=kind,name=groups[0],confidence=confidence,page=page,source_text=source)
            if kind=="medicine":
                entity.strength=groups[1] if len(groups)>1 else ""
                entity.dosage=" ".join(groups[2:4]).strip() if len(groups)>3 else ""
                entity.frequency=groups[4] if len(groups)>4 else ""
                entity.duration=groups[5] if len(groups)>5 else ""
                entity.instructions=groups[6] if len(groups)>6 else ""
            elif kind=="lab_test": entity.value=groups[1] if len(groups)>1 else ""; entity.unit=groups[2] if len(groups)>2 else ""
            elif kind=="blood_pressure": entity.value=groups[0]
            entities.append(entity)
    return entities
