"""Application exceptions and global FastAPI exception handlers."""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.schemas.common import ErrorDetail, ErrorResponse

logger = get_logger(__name__)


class AppException(Exception):
    """Reusable exception for expected application-level failures."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "APPLICATION_ERROR",
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def _error_response(
    status_code: int,
    message: str,
    code: str,
    details: Any | None = None,
) -> JSONResponse:
    safe_details = {} if details is None else details
    body = ErrorResponse(
        message=message,
        error=ErrorDetail(code=code, details=safe_details),
    )
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(body),
    )


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    """Handle known application errors."""
    return _error_response(exc.status_code, exc.message, exc.code, exc.details)


async def http_exception_handler(
    _: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Normalize framework HTTP errors."""
    message = str(exc.detail) if exc.detail else "HTTP request failed"
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    return _error_response(exc.status_code, message, code)


async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return safe field-level request validation details."""
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return _error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "Request validation failed",
        "VALIDATION_ERROR",
        details,
    )


async def unexpected_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Log unexpected failures without exposing internal details."""
    logger.exception(
        "Unexpected error while handling %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "An unexpected error occurred",
        "INTERNAL_SERVER_ERROR",
    )


def register_exception_handlers(application: FastAPI) -> None:
    """Register all global exception handlers."""
    application.add_exception_handler(AppException, app_exception_handler)
    application.add_exception_handler(
        StarletteHTTPException, http_exception_handler
    )
    application.add_exception_handler(
        RequestValidationError, validation_exception_handler
    )
    application.add_exception_handler(Exception, unexpected_exception_handler)
