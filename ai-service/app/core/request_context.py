"""Request-scoped identifiers shared by logging and response metadata."""

from contextvars import ContextVar

request_id_context: ContextVar[str] = ContextVar(
    "request_id",
    default="system",
)


def get_request_id() -> str:
    """Return the active safe request identifier."""
    return request_id_context.get()
