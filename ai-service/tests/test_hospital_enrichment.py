"""Hospital classification, safety messaging, and emergency ranking tests."""

import pytest

from app.schemas.hospital import RawHospital
from app.services.hospital_enrichment_service import HospitalEnrichmentService


def hospital(**values) -> RawHospital:
    return RawHospital.model_validate(values)


def enrich(*items: RawHospital, condition: str = "", emergency: bool = True):
    return HospitalEnrichmentService().enrich_and_rank(list(items), condition, emergency)


@pytest.mark.parametrize("name", ["AIIMS Delhi", "Government Hospital Pune", "CHC Rampur", "ESIC Hospital Noida"])
def test_government_keyword_classification(name: str) -> None:
    result = enrich(hospital(name=name))[0]
    assert result.hospital_type == "government"
    assert result.classification_source == "keyword_rule"
    assert result.classification_confidence == 0.9
    assert result.warnings


@pytest.mark.parametrize("name", ["Apollo Hospital", "Fortis Memorial", "Medanta Hospital", "Sharda Hospital"])
def test_private_keyword_classification(name: str) -> None:
    result = enrich(hospital(name=name))[0]
    assert result.hospital_type == "private"
    assert result.classification_source == "keyword_rule"


def test_speciality_inference_is_explicitly_unverified() -> None:
    result = enrich(hospital(name="Sunrise Heart and Cancer Centre"))[0]
    assert result.hospital_type == "speciality"
    assert result.specialities == ["cardiology", "oncology"]
    assert "not verified" in result.warnings[0]


def test_unknown_classification_when_evidence_is_insufficient() -> None:
    result = enrich(hospital(name="Sunrise Medical Centre"))[0]
    assert result.hospital_type == "unknown"
    assert result.classification_source == "unknown"
    assert result.classification_confidence == 0


def test_conflicting_ownership_keywords_fail_closed() -> None:
    result = enrich(hospital(name="Apollo Government Hospital"))[0]
    assert result.hospital_type == "unknown"
    assert result.classification_source == "unknown"
    assert any("Conflicting" in warning for warning in result.warnings)


def test_missing_fields_are_supported() -> None:
    result = enrich(hospital())[0]
    assert result.hospital_type == "unknown"
    assert result.emergency_suitability_score >= 0
    assert "distance unavailable" in result.recommendation_reason


def test_emergency_ranking_rewards_open_trauma_and_operational_status() -> None:
    trauma = hospital(name="City Trauma Emergency Hospital", distance=4000, openNow=True, businessStatus="OPERATIONAL")
    generic = hospital(name="Nearby Clinic", distance=1000, openNow=None, businessStatus="OPERATIONAL")
    ranked = enrich(generic, trauma, condition="major accident")
    assert ranked[0].raw["name"] == trauma.name
    assert ranked[0].emergency_suitability_score > ranked[1].emergency_suitability_score


def test_closed_hospital_is_ranked_below_comparable_open_hospital() -> None:
    closed = hospital(name="Closed Hospital", distance=500, openNow=False, businessStatus="OPERATIONAL")
    opened = hospital(name="Open Hospital", distance=800, openNow=True, businessStatus="OPERATIONAL")
    assert enrich(closed, opened)[0].raw["name"] == "Open Hospital"
    assert any("reported closed" in warning for warning in enrich(closed)[0].warnings)


def test_shorter_distance_prioritized_when_other_factors_equal() -> None:
    near = hospital(name="Near Hospital", distance=500, openNow=True, businessStatus="OPERATIONAL")
    far = hospital(name="Far Hospital", distance=12000, openNow=True, businessStatus="OPERATIONAL")
    assert enrich(far, near)[0].raw["name"] == "Near Hospital"


def test_relevant_speciality_can_outrank_a_nearer_generic_facility() -> None:
    cardiac = hospital(name="Heart Emergency Centre", distance=5000, openNow=True, businessStatus="OPERATIONAL")
    generic = hospital(name="General Hospital", distance=500, openNow=True, businessStatus="OPERATIONAL")
    assert enrich(generic, cardiac, condition="severe chest pain")[0].raw["name"] == cardiac.name


def test_raw_google_data_and_extra_fields_are_preserved() -> None:
    raw = {
        "googlePlaceId": "place-123",
        "name": "Civil Hospital",
        "formattedAddress": "MG Road, Pune",
        "latitude": 18.52,
        "longitude": 73.85,
        "distance": 1250,
        "googleTypes": ["hospital"],
        "primaryType": "hospital",
        "businessStatus": "OPERATIONAL",
        "openNow": True,
        "phoneNumber": "+91-20-12345678",
        "website": "https://example.test",
        "sourcePayloadVersion": 2,
    }
    result = enrich(hospital(**raw))[0]
    assert result.raw == raw


def test_verified_internal_classification_has_highest_priority() -> None:
    item = hospital(name="Apollo Hospital", verifiedHospitalType="government", verifiedSpecialities=["oncology"])
    result = enrich(item)[0]
    assert result.hospital_type == "government"
    assert result.specialities == ["oncology"]
    assert result.classification_source == "verified_database"
    assert result.classification_confidence == 1


def test_unknown_ownership_never_excludes_nearby_hospital() -> None:
    result = enrich(hospital(name="Local Care", distance=100))[0]
    assert len(result.model_dump()) > 0
    assert "did not cause exclusion" in result.recommendation_reason


def test_emergency_api_returns_instruction_ranked_hospitals_and_notice(client) -> None:
    response = client.post("/api/v1/recommend-doctor", json={
        "issue": "severe chest pain and difficulty breathing",
        "nearby_hospitals": [
            {"name": "General Hospital", "distance": 300, "openNow": True},
            {"name": "Heart Emergency Hospital", "distance": 1200, "openNow": True},
        ],
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["emergency_detected"] is True
    assert "112" in data["emergency_instruction"]
    assert "nearest suitable emergency facility" in data["emergency_instruction"]
    assert data["nearby_hospitals"][0]["raw"]["name"] == "Heart Emergency Hospital"
    assert "may be inferred" in data["hospital_classification_notice"]
