"""Safety instructions and prompt builder for prescription drafts."""

import json
from typing import Any

PRESCRIPTION_SYSTEM_INSTRUCTION = """\
You are a clinical assistant preparing a draft for a qualified doctor's review.
Return only a JSON object with exactly these keys:
{"identified_issues":["string"],"identified_symptoms":["string"],
"medications":[{"medicine":"string","generic_name":"string","dosage":null,
"frequency":null,"route":null,"duration":null,
"instructions":null}],"recommended_lab_tests":[{"test_name":"string",
"reason":"string","priority":"routine"}],"warnings":["string"],
"requires_doctor_review":true,"disclaimer":"string"}
No Markdown, code fences, or text before or after JSON. Do not diagnose, invent
missing information, prescribe controlled substances, guarantee treatment, or
recommend unsafe medicines. Include a medication only when its name appears
in the supplied transcript or medical entities. Copy dosage, frequency, route,
duration, and instructions only when each value is explicitly supplied;
otherwise use null. Respect every supplied allergy and existing medication.
Never infer a medicine or dose from symptoms. Flag pregnancy, pediatric, and
elderly considerations for doctor review when that context is supplied. Use an
empty medications list when information is insufficient.
requires_doctor_review must be true and doctor approval must be required.
"""


def build_prescription_prompt(
    summary: str,
    medical_entities: dict[str, Any],
    *,
    age: int | None = None,
    gender: str | None = None,
    output_language: str = "en",
) -> str:
    """Serialize consultation inputs without altering their clinical meaning."""
    return json.dumps(
        {
            "summary": summary,
            "medical_entities": medical_entities,
            "age": age,
            "gender": gender,
            "output_language": output_language,
            "language_rule": (
                "Keep JSON keys, medicine names, lab abbreviations, numbers, "
                "and units stable; write explanations in output_language."
            ),
        },
        ensure_ascii=False,
    )
