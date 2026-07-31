"""Conservative transcript normalization without clinical inference."""

import re


class TextCleanupService:
    """Normalize formatting and common spoken medical measurements."""

    _spaces = re.compile(r"\s+")
    _blood_pressure = re.compile(
        r"\b(?:blood\s+pressure|bp)\s*(?:is|was|of|:)?\s*"
        r"(\d{2,3})\s+(?:by|over)\s+(\d{2,3})\b",
        re.IGNORECASE,
    )
    _dosage = re.compile(
        r"\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml)\b", re.IGNORECASE
    )

    def clean(self, transcript: str) -> str:
        """Return carefully normalized text without adding medical facts."""
        cleaned = self._spaces.sub(" ", transcript).strip()
        cleaned = self._blood_pressure.sub(
            lambda match: f"blood pressure {match.group(1)}/{match.group(2)}",
            cleaned,
        )
        cleaned = self._dosage.sub(
            lambda match: f"{match.group(1)} {match.group(2).lower()}",
            cleaned,
        )
        if cleaned:
            cleaned = cleaned[0].upper() + cleaned[1:]
        if cleaned and cleaned[-1] not in ".!?":
            cleaned += "."
        return cleaned


_cleanup_service = TextCleanupService()


def get_text_cleanup_service() -> TextCleanupService:
    """Return the stateless transcript cleanup service."""
    return _cleanup_service
