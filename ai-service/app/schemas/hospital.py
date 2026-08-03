"""Validated contracts for raw and interpreted hospital data."""

from enum import Enum
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class HospitalType(str, Enum):
    GOVERNMENT = "government"
    PRIVATE = "private"
    SPECIALITY = "speciality"
    UNKNOWN = "unknown"


class ClassificationSource(str, Enum):
    VERIFIED_DATABASE = "verified_database"
    KEYWORD_RULE = "keyword_rule"
    AI_INFERENCE = "ai_inference"
    UNKNOWN = "unknown"


class RawHospital(BaseModel):
    """Google Places hospital data plus optional trusted internal metadata."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    google_place_id: str | None = Field(default=None, alias="googlePlaceId")
    name: str | None = None
    formatted_address: str | None = Field(default=None, alias="formattedAddress")
    latitude: float | None = None
    longitude: float | None = None
    distance: float | None = Field(default=None, ge=0, description="Distance in metres")
    rating: float | None = Field(default=None, ge=0, le=5)
    user_rating_count: int | None = Field(default=None, alias="userRatingCount", ge=0)
    google_types: list[str] = Field(default_factory=list, alias="googleTypes")
    primary_type: str | None = Field(default=None, alias="primaryType")
    business_status: str | None = Field(default=None, alias="businessStatus")
    open_now: bool | None = Field(default=None, alias="openNow")
    phone_number: str | None = Field(default=None, alias="phoneNumber")
    website: str | None = None
    verified_hospital_type: HospitalType | None = Field(
        default=None,
        validation_alias=AliasChoices("verified_hospital_type", "verifiedHospitalType"),
        exclude=True,
        description="Trusted internal classification, never populated from Google Places",
    )
    verified_specialities: list[str] | None = Field(
        default=None,
        validation_alias=AliasChoices("verified_specialities", "verifiedSpecialities"),
        exclude=True,
    )


class EnrichedHospital(BaseModel):
    """Raw hospital data preserved alongside cautious interpretation."""

    raw: dict[str, Any]
    hospital_type: HospitalType
    specialities: list[str] = Field(default_factory=list)
    classification_source: ClassificationSource
    classification_confidence: float = Field(ge=0, le=1)
    emergency_suitability_score: float = Field(ge=0, le=100)
    recommendation_reason: str
    warnings: list[str] = Field(default_factory=list)


class HospitalEnrichmentRequest(BaseModel):
    hospitals: list[RawHospital] = Field(default_factory=list, max_length=100)
    condition: str | None = Field(default=None, max_length=2_000)
    emergency_detected: bool = False


class HospitalEnrichmentResponse(BaseModel):
    hospitals: list[EnrichedHospital]
    classification_notice: str
