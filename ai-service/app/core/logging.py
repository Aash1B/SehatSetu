"""Simple application-wide logging configuration."""

import logging

from app.core.request_context import get_request_id

LOG_FORMAT = (
    "%(asctime)s | %(levelname)s | %(name)s | "
    "request_id=%(request_id)s | %(message)s"
)


class RequestContextFilter(logging.Filter):
    """Attach the current request ID without changing every log statement."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


def configure_logging(log_level: str) -> None:
    """Configure the root logger without adding duplicate handlers."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger = logging.getLogger()

    if not root_logger.handlers:
        logging.basicConfig(level=level, format=LOG_FORMAT)
    else:
        root_logger.setLevel(level)
        formatter = logging.Formatter(LOG_FORMAT)
        for handler in root_logger.handlers:
            handler.setLevel(level)
            handler.setFormatter(formatter)
    for handler in root_logger.handlers:
        if not any(
            isinstance(item, RequestContextFilter)
            for item in handler.filters
        ):
            handler.addFilter(RequestContextFilter())


def get_logger(name: str) -> logging.Logger:
    """Return a named logger."""
    return logging.getLogger(name)
