"""Dashboard report-loading and metric tests."""
import json
from pathlib import Path
from evaluation_dashboard.data_loader import load_reports
from evaluation_dashboard.metrics import display,overview

def test_missing_reports_are_not_measured(tmp_path:Path)->None:
    data=load_reports(tmp_path); assert data["voice"]["status"]=="NOT_MEASURED"; assert display(None)=="Not measured"

def test_secrets_are_redacted_and_counts_preserved(tmp_path:Path)->None:
    (tmp_path/"final-verification.json").write_text(json.dumps({"overall_status":"PARTIAL","counts":{"PASSED":3},"api_key":"do-not-show"}),encoding="utf-8")
    data=load_reports(tmp_path); assert data["verification"]["api_key"]=="[REDACTED]"; assert overview(data)["PASSED"]==3
