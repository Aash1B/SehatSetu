"""Typed clinical note fallback and source-priority coverage."""

URL = "/api/v1/generate-consultation"


def base_payload():
    return {"transcript": "", "typed_notes": {"symptoms": ["fever", "sore throat", "body pain"], "medicines": [{"name": "Paracetamol", "dosage": "500 mg", "frequency": "twice daily", "duration": "3 days"}], "diagnosis": "Suspected viral infection", "allergies": ["penicillin"], "doctor_notes": "Advise hydration and rest"}, "patient_context": {"age": 28, "gender": "female", "conditions": []}}


def test_empty_transcript_uses_typed_symptoms(client):
    data = client.post(URL, json=base_payload()).json()["data"]
    assert data["input_sources"] == {"speech_used": False, "typed_notes_used": True, "ocr_used": False}
    assert any(item["value"] == "fever" for item in data["identified_symptoms"])


def test_failed_transcription_still_generates_complete_response(client):
    payload = base_payload(); payload["transcription_failed"] = True
    data = client.post(URL, json=payload).json()["data"]
    assert data["diet_recommendation"] and data["doctor_recommendation"] and data["consultation_summary"]


def test_doctor_confirmed_medicine_is_preserved_exactly(client):
    payload = base_payload(); payload["confirmed_fields"] = {"medicines": [{"name": "Brand-X 12.5", "dosage": "exact dose", "frequency": "as entered"}]}
    medication = client.post(URL, json=payload).json()["data"]["medications"][0]
    assert medication["name"] == "Brand-X 12.5" and medication["source"] == "doctor_confirmed"


def test_typed_medicine_not_overwritten_or_augmented(client):
    medications = client.post(URL, json=base_payload()).json()["data"]["medications"]
    assert len(medications) == 1 and medications[0]["name"] == "Paracetamol"


def test_transcript_and_typed_notes_merge_without_duplicates(client):
    payload = base_payload(); payload["transcript"] = "Patient has fever and cough"
    symptoms = client.post(URL, json=payload).json()["data"]["identified_symptoms"]
    assert [item["value"] for item in symptoms].count("fever") == 1
    assert any(item["value"] == "cough" and item["source"] == "speech_transcript" for item in symptoms)


def test_allergies_and_sources_are_retained(client):
    data = client.post(URL, json=base_payload()).json()["data"]
    assert data["allergies"][0] == {"value": "penicillin", "source": "doctor_typed", "confidence": 1.0}


def test_typed_emergency_triggers_triage(client):
    payload = base_payload(); payload["typed_notes"]["symptoms"] = ["chest pain", "shortness of breath"]
    assert client.post(URL, json=payload).json()["data"]["emergency_triage"]["emergency_detected"]


def test_typed_notes_generate_labs_and_diet(client):
    data = client.post(URL, json=base_payload()).json()["data"]
    assert data["recommended_lab_tests"] and data["diet_recommendation"]["requires_doctor_review"]


def test_speech_only_workflow_remains_supported(client):
    response = client.post(URL, json={"transcript": "Patient reports fever and cough for three days"})
    assert response.status_code == 200
    assert response.json()["data"]["input_sources"]["speech_used"]

