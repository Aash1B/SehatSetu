"""Validate dotenv syntax and real Settings loading without revealing values."""

from __future__ import annotations
import argparse, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
REQUIRED_FOR_AUDIO = ("FFMPEG_PATH",)
OPTIONAL_SECRETS = ("GEMINI_API_KEY", "INTERNAL_API_KEY")

def validate(path: Path) -> tuple[list[dict[str, object]], list[str], list[str]]:
    malformed=[]; names=set()
    for number, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line=raw.strip()
        if not line or line.startswith("#"): continue
        if "=" not in line:
            malformed.append({"line":number,"reason":"missing equals sign"}); continue
        key, value=line.split("=",1); key=key.strip()
        if not KEY.fullmatch(key):
            malformed.append({"line":number,"reason":"invalid variable name"}); continue
        if value.count('"') % 2 or value.count("'") % 2:
            malformed.append({"line":number,"key":key,"reason":"unbalanced quotes"})
        names.add(key)
    missing=[key for key in REQUIRED_FOR_AUDIO if key not in names]
    absent_optional=[key for key in OPTIONAL_SECRETS if key not in names]
    return malformed, missing, absent_optional

def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument("--env-file",type=Path,default=ROOT/".env"); args=parser.parse_args()
    malformed,missing,optional=validate(args.env_file.resolve())
    try:
        from app.core.config import Settings
        Settings(_env_file=args.env_file.resolve())
        settings_loaded=True
    except Exception as exc:
        settings_loaded=False; malformed.append({"line":None,"reason":f"Settings validation failed: {type(exc).__name__}"})
    print(f"settings_loaded={str(settings_loaded).lower()}")
    print("malformed=" + (",".join(f"line {x['line']}: {x['reason']}" for x in malformed) or "none"))
    print("missing_required_names=" + (",".join(missing) or "none"))
    print("missing_optional_names=" + (",".join(optional) or "none"))
    return 1 if malformed or missing else 0

if __name__=="__main__": raise SystemExit(main())
