"""Generate and optionally serve the dependency-free local dashboard."""
from __future__ import annotations
import argparse, html, json, sys
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT))
from evaluation_dashboard.data_loader import load_reports
from evaluation_dashboard.metrics import overview

OUTPUT=ROOT/"test/consolidated/reports/evaluation-dashboard.html"

def generate() -> Path:
    data=load_reports(); summary=overview(data); voice=data.get("voice",{}).get("aggregate",{}); rows=data.get("voice",{}).get("results",[]); tuning=data.get("tuning",{}).get("configurations",[]); ocr_final=data.get("ocr_final",{})
    cards="".join(f"<article><small>{html.escape(str(k).replace('_',' ').title())}</small><strong>{html.escape('Not measured' if v is None else str(v))}</strong></article>" for k,v in {**summary,**{k:voice.get(k) for k in ('average_wer','average_cer','important_term_recall','medicine_recall','dosage_recall','negation_preservation_rate','language_detection_accuracy','p95_processing_seconds')},"local_ocr_status":ocr_final.get("local_ocr",{}).get("availability"),"ocr_engine":ocr_final.get("benchmark",{}).get("engine_used"),"ocr_confidence":ocr_final.get("benchmark",{}).get("confidence"),"ocr_latency":ocr_final.get("benchmark",{}).get("latency_seconds"),"local_ocr_success_rate":ocr_final.get("benchmark",{}).get("local_ocr_success_rate"),"ocr_cache_hit_rate":ocr_final.get("benchmark",{}).get("cache_hit_rate"),"gemini_fallback_rate":ocr_final.get("benchmark",{}).get("gemini_fallback_rate")}.items())
    payload=html.escape(json.dumps(data,ensure_ascii=False))
    document='''<!doctype html><html><head><meta charset="utf-8"><title>Sehat-Setu AI Evaluation</title><style>body{font:15px system-ui;margin:2rem;background:#f5f7fb;color:#172033}h1{margin-bottom:.2rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem}article,section{background:white;padding:1rem;border-radius:12px;box-shadow:0 2px 12px #0001;margin:1rem 0}article strong{display:block;font-size:1.35rem;margin-top:.4rem}table{width:100%;border-collapse:collapse}td,th{padding:.55rem;border-bottom:1px solid #ddd;text-align:left}input{padding:.6rem;width:min(420px,90%)}details pre{white-space:pre-wrap;max-height:28rem;overflow:auto}</style></head><body><h1>Sehat-Setu AI Evaluation</h1><p>Local report viewer. “Not measured” is never displayed as zero; mocked and blocked results remain labeled.</p><div class="grid">__CARDS__</div><section><h2>Recording results</h2><input id="filter" placeholder="Filter language, category, status, warning"><table><thead><tr><th>ID</th><th>Status</th><th>Language</th><th>WER</th><th>Latency</th><th>Warnings</th></tr></thead><tbody id="voice"></tbody></table></section><section><h2>Whisper tuning</h2><pre id="tuning"></pre></section><section><h2>OCR and Gemini</h2><p>OCR: __OCR__</p><p>Gemini: __GEMINI__</p></section><section><h2>Trend history</h2><p>__HISTORY__ historical report(s) loaded.</p></section><section><h2>Failure explorer / redacted source</h2><details><summary>Expand report data</summary><pre id="raw">__PAYLOAD__</pre></details></section><script>const rows=__ROWS__;const tuning=__TUNING__;const body=document.querySelector('#voice');function render(q=''){body.innerHTML='';rows.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase())).forEach(x=>{let r=body.insertRow();[x.id,x.status,x.language,x.wer??'Not measured',x.processing_duration_seconds??'Not measured',(x.warnings||[]).join(', ')].forEach(v=>r.insertCell().textContent=v??'Not measured');});}render();document.querySelector('#filter').oninput=e=>render(e.target.value);document.querySelector('#tuning').textContent=tuning.length?JSON.stringify(tuning,null,2):'Not measured';</script></body></html>'''
    comparison=data.get("voice_final",{}); comparison_view={"classification":comparison.get("classification"),"models":[{"model":item.get("model"),**{key:item.get("aggregate",{}).get(key) for key in ("average_wer","important_term_recall","medicine_recall","strict_dosage_recall","normalized_dosage_recall","dosage_number_accuracy","dosage_unit_accuracy","frequency_accuracy","timing_instruction_accuracy","negation_preservation_rate","number_preservation","repeated_text_rate","average_processing_seconds")}} for item in comparison.get("models",[])],"safety_sets":data.get("voice_safety",{}).get("sets",{}),"completion":data.get("voice_completion",{}).get("engineering",{})}
    document=document.replace('<section><h2>Whisper tuning</h2>',f'<section><h2>Whisper model comparison</h2><pre>{html.escape(json.dumps(comparison_view,indent=2))}</pre></section><section><h2>Whisper tuning</h2>')
    replacements={"__CARDS__":cards,"__OCR__":html.escape(str(data.get("ocr",{}).get("status","Not measured"))),"__GEMINI__":html.escape(str(data.get("gemini",{}).get("status","Not measured"))),"__HISTORY__":str(len(data.get("history",[]))),"__PAYLOAD__":payload,"__ROWS__":json.dumps(rows,ensure_ascii=False),"__TUNING__":json.dumps(tuning,ensure_ascii=False)}
    for marker,value in replacements.items(): document=document.replace(marker,value)
    OUTPUT.write_text(document,encoding="utf-8"); return OUTPUT

def main()->int:
    parser=argparse.ArgumentParser(); parser.add_argument("--serve",action="store_true"); parser.add_argument("--port",type=int,default=8765); args=parser.parse_args(); path=generate(); print(path)
    if args.serve:
        import os; os.chdir(path.parent); print(f"http://127.0.0.1:{args.port}/{path.name}"); ThreadingHTTPServer(("127.0.0.1",args.port),SimpleHTTPRequestHandler).serve_forever()
    return 0
if __name__=="__main__": raise SystemExit(main())
