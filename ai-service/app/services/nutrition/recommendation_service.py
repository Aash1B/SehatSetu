"""Safety-first nutrition recommendation rules independent of an LLM."""

from app.schemas.diet import (
    DietRecommendationData, DietRecommendationRequest, DietStrategy,
    GlycemicGuidance, NutrientRecommendation, ProteinRecommendation,
    SampleMealPlan,
)


DISCLAIMER = (
    "Educational guidance only. A doctor or registered dietitian must confirm "
    "this plan and any supplement use. Do not change medicines based on this response."
)


def _has(text: str, *terms: str) -> bool:
    return any(term in text for term in terms)


class NutritionRecommendationService:
    """Apply deterministic condition, nutrient, allergy, and preference rules."""

    async def generate(self, request: DietRecommendationRequest) -> DietRecommendationData:
        text = " ".join([request.summary, *request.conditions, *request.symptoms]).lower()
        preference = (request.dietary_preference or " ".join(request.dietary_preferences) or "balanced").lower()
        allergies = {item.lower().strip() for item in request.allergies}
        diet_types: list[str] = []
        goals: list[str] = []
        reasoning: list[str] = []
        foods = ["seasonal vegetables", "whole grains", "dal and legumes", "unsweetened curd"]
        limit = ["ultra-processed foods", "sugary drinks"]
        warnings: list[str] = []
        vitamins: list[NutrientRecommendation] = []
        minerals: list[NutrientRecommendation] = []
        low_gi = _has(text, "diabetes", "insulin resistance", "pcos")
        protein_strategy = "moderate-protein"

        if low_gi:
            diet_types += ["low-GI diet", "controlled-carbohydrate meals", "high-fibre diet"]
            goals += ["support steadier blood glucose", "pair carbohydrates with protein and fibre"]
            reasoning.append("Diabetes, insulin resistance, or PCOS benefits from lower-glycaemic balanced meals.")
            foods += ["steel-cut oats", "millets in controlled portions", "beans", "non-starchy vegetables"]
            limit += ["refined flour", "sweets", "large portions of white rice"]
        if _has(text, "obesity", "overweight"):
            diet_types += ["calorie-controlled plan", "high-fibre meals", "portion control"]
            goals.append("support gradual sustainable weight reduction")
            protein_strategy = "high-protein"
        if _has(text, "hypertension", "high blood pressure"):
            diet_types += ["DASH-style pattern", "low-sodium diet"]
            goals.append("reduce excess sodium")
            limit += ["pickles", "papad", "packaged salty snacks"]
        kidney = _has(text, "kidney disease", "ckd", "renal failure", "renal disease")
        if kidney:
            protein_strategy = "clinician-guided protein intake"
            warnings.append("Kidney disease requires clinician-guided protein, potassium, sodium, phosphorus, and fluid targets based on current labs.")
        if _has(text, "liver failure", "cirrhosis", "severe liver"):
            protein_strategy = "clinician-guided protein intake"
            warnings.append("Severe liver disease requires an individualized clinician-reviewed protein plan.")
        if _has(text, "anaemia", "anemia", "low haemoglobin", "low hemoglobin"):
            minerals.append(NutrientRecommendation(name="Iron", reason="Anaemia or low haemoglobin reported", food_sources=["lentils", "rajma", "spinach", "sesame seeds"], supplement_note="Iron supplementation requires confirmed deficiency and doctor review", supplementation_note="Iron supplementation requires confirmed deficiency and doctor review", priority="high", evidence=["reported condition/symptoms"]))
            vitamins.append(NutrientRecommendation(name="Vitamin C", reason="Supports absorption of food-source iron", food_sources=["amla", "guava", "lemon", "capsicum"], supplement_note="Prefer food sources unless a clinician confirms supplementation", supplementation_note="Prefer food sources unless a clinician confirms supplementation", evidence=["iron absorption pairing"]))
            foods += ["lentils with lemon", "spinach", "sesame seeds"]
        vitamin_d_low = _has(text, "vitamin d deficiency", "low vitamin d")
        for lab in request.lab_values:
            if "vitamin d" in lab.name.lower():
                try:
                    vitamin_d_low = vitamin_d_low or float(lab.value) < 20
                except (TypeError, ValueError):
                    pass
        if vitamin_d_low:
            vitamins.append(NutrientRecommendation(name="Vitamin D", reason="Low vitamin D level reported", food_sources=["fortified milk", "UV-exposed mushrooms", "egg yolk"], supplement_note="Supplement dosage must be confirmed by a doctor", supplementation_note="Supplement dosage must be confirmed by a doctor", priority="high", evidence=["reported condition or lab value"]))
            warnings.append("Use safe, brief sunlight exposure appropriate for skin type and climate; avoid sunburn. Vitamin D dose requires medical review.")
        if _has(text, "high cholesterol", "hyperlipidemia"):
            diet_types.append("heart-healthy soluble-fibre pattern")
            foods += ["oats", "barley", "flaxseed", "nuts in small portions"]
            limit += ["trans fats", "fried foods", "excess saturated fat"]
        if _has(text, "thyroid", "hypothyroid", "hyperthyroid"):
            warnings.append("Thyroid supplements and iodine intake require medical review; take levothyroxine exactly as prescribed and separate it from iron/calcium as directed.")
        if any("metformin" in medicine.lower() for medicine in request.medications):
            vitamins.append(NutrientRecommendation(name="Vitamin B12", reason="Long-term metformin use can warrant clinician-directed B12 monitoring", food_sources=["milk", "curd", "eggs", "fortified foods"], supplement_note="Test and confirm with a clinician before supplementation", supplementation_note="Test and confirm with a clinician before supplementation", priority="medium", evidence=["medication-related caution"]))

        vegetarian = any(term in preference for term in ("vegetarian", "vegan", "eggitarian"))
        vegan = "vegan" in preference
        protein_sources = ["dal", "chana", "rajma", "tofu", "soy chunks"] if vegetarian else ["dal", "eggs", "fish", "skinless chicken"]
        if not vegan and vegetarian:
            protein_sources += ["paneer", "unsweetened curd"]
        meal = SampleMealPlan(
            early_morning=["Water; avoid added sugar"],
            breakfast=["Vegetable oats or moong chilla with a protein side"],
            mid_morning=["One whole seasonal fruit"],
            lunch=["Half plate vegetables, dal/protein, salad, and controlled whole-grain roti or rice"],
            evening_snack=["Roasted chana or unsalted nuts"],
            dinner=["Vegetable sabzi with dal/tofu and one or two whole-grain rotis"],
            bedtime=[] if vegan else ["Unsweetened milk if appropriate"],
        )
        unsafe = {item for item in allergies if item}
        def safe(values: list[str]) -> list[str]:
            return list(dict.fromkeys(value for value in values if not any(allergen in value.lower() for allergen in unsafe)))
        for field in type(meal).model_fields:
            setattr(meal, field, safe(getattr(meal, field)))
        return DietRecommendationData(
            diet_strategy=DietStrategy(diet_type=list(dict.fromkeys(diet_types or ["balanced plate pattern"])), goals=list(dict.fromkeys(goals or ["support adequate nutrition"])), reasoning=reasoning),
            recommended_foods=safe(foods), foods_to_limit=safe(limit), foods_to_avoid=[],
            vitamins=vitamins, minerals=minerals, recommended_vitamins=vitamins, recommended_minerals=minerals,
            protein_recommendation=ProteinRecommendation(recommended=True, strategy=protein_strategy, food_sources=safe(protein_sources), cautions=warnings if kidney else []),
            glycemic_guidance=GlycemicGuidance(low_gi_recommended=low_gi, preferred_carbohydrates=["oats", "millets", "whole-grain roti", "beans"] if low_gi else ["whole grains"], foods_to_limit=["sugary drinks", "refined grains"] if low_gi else [], meal_pairing_tips=["Pair carbohydrate portions with protein, vegetables, and healthy fat"] if low_gi else []),
            sample_meal_plan=meal, warnings=warnings, requires_doctor_review=True, disclaimer=DISCLAIMER,
        )
