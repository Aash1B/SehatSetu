"""Overlap-aware multilingual transcript merging."""

import re


def _tokens(text: str) -> list[str]:
    return re.findall(r"[\w\u0900-\u097f]+|[^\w\s]", text, re.UNICODE)


def merge_transcripts(previous: str, current: str) -> str:
    """Remove only the longest meaningful boundary overlap."""
    if not previous.strip():
        return current.strip()
    if not current.strip():
        return previous.strip()
    left, right = _tokens(previous), _tokens(current)
    left_normalized = [token.casefold() for token in left]
    right_normalized = [token.casefold() for token in right]
    overlap = 0
    for size in range(min(len(left), len(right)), 1, -1):
        if left_normalized[-size:] == right_normalized[:size]:
            overlap = size
            break
    new_tokens = right[overlap:]
    if not new_tokens:
        return previous.strip()
    suffix = " ".join(new_tokens)
    suffix = re.sub(r"\s+([.,!?;:])", r"\1", suffix)
    return f"{previous.rstrip()} {suffix}".strip()


def last_n_words(text: str, count: int = 50) -> str:
    """Return bounded recent context without repeating a whole transcript."""
    words = text.split()
    return " ".join(words[-count:])
