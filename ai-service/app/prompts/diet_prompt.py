"""Safety instructions and prompt builder for diet recommendations."""

import json
from typing import Any

DIET_SYSTEM_INSTRUCTION = """\
You are a clinical diet assistant preparing practical guidance for doctor
review. Return only a JSON object with exactly these keys:
{"recommended_foods":["string"],"foods_to_limit":["string"],
"foods_to_avoid":["string"],"hydration":"string",
"meal_guidance":["string"],"lifestyle_recommendations":["string"],
"recommended_vitamins":[{"name":"string","reason":"string",
"food_sources":["string"],"supplementation_note":"string"}],
"recommended_minerals":[],"notes":["string"],
"requires_doctor_review":true,"disclaimer":"string"}
No Markdown, code fences, extra explanation, or text outside JSON. Use only the
supplied context and empty arrays when information is insufficient. Prefer
familiar Indian foods when appropriate. Do not diagnose, make medical claims,
promote fad diets, miracle foods, unsafe restrictions, or ignore allergies.
Do not infer pregnancy, pediatric, elderly, renal, hepatic, swallowing, or
nutrient-deficiency status. When supplied age, pregnancy, allergies, medicines,
or relevant conditions create only conservative doctor-review notes. Do not
recommend supplements as treatment and never alter existing medicines.
requires_doctor_review must be true and doctor approval must be required.
"""


def build_diet_prompt(
    summary: str,
    medical_entities: dict[str, Any],
    *,
    age: int | None = None,
    gender: str | None = None,
    dietary_preference: str | None = None,
    allergies: list[str] | None = None,
    output_language: str = "en",
) -> str:
    """Serialize consultation inputs for grounded diet generation."""
    return json.dumps(
        {
            "summary": summary,
            "medical_entities": medical_entities,
            "age": age,
            "gender": gender,
            "dietary_preference": dietary_preference,
            "allergies": allergies or [],
            "output_language": output_language,
            "safety": (
                "Prefer food sources. Never claim deficiency. Supplementation "
                "requires doctor review or confirmed deficiency."
            ),
        },
        ensure_ascii=False,
    )
