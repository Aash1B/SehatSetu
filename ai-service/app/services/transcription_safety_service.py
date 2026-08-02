"""Deterministic transcription safety analysis; never rewrites raw text."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from difflib import SequenceMatcher
import re
import unicodedata

NUMBER_WORDS = {
    "zero":"0", "one":"1", "two":"2", "three":"3", "four":"4",
    "five":"5", "six":"6", "seven":"7", "eight":"8", "nine":"9",
    "ten":"10", "eleven":"11", "twelve":"12", "thirteen":"13",
    "fourteen":"14", "fifteen":"15", "sixteen":"16", "seventeen":"17",
    "eighteen":"18", "nineteen":"19", "twenty":"20", "fifty":"50",
    "hundred":"100",
}
UNITS = {
    "milligram":"mg", "milligrams":"mg", "mg":"mg",
    "microgram":"mcg", "micrograms":"mcg", "mcg":"mcg", "μg":"mcg", "µg":"mcg",
    "millilitre":"ml", "millilitres":"ml", "milliliter":"ml", "milliliters":"ml", "ml":"ml",
    "international unit":"iu", "international units":"iu", "iu":"iu",
    "tablet":"tablet", "tablets":"tablet", "tab":"tablet", "tabs":"tablet",
}
FREQUENCIES = {
    "once daily":"once daily", "one time daily":"once daily", "1 time daily":"once daily", "od":"once daily",
    "twice daily":"twice daily", "two times daily":"twice daily", "2 times daily":"twice daily", "bid":"twice daily",
    "three times daily":"three times daily", "three times a day":"three times daily", "3 times daily":"three times daily", "3 times a day":"three times daily", "tid":"three times daily",
}
TIMINGS = ("before food", "after food", "before breakfast", "after breakfast", "at bedtime")
NEGATIONS = ("no", "not", "denies", "denied", "without", "negative", "never", "does not", "did not", "नहीं", "नहीं है", "nahi", "nahi hai", "bina")
MEDICINES = ("paracetamol", "azithromycin", "amoxicillin", "metformin", "pantoprazole", "levothyroxine", "atorvastatin", "amlodipine", "cetirizine", "salbutamol", "sumatriptan")
PRONUNCIATION_CANDIDATES = {
    "panto presol":"pantoprazole", "panto-presol":"pantoprazole",
    "level thyroxine":"levothyroxine", "a tour of a statin":"atorvastatin",
    "met four men":"metformin",
}
DOSAGE_CONTEXT = re.compile(r"\b(?:\d+(?:\.\d+)?|one|two|three|five|ten|fifty)\s*(?:mg|mcg|µg|μg|ml|milligrams?|micrograms?|tablets?|tabs?|iu)\b|\b(?:once|twice|daily|bid|tid|od|before food|after food)\b", re.I)


def normalized_text(text: str) -> str:
    value = unicodedata.normalize("NFKC", text).casefold().replace("μ", "µ")
    value = re.sub(r"[^\w\s./µ]", " ", value)
    return " ".join(value.split())


def canonicalize_medical_expression(text: str, *, abbreviations: bool = True) -> str:
    """Canonicalize only explicitly safe scoring equivalences."""
    value = normalized_text(text)
    tens={"twenty":20,"thirty":30,"forty":40,"fifty":50,"sixty":60,"seventy":70,"eighty":80,"ninety":90}
    ones={word:int(digit) for word,digit in NUMBER_WORDS.items() if digit.isdigit() and int(digit)<20}
    def compound(match: re.Match[str]) -> str:
        parts=[x for x in match.group(0).split() if x!="and"]; total=0
        if "hundred" in parts:
            index=parts.index("hundred"); total=ones.get(parts[index-1],1)*100; parts=parts[index+1:]
        if parts:
            total+=tens.get(parts[0],ones.get(parts[0],0))
            if len(parts)>1: total+=ones.get(parts[1],0)
        return str(total)
    words="|".join(sorted(set(ones)|set(tens),key=len,reverse=True))
    value=re.sub(rf"\b(?:{words})(?:\s+hundred)?(?:\s+and)?(?:\s+(?:{words}))?\b",compound,value)
    for phrase, canonical in sorted(FREQUENCIES.items(), key=lambda x: -len(x[0])):
        if abbreviations or phrase not in {"od", "bid", "tid"}:
            value = re.sub(rf"\b{re.escape(phrase)}\b", canonical, value)
    for phrase, canonical in sorted(UNITS.items(), key=lambda x: -len(x[0])):
        value = re.sub(rf"\b{re.escape(phrase)}\b", canonical, value)
    for word, digit in NUMBER_WORDS.items():
        value = re.sub(rf"\b{word}\b", digit, value)
    return " ".join(value.split())


def _present(term: str, text: str, *, canonical: bool) -> bool:
    transform = canonicalize_medical_expression if canonical else normalized_text
    return transform(term) in transform(text)


def recall(terms: list[str], actual: str, *, canonical: bool = False) -> float | None:
    return sum(_present(x, actual, canonical=canonical) for x in terms) / len(terms) if terms else None


def _tokens(pattern: str, text: str) -> tuple[str, ...]:
    return tuple(re.findall(pattern, canonicalize_medical_expression(text), re.I))


@dataclass(frozen=True)
class DosageMetrics:
    strict_dosage_recall: float | None
    normalized_dosage_recall: float | None
    dosage_number_accuracy: float | None
    dosage_unit_accuracy: float | None
    frequency_accuracy: float | None
    timing_instruction_accuracy: float | None


def score_dosages(expected_terms: list[str], expected_text: str, actual_text: str) -> DosageMetrics:
    numbers = r"\b\d+(?:\.\d+)?\b"
    units = r"\b(?:mg|mcg|ml|iu|tablet)\b"
    frequencies = r"\b(?:once daily|twice daily|three times daily)\b"
    def accuracy(pattern: str) -> float | None:
        expected = _tokens(pattern, expected_text)
        return float(expected == _tokens(pattern, actual_text)) if expected else None
    expected_timings = [x for x in TIMINGS if x in canonicalize_medical_expression(expected_text)]
    return DosageMetrics(
        strict_dosage_recall=recall(expected_terms, actual_text),
        normalized_dosage_recall=recall(expected_terms, actual_text, canonical=True),
        dosage_number_accuracy=accuracy(numbers), dosage_unit_accuracy=accuracy(units),
        frequency_accuracy=accuracy(frequencies),
        timing_instruction_accuracy=recall(expected_timings, actual_text, canonical=True),
    )


@dataclass(frozen=True)
class RepetitionAnalysis:
    detected: bool
    reasons: tuple[str, ...]
    affected_segment_indexes: tuple[int, ...] = ()


def analyze_repetition(text: str, duration_seconds: float | None = None, segment_timestamps: list[tuple[float,float]] | None = None, *, word_run: int = 6, phrase_repeats: int = 3, max_words_per_second: float = 5.0, numeric_run: int = 6) -> RepetitionAnalysis:
    words = normalized_text(text).split(); reasons=[]
    if re.search(rf"\b(\w+)\b(?:\s+\1){{{word_run-1},}}", normalized_text(text)): reasons.append("repeated_word_run")
    if re.search(rf"\b(.{{4,60}}?)\b(?:\s+\1){{{phrase_repeats-1},}}", normalized_text(text)): reasons.append("repeated_phrase_run")
    if duration_seconds and len(words) / max(duration_seconds, .1) > max_words_per_second: reasons.append("disproportionate_length")
    if re.search(rf"(?:\b\d+(?:[-\s]+)){{{numeric_run},}}", text): reasons.append("repeated_numeric_chain")
    for medicine in MEDICINES:
        if len(re.findall(rf"\b{medicine}\b", normalized_text(text))) >= phrase_repeats: reasons.append("repeated_medical_term_loop"); break
    affected=[]
    if segment_timestamps:
        for i in range(1,len(segment_timestamps)):
            if segment_timestamps[i] == segment_timestamps[i-1]: affected.extend((i-1,i))
        if affected: reasons.append("repeated_segment_timestamps")
        if duration_seconds and any(end > duration_seconds + 1 for _,end in segment_timestamps): reasons.append("audio_end_expansion")
    return RepetitionAnalysis(bool(reasons), tuple(dict.fromkeys(reasons)), tuple(sorted(set(affected))))


def safety_signature(text: str) -> dict[str, tuple[str,...]]:
    canonical=canonicalize_medical_expression(text)
    return {"numbers":tuple(re.findall(r"\b\d+(?:\.\d+)?(?:/\d+)?\b",canonical)), "units":tuple(re.findall(r"\b(?:mg|mcg|ml|iu|tablet)\b",canonical)), "negations":tuple(x for x in NEGATIONS if re.search(rf"(?<!\w){re.escape(x)}(?!\w)",canonical)), "medicines":tuple(x for x in MEDICINES if x in canonical)}


def candidate_quality(text: str, average_confidence: float, language_confidence: float, duration_seconds: float | None) -> tuple[int,int,int,int,float]:
    signature=safety_signature(text); repetition=analyze_repetition(text,duration_seconds)
    return (len(signature["negations"]),len(signature["numbers"])+len(signature["units"]),len(signature["medicines"]),-int(repetition.detected),average_confidence*.8+language_confidence*.2)


def correction_candidates(text: str, threshold: float = .88) -> list[dict[str, object]]:
    """Return review metadata only; callers must preserve raw text."""
    normalized=normalized_text(text); context=bool(DOSAGE_CONTEXT.search(normalized)); output=[]
    if not context: return output
    original_signature=safety_signature(text)
    original_explicit_numbers=tuple(re.findall(r"\b\d+(?:\.\d+)?(?:/\d+)?\b", normalized))
    for observed,candidate in PRONUNCIATION_CANDIDATES.items():
        if observed not in normalized: continue
        compact_similarity=SequenceMatcher(None,observed.replace(" ",""),candidate).ratio()
        confidence=max(.88,min(.97,.80+.17*compact_similarity))
        proposed=re.sub(re.escape(observed),candidate,normalized,count=1)
        proposed_signature=safety_signature(proposed)
        proposed_explicit_numbers=tuple(re.findall(r"\b\d+(?:\.\d+)?(?:/\d+)?\b", proposed))
        safe=(original_explicit_numbers==proposed_explicit_numbers and original_signature["units"]==proposed_signature["units"] and original_signature["negations"]==proposed_signature["negations"])
        if confidence>=threshold and safe:
            output.append({"original_text":observed,"corrected_candidate":candidate,"confidence":round(confidence,3),"reason":"high-similarity medicine alias with dosage/frequency context","requires_review":True})
    return output


def metrics_dict(metrics: DosageMetrics) -> dict[str,float|None]:
    return asdict(metrics)
