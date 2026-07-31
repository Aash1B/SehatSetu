"""Controlled doctor categories and extendable symptom-routing rules."""

from enum import Enum


class DoctorCategory(str, Enum):
    """Exact doctor category values shared with the downstream database."""

    GENERAL_PHYSICIAN = "General Physician"
    PEDIATRICIAN = "Pediatrician (Child Specialist)"
    CARDIOLOGIST = "Cardiologist"
    ORTHOPEDIC = "Orthopedic Doctor"
    NEUROLOGIST = "Neurologist"
    GYNECOLOGIST = "Gynecologist & Obstetrician"
    DENTIST = "Dentist"
    OPHTHALMOLOGIST = "Ophthalmologist (Eye Specialist)"
    ENT = "ENT Specialist (Ear, Nose & Throat)"
    DERMATOLOGIST = "Dermatologist (Skin Specialist)"
    PSYCHIATRIST = "Psychiatrist / Psychologist"
    PULMONOLOGIST = "Pulmonologist (Lung Specialist)"
    GASTROENTEROLOGIST = "Gastroenterologist"
    ENDOCRINOLOGIST = "Endocrinologist (Diabetes & Hormones)"
    UROLOGIST = "Urologist"


ALLOWED_DOCTOR_CATEGORIES = [category.value for category in DoctorCategory]

DOCTOR_CATEGORY_RULES: dict[DoctorCategory, tuple[str, ...]] = {
    DoctorCategory.GENERAL_PHYSICIAN: (
        "fever", "cold", "weakness", "body ache", "fatigue",
        "general checkup", "infection", "dizziness", "mild headache",
    ),
    DoctorCategory.PEDIATRICIAN: (
        "child fever", "baby fever", "infant problem", "child cough",
        "child vomiting", "child growth", "baby health", "newborn issue",
        "child vaccination",
    ),
    DoctorCategory.CARDIOLOGIST: (
        "chest pain", "heart pain", "palpitations", "irregular heartbeat",
        "rapid heartbeat", "high blood pressure", "heart problem",
        "cardiac problem",
    ),
    DoctorCategory.ORTHOPEDIC: (
        "joint pain", "knee pain", "shoulder pain", "back pain", "bone pain",
        "fracture", "sprain", "muscle injury", "neck pain", "sports injury",
    ),
    DoctorCategory.NEUROLOGIST: (
        "migraine", "persistent headache", "seizure", "numbness", "tingling",
        "tremor", "nerve pain", "memory problem", "balance problem",
        "paralysis",
    ),
    DoctorCategory.GYNECOLOGIST: (
        "pregnancy", "menstrual problem", "irregular periods", "period pain",
        "pelvic pain", "vaginal bleeding", "pregnancy checkup",
        "fertility problem", "pcos", "menopause",
    ),
    DoctorCategory.DENTIST: (
        "tooth pain", "toothache", "gum pain", "bleeding gums", "cavity",
        "broken tooth", "dental problem", "bad breath", "tooth sensitivity",
    ),
    DoctorCategory.OPHTHALMOLOGIST: (
        "eye pain", "blurred vision", "red eye", "vision problem",
        "eye infection", "watery eyes", "dry eyes", "double vision",
        "eye injury",
    ),
    DoctorCategory.ENT: (
        "ear pain", "hearing loss", "difficulty hearing", "blocked nose",
        "sinus", "sore throat", "throat pain", "tonsil", "nose bleeding",
        "ear infection", "voice problem",
    ),
    DoctorCategory.DERMATOLOGIST: (
        "skin rash", "rash", "itching", "acne", "skin infection", "hair loss",
        "dandruff", "eczema", "psoriasis", "skin allergy", "dark spots",
        "nail problem",
    ),
    DoctorCategory.PSYCHIATRIST: (
        "anxiety", "depression", "panic attack", "stress", "sleep disorder",
        "mental health", "mood swings", "trauma", "addiction",
        "suicidal thoughts",
    ),
    DoctorCategory.PULMONOLOGIST: (
        "asthma", "persistent cough", "breathing problem",
        "shortness of breath", "wheezing", "lung problem", "chronic cough",
        "chest congestion", "sleep apnea",
    ),
    DoctorCategory.GASTROENTEROLOGIST: (
        "stomach pain", "abdominal pain", "acidity", "acid reflux",
        "constipation", "diarrhea", "vomiting", "indigestion",
        "liver problem", "blood in stool", "bloating",
    ),
    DoctorCategory.ENDOCRINOLOGIST: (
        "diabetes", "high blood sugar", "low blood sugar", "thyroid",
        "hormonal problem", "hormone imbalance", "unexplained weight gain",
        "unexplained weight loss", "insulin problem",
    ),
    DoctorCategory.UROLOGIST: (
        "painful urination", "urinary pain", "frequent urination",
        "blood in urine", "kidney stone", "urine problem", "prostate problem",
        "bladder problem", "male reproductive problem",
    ),
}

EMERGENCY_PHRASES: tuple[str, ...] = (
    "severe chest pain",
    "severe difficulty breathing",
    "difficulty breathing",
    "loss of consciousness",
    "uncontrolled bleeding",
    "facial drooping",
    "sudden one sided weakness",
    "possible stroke",
    "continuous seizure",
    "serious head injury",
    "suicidal intent",
    "severe allergic reaction",
)
