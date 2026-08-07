"""Load redacted verification artifacts without treating missing metrics as zero."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[1]
REPORTS=ROOT/"test/consolidated/reports"
FILES={"verification":"final-verification.json","voice":"voice-benchmark.json","voice_final":"final-voice-benchmark.json","voice_completion":"final-voice-completion.json","voice_safety":"voice-safety-benchmark.json","models":"model-comparison.json","two_pass":"one-pass-vs-two-pass.json","medical_safety":"medical-safety-benchmark.json","ocr_final":"ocr-report.json","tuning":"transcription-tuning.json","ocr":"ocr-benchmark.json","gemini":"gemini-integration-results.json","extraction":"medical-extraction-benchmark.json","safety":"generation-safety-benchmark.json"}
SENSITIVE=("api_key","secret","token","authorization")

def _safe(value: Any, key: str="") -> Any:
    if any(word in key.casefold() for word in SENSITIVE): return "[REDACTED]"
    if isinstance(value,dict): return {k:_safe(v,k) for k,v in value.items()}
    if isinstance(value,list): return [_safe(v,key) for v in value]
    if isinstance(value,str) and len(value)>500: return value[:500]+"…"
    return value

def load_reports(directory: Path=REPORTS) -> dict[str,Any]:
    output={}
    for name,filename in FILES.items():
        path=directory/filename
        if not path.exists(): output[name]={"status":"NOT_MEASURED","reason":"report missing"}; continue
        try: output[name]=_safe(json.loads(path.read_text(encoding="utf-8")))
        except (OSError,json.JSONDecodeError): output[name]={"status":"INVALID","reason":"report unreadable"}
    comparison=ROOT/"reports/standalone-verification/whisper-model-comparison.json"
    if directory == REPORTS and comparison.exists():
        try: output["models"]=_safe(json.loads(comparison.read_text(encoding="utf-8")))
        except (OSError,json.JSONDecodeError): output["models"]={"status":"INVALID","reason":"comparison report unreadable"}
    if directory == REPORTS:
        standalone=ROOT/"reports/standalone-verification"
        for name,filename in (("voice_final","final-voice-benchmark.json"),("voice_completion","final-voice-completion.json"),("voice_safety","voice-safety-benchmark.json"),("verification","final-verification.json")):
            path=standalone/filename
            if path.exists():
                try: output[name]=_safe(json.loads(path.read_text(encoding="utf-8")))
                except (OSError,json.JSONDecodeError): output[name]={"status":"INVALID","reason":"report unreadable"}
    history=[]
    for path in sorted((directory/"history").glob("*.json")) if (directory/"history").exists() else []:
        try: history.append({"file":path.name,"data":_safe(json.loads(path.read_text(encoding="utf-8")))})
        except (OSError,json.JSONDecodeError): continue
    output["history"]=history
    return output
