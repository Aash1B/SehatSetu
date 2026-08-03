"""Deterministic advanced nutrition safety coverage."""

import asyncio
import pytest
from app.schemas.diet import DietRecommendationRequest
from app.services.nutrition.recommendation_service import NutritionRecommendationService


def generate(**payload):
    return asyncio.run(NutritionRecommendationService().generate(DietRecommendationRequest(**payload)))


def test_diabetes_produces_low_gi_guidance():
    result = generate(conditions=["type 2 diabetes"])
    assert result.glycemic_guidance.low_gi_recommended
    assert "low-GI diet" in result.diet_strategy.diet_type


def test_obesity_produces_calorie_and_protein_guidance():
    result = generate(conditions=["obesity"])
    assert "calorie-controlled plan" in result.diet_strategy.diet_type
    assert result.protein_recommendation.strategy == "high-protein"


def test_kidney_disease_never_defaults_to_high_protein():
    result = generate(conditions=["chronic kidney disease"])
    assert result.protein_recommendation.strategy == "clinician-guided protein intake"
    assert any("Kidney" in warning for warning in result.warnings)


def test_vitamin_d_food_first_without_dose():
    result = generate(conditions=["vitamin D deficiency"], lab_values=[{"name": "vitamin D", "value": 14, "unit": "ng/mL"}])
    vitamin = next(item for item in result.vitamins if item.name == "Vitamin D")
    assert vitamin.food_sources
    assert "confirmed by a doctor" in vitamin.supplement_note
    assert not any(char.isdigit() for char in vitamin.supplement_note)


def test_anaemia_pairs_iron_and_vitamin_c():
    result = generate(conditions=["anaemia"])
    assert any(item.name == "Iron" for item in result.minerals)
    assert any(item.name == "Vitamin C" for item in result.vitamins)


def test_allergy_foods_are_removed():
    result = generate(conditions=["obesity"], allergies=["soy", "nuts"], dietary_preference="vegetarian")
    combined = " ".join(result.recommended_foods + result.protein_recommendation.food_sources).lower()
    assert "soy" not in combined and "nuts" not in combined


@pytest.mark.parametrize("preference", ["vegetarian", "vegan"])
def test_vegetarian_meal_plan_has_no_meat(preference):
    result = generate(conditions=["diabetes"], dietary_preference=preference)
    assert "chicken" not in str(result.sample_meal_plan).lower()
    assert "fish" not in str(result.sample_meal_plan).lower()


def test_lab_value_increases_nutrient_priority():
    result = generate(symptoms=["fatigue"], lab_values=[{"name": "vitamin D", "value": 10, "unit": "ng/mL"}])
    assert next(item for item in result.vitamins if item.name == "Vitamin D").priority == "high"


def test_metformin_adds_b12_monitoring_caution():
    result = generate(conditions=["diabetes"], medications=["Metformin"])
    assert any(item.name == "Vitamin B12" for item in result.vitamins)


def test_invalid_advanced_input_uses_validation_error(client):
    response = client.post("/api/v1/diet-recommendation", json={"conditions": [], "symptoms": []})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

