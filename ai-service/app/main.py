"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import json
from pathlib import Path
import re
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.schemas.common import ApiResponse
from app.core.ffmpeg import get_ffmpeg_status
from app.core.request_context import request_id_context

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Log application lifecycle events."""
    logger.info(
        "Starting %s version %s in %s",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    ffmpeg_status = get_ffmpeg_status(settings)
    logger.info(
        "FFmpeg path from settings: %s",
        ffmpeg_status.configured_path or "None",
    )
    logger.info("FFmpeg PATH detection: %s", ffmpeg_status.path_detection)
    if ffmpeg_status.available:
        logger.info(
            "FFmpeg available path=%s version=%s",
            ffmpeg_status.path,
            ffmpeg_status.version,
        )
    else:
        logger.warning(
            "FFmpeg unavailable reason=%s searched_locations=%s",
            ffmpeg_status.reason,
            ffmpeg_status.searched_locations,
        )
    yield
    logger.info("Shutting down %s", settings.app_name)


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Versioned API for the Sehat-Setu AI healthcare microservice. "
            "Supports local audio transcription and hybrid medical entity "
            "extraction while preserving the versioned API contracts."
        ),
        debug=settings.debug,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    def custom_openapi() -> dict[str, object]:
        """Document the internal API-key header used by protected endpoints."""
        if application.openapi_schema:
            return application.openapi_schema

        schema = get_openapi(
            title=application.title,
            version=application.version,
            description=application.description,
            routes=application.routes,
        )
        components = schema.setdefault("components", {})
        security_schemes = components.setdefault("securitySchemes", {})
        security_schemes["InternalApiKey"] = {
            "type": "apiKey",
            "in": "header",
            "name": "X-Internal-API-Key",
        }
        for path_item in schema.get("paths", {}).values():
            for operation in path_item.values():
                if isinstance(operation, dict) and "responses" in operation:
                    operation["security"] = [{"InternalApiKey": []}]

        application.openapi_schema = schema
        return schema

    application.openapi = custom_openapi

    @application.middleware("http")
    async def require_internal_key(request: Request, call_next):
        """Protect non-public HTTP endpoints when an internal key is configured."""
        public_paths = {"/", "/health", "/readiness", "/docs", "/openapi.json", "/redoc"}
        configured = settings.internal_api_key
        if (
            configured
            and settings.app_env.casefold() != "testing"
            and request.url.path not in public_paths
        ):
            supplied = request.headers.get("X-Internal-API-Key", "")
            if supplied != configured.get_secret_value():
                return JSONResponse(
                    status_code=401,
                    content={
                        "success": False,
                        "error": {
                            "code": "INTERNAL_AUTH_FAILED",
                            "message": "Internal service authentication failed.",
                        },
                    },
                )
        return await call_next(request)

    @application.get("/health", include_in_schema=False)
    async def process_health() -> dict[str, str]:
        return {"status": "healthy", "service": settings.app_name}

    @application.get("/readiness", include_in_schema=False)
    async def readiness() -> dict[str, object]:
        from app.core.ffmpeg import get_ffmpeg_status

        ffmpeg = get_ffmpeg_status(settings)
        return {
            "status": "ready",
            "ffmpeg": {"available": ffmpeg.available, "path": ffmpeg.path},
            "gemini_configured": bool(settings.gemini_api_key),
        }

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def request_metadata_middleware(
        request: Request,
        call_next,
    ) -> Response:
        """Correlate requests and add timing metadata to every JSON response."""
        supplied_id = request.headers.get("X-Request-ID", "")
        request_id = (
            supplied_id
            if REQUEST_ID_PATTERN.fullmatch(supplied_id)
            else uuid4().hex
        )
        token = request_id_context.set(request_id)
        started = perf_counter()
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            content_type = response.headers.get("content-type", "")
            if "application/json" not in content_type:
                return response
            body = b"".join([chunk async for chunk in response.body_iterator])
            try:
                payload = json.loads(body)
            except (TypeError, json.JSONDecodeError):
                return Response(
                    content=body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=content_type,
                    background=response.background,
                )
            if isinstance(payload, dict):
                payload["meta"] = {
                    "request_id": request_id,
                    "processing_time_ms": round(
                        (perf_counter() - started) * 1000,
                        3,
                    ),
                }
            headers = dict(response.headers)
            headers.pop("content-length", None)
            return Response(
                content=json.dumps(payload, ensure_ascii=False),
                status_code=response.status_code,
                headers=headers,
                media_type="application/json",
                background=response.background,
            )
        finally:
            request_id_context.reset(token)

    application.include_router(api_router)
    static_directory = Path(__file__).parent / "static"
    application.mount(
        "/static",
        StaticFiles(directory=static_directory),
        name="static",
    )
    register_exception_handlers(application)

    @application.get(
        "/",
        response_model=ApiResponse[dict[str, str]],
        summary="Service information",
        tags=["Service"],
    )
    async def root() -> ApiResponse[dict[str, str]]:
        """Return basic service information."""
        return ApiResponse(
            message=f"{settings.app_name} is running",
            data={"docs": "/docs", "health": f"{settings.api_v1_prefix}/health"},
        )

    @application.get(
        "/live-audio",
        response_class=FileResponse,
        summary="Live microphone transcription test page",
        tags=["Development"],
        include_in_schema=True,
    )
    async def live_audio() -> FileResponse:
        """Serve the framework-free local microphone testing utility."""
        return FileResponse(static_directory / "live_audio.html")

    return application


app = create_application()
