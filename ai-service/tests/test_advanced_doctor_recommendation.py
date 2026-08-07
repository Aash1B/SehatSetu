"""Advanced emergency triage and ranked specialty coverage."""

import pytest


def recommend(client, complaint="", symptoms=None, **extra):
    return client.post("/api/v1/recommend-doctor", json={"chief_complaint": complaint, "symptoms": symptoms or [], **extra}).json()["data"]


def test_chest_pain_with_breathlessness_is_emergency(client):
    data = recommend(client, "chest pain and shortness of breath", severity="severe")
    assert data["emergency_detected"] and data["urgency"] == "emergency"
    assert data["recommended_specialties"][0]["specialty"] == "Emergency Medicine"


@pytest.mark.parametrize("complaint", ["face droop and slurred speech", "weakness on one side", "allergic reaction with throat swelling"])
def test_high_risk_red_flags_are_emergencies(client, complaint):
    assert recommend(client, complaint)["emergency_detected"]


@pytest.mark.parametrize(("complaint", "specialty"), [("itchy skin rash", "Dermatologist"), ("type 2 diabetes review", "Endocrin"), ("child has fever", "Pediatric")])
def test_specialty_mapping(client, complaint, specialty):
    data = recommend(client, complaint, age=8 if "child" in complaint else 40)
    assert any(specialty in item["specialty"] for item in data["recommended_specialties"])


def test_insufficient_information(client):
    assert recommend(client)["urgency"] == "insufficient_information"


def test_emergency_does_not_require_provider(client):
    data = recommend(client, "severe chest pain with difficulty breathing")
    assert data["recommendation_source"] == "emergency_rules"


def test_no_individual_names_and_max_three(client):
    data = recommend(client, "rash and joint pain with headache")
    assert len(data["recommended_specialties"]) <= 3
    assert not any("Dr." in item["specialty"] for item in data["recommended_specialties"])

