"""Reusable success and error response schemas."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

from app.core.request_context import get_request_id

DataT = TypeVar("DataT")


class ResponseMeta(BaseModel):
    """Request correlation and server processing metadata."""

    request_id: str = Field(default_factory=get_request_id)
    processing_time_ms: float = Field(default=0, ge=0)


class ApiResponse(BaseModel, Generic[DataT]):
    """Standard successful API response."""

    success: bool = True
    message: str = "Operation completed"
    data: DataT
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


class ErrorDetail(BaseModel):
    """Machine-readable error information."""

    code: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    """Standard unsuccessful API response."""

    success: bool = False
    message: str = "An error occurred"
    error: ErrorDetail
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
