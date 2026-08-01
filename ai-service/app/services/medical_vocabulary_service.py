"""Maintainable, patient-independent Whisper context for medical speech."""

from functools import lru_cache

TERMS = (
    "hypertension", "diabetes", "thyroid", "asthma", "pneumonia",
    "migraine", "abdominal pain", "chest pain", "shortness of breath",
    "blood pressure", "blood sugar", "haemoglobin", "creatinine",
    "paracetamol", "azithromycin", "amoxicillin", "metformin",
    "pantoprazole", "milligram", "microgram", "once daily", "twice daily",
    "before food", "after food", "CBC", "LFT", "KFT", "ECG", "MRI",
    "CT scan", "bukhar", "khansi", "saans lene mein takleef", "pet dard",
)


class MedicalVocabularyService:
    """Build a bounded contextual hint; it is never treated as output text."""

    def initial_prompt(self, previous_text: str | None = None, limit: int = 1200) -> str:
        context = "Medical consultation vocabulary: " + ", ".join(TERMS) + "."
        if previous_text:
            context += " Previous verified context: " + " ".join(previous_text.split()[-50:])
        return context[:limit]


@lru_cache
def get_medical_vocabulary_service() -> MedicalVocabularyService:
    return MedicalVocabularyService()
