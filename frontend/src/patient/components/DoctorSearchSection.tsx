import React, { useState, useEffect } from "react";
import { doctorsData, type Doctor } from "../data/doctorsData";
import { fetchDoctors } from "../services/doctorApi";
import CustomSelect, { type OptionItem } from "./CustomSelect";
import { useNavigate } from "react-router-dom";
import { recommendDoctorSpecialist } from "../../common/services/aiApi";
import { useTranslation } from "react-i18next";

const DoctorSearchSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("home");
  const { t: tFilters } = useTranslation("buttons");

  const SPECIALTY_OPTIONS: OptionItem[] = [
    { value: "All", label: tFilters("specializationAll") },
    { value: "General Physician", label: tFilters("specializationGeneralPhysician") },
    { value: "Pediatrician (Child Specialist)", label: tFilters("specializationPediatrician") },
    { value: "Cardiologist", label: tFilters("specializationCardiologist") },
    { value: "Orthopedic Doctor", label: tFilters("specializationOrthopedic") },
    { value: "Neurologist", label: tFilters("specializationNeurologist") },
    { value: "Gynecologist & Obstetrician", label: tFilters("specializationGynecologist") },
    { value: "Dentist", label: tFilters("specializationDentist") },
    { value: "Ophthalmologist (Eye Specialist)", label: tFilters("specializationOphthalmologist") },
    { value: "ENT Specialist (Ear, Nose & Throat)", label: tFilters("specializationENT") },
    { value: "Dermatologist (Skin Specialist)", label: tFilters("specializationDermatologist") },
    { value: "Psychiatrist / Psychologist", label: tFilters("specializationPsychiatrist") },
    { value: "Pulmonologist (Lung Specialist)", label: tFilters("specializationPulmonologist") },
    { value: "Gastroenterologist", label: tFilters("specializationGastroenterologist") },
    { value: "Endocrinologist (Diabetes & Hormones)", label: tFilters("specializationEndocrinologist") },
    { value: "Urologist", label: tFilters("specializationUrologist") },
  ];

  const LOCATION_OPTIONS: OptionItem[] = [
    { value: "All", label: tFilters("locationAll") },
    { value: "Delhi", label: tFilters("locationDelhi") },
    { value: "Mumbai", label: tFilters("locationMumbai") },
    { value: "Pune", label: tFilters("locationPune") },
    { value: "Bengaluru", label: tFilters("locationBengaluru") },
    { value: "Hyderabad", label: tFilters("locationHyderabad") },
  ];

  const HOSPITAL_OPTIONS: OptionItem[] = [
    { value: "All", label: tFilters("hospitalAll") },
    { value: "city", label: tFilters("hospitalCityCare") },
    { value: "skin", label: tFilters("hospitalSkinPlus") },
    { value: "neuro", label: tFilters("hospitalNeuroCare") },
  ];

  const [doctorsList, setDoctorsList] = useState<Doctor[]>(doctorsData);
  const [searchTerm, setSearchTerm] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [hospitalFilter, setHospitalFilter] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchDoctors().then(docs => {
      if (docs && docs.length > 0) {
        setDoctorsList(docs);
      }
    }).catch(err => {
      console.warn("Could not fetch dynamic doctors, using static fallback", err);
    });
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredDoctors = doctorsList.filter(doc => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query ||
      (doc.name || "").toLowerCase().includes(query) ||
      (doc.specialty || "").toLowerCase().includes(query) ||
      (doc.hospital || "").toLowerCase().includes(query) ||
      (doc.location || "").toLowerCase().includes(query) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query)));

    const specFilterLower = specialtyFilter.trim().toLowerCase();
    const docSpecLower = (doc.specialty || "").toLowerCase();
    const matchesSpecialty = specialtyFilter === "All" ||
      docSpecLower.includes(specFilterLower.split(" ")[0]) ||
      specFilterLower.includes(docSpecLower.split(" ")[0]) ||
      docSpecLower.split(" ")[0] === specFilterLower.split(" ")[0];

    const matchesLocation = locationFilter === "All" ||
      (doc.location || "").toLowerCase().includes(locationFilter.trim().toLowerCase()) ||
      (doc.hospital || "").toLowerCase().includes(locationFilter.trim().toLowerCase());

    return matchesSearch && matchesSpecialty && matchesLocation;
  });

  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    const locFilter = locationFilter.trim().toLowerCase();
    const targetLoc = locFilter !== "all" ? locFilter : (localStorage.getItem("patientCity") || "mumbai").toLowerCase();

    const locA = `${a.location || ""} ${a.hospital || ""}`.toLowerCase();
    const locB = `${b.location || ""} ${b.hospital || ""}`.toLowerCase();

    const matchA = locA.includes(targetLoc);
    const matchB = locB.includes(targetLoc);

    if (matchA && !matchB) return -1;
    if (!matchA && matchB) return 1;

    const rateA = typeof a.rating === "number" ? a.rating : parseFloat(String(a.rating || 0));
    const rateB = typeof b.rating === "number" ? b.rating : parseFloat(String(b.rating || 0));
    if (rateB !== rateA) return rateB - rateA;

    return (b.reviewsCount || 0) - (a.reviewsCount || 0);
  });

  const effectiveIndex = currentIndex < sortedDoctors.length ? currentIndex : 0;

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, sortedDoctors.length - 3)));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1 < sortedDoctors.length ? prev + 1 : 0));
  };

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (specialtyFilter !== "All") params.set("specialty", specialtyFilter);
    if (locationFilter !== "All") params.set("location", locationFilter);
    const queryString = params.toString();
    navigate(queryString ? `/patient/search?${queryString}` : "/patient/search");
  };

  const visibleDoctors = searchTerm.trim()
    ? sortedDoctors.slice(0, 4)
    : sortedDoctors.slice(effectiveIndex, effectiveIndex + 4);

  return (
    <section id="doctors" className="doctor-search-section">
      <div className="search-section-container">
        {/* Header */}
        <div className="search-section-header">
          <h2 className="search-section-title">{t("searchSection.findYourDoctor")}</h2>
          <p className="search-section-subtitle">{t("searchSection.searchSubtitle")}</p>
        </div>

        {/* Search Bar Box */}
        <div className="search-box-wrapper">
          <div className="search-input-group">
            <svg className="search-magnifier-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="main-search-input"
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="filter-pills-row">
            <CustomSelect
              options={SPECIALTY_OPTIONS}
              value={specialtyFilter}
              onChange={setSpecialtyFilter}
            />

            <CustomSelect
              options={LOCATION_OPTIONS}
              value={locationFilter}
              onChange={setLocationFilter}
            />

            <CustomSelect
              options={HOSPITAL_OPTIONS}
              value={hospitalFilter}
              onChange={setHospitalFilter}
            />
          </div>
        </div>

        {/* Doctor Cards Carousel Header */}
        <div className="doctors-carousel-header">
          <h3 className="doctors-carousel-title">{t("searchSection.topDoctorsNearYou")}</h3>
          <button
            type="button"
            className="link-view-all"
            onClick={handleSearchSubmit}
          >
            {t("searchSection.viewAllDoctors")}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Carousel Container */}
        <div className="doctors-carousel-wrapper">
          <button type="button" className="carousel-nav-btn prev-btn" onClick={handlePrev} aria-label="Previous">
            ‹
          </button>

          <div className="doctors-cards-grid">
            {visibleDoctors.map((doctor: Doctor) => {
              const loc = (doctor.location || '').trim();
              let hosp = (doctor.hospital || '').trim();
              if (hosp && loc) {
                const regex = new RegExp(`,\\s*${loc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
                if (regex.test(hosp)) hosp = hosp.replace(regex, '').trim();
              }

              return (
              <div key={doctor.id} className="doctor-card-item">
                <div className="relative h-[220px] w-full overflow-hidden rounded-t-2xl bg-slate-100 sm:h-[240px] lg:h-[270px]">
                  <img
                    src={doctor.imageUrl}
                    alt={`Dr. ${doctor.name}`}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: doctor.imagePosition || "50% 20%" }}
                    loading="lazy"
                  />
                  <button
                    type="button"
                    className={`favorite-btn ${favorites.includes(doctor.id) ? "active" : ""}`}
                    onClick={() => toggleFavorite(doctor.id)}
                    aria-label="Favorite doctor"
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill={favorites.includes(doctor.id) ? "#ef4444" : "none"} stroke={favorites.includes(doctor.id) ? "#ef4444" : "#64748b"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                </div>

                <div className="doctor-card-body">
                  <h4 className="doctor-name">{doctor.name}</h4>
                  <p className="doctor-specialty">{doctor.specialty}</p>
                  <p className="doctor-experience-tag">{doctor.experience}</p>

                  <div className="doctor-rating-row" style={{ display: 'flex', alignItems: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" style={{ flexShrink: 0, marginRight: 4 }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="rating-score">{doctor.rating}</span>
                    <span className="reviews-count">({doctor.reviewsCount} reviews)</span>
                  </div>

                  <p className="doctor-hospital-location" style={{ fontWeight: 700, color: '#1e293b' }}>
                    {hosp}{loc ? `, ${loc}` : ''}
                  </p>

                  <div className="doctor-card-actions">
                    <button
                      type="button"
                      className="btn-view-profile"
                      onClick={() => navigate(`/patient/book/${doctor.id}`)}
                    >
                      {tFilters("viewProfile")}
                    </button>
                    <button
                      type="button"
                      className="btn-book-doctor"
                      onClick={() => navigate(`/patient/book/${doctor.id}`)}
                    >
                      {tFilters("bookNow")}
                    </button>
                    </div>
                </div>
              </div>
              );
            })}
            {filteredDoctors.length === 0 && (
              <div className="appointments-empty-state">
                {t("noDoctorMatches", { searchTerm })}
              </div>
            )}
          </div>

          <button type="button" className="carousel-nav-btn next-btn" onClick={handleNext} aria-label="Next">
            ›
          </button>
        </div>
      </div>
    </section>
  );
};

export default DoctorSearchSection;
