import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { doctorsData, type Doctor } from '../data/doctorsData';
import { fetchDoctors } from '../services/doctorApi';
import CustomSelect, { type OptionItem } from './CustomSelect';
import { useNavigate } from 'react-router-dom';
import { recommendDoctorSpecialist } from '../../common/services/aiApi';

const SPECIALTY_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'Specialization (All)' },
  { value: 'General Physician', label: 'General Physician' },
  { value: 'Pediatrician (Child Specialist)', label: 'Pediatrician (Child Specialist)' },
  { value: 'Cardiologist', label: 'Cardiologist' },
  { value: 'Orthopedic Doctor', label: 'Orthopedic Doctor' },
  { value: 'Neurologist', label: 'Neurologist' },
  { value: 'Gynecologist & Obstetrician', label: 'Gynecologist & Obstetrician' },
  { value: 'Dentist', label: 'Dentist' },
  { value: 'Ophthalmologist (Eye Specialist)', label: 'Ophthalmologist (Eye Specialist)' },
  { value: 'ENT Specialist (Ear, Nose & Throat)', label: 'ENT Specialist (Ear, Nose & Throat)' },
  { value: 'Dermatologist (Skin Specialist)', label: 'Dermatologist (Skin Specialist)' },
  { value: 'Psychiatrist / Psychologist', label: 'Psychiatrist / Psychologist' },
  { value: 'Pulmonologist (Lung Specialist)', label: 'Pulmonologist (Lung Specialist)' },
  { value: 'Gastroenterologist', label: 'Gastroenterologist' },
  { value: 'Endocrinologist (Diabetes & Hormones)', label: 'Endocrinologist (Diabetes & Hormones)' },
  { value: 'Urologist', label: 'Urologist' },
];

const LOCATION_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'Location' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Hyderabad', label: 'Hyderabad' },
];

const HOSPITAL_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'Hospital' },
  { value: 'city', label: 'City Care Hospital' },
  { value: 'skin', label: 'Skin Plus Clinic' },
  { value: 'neuro', label: 'Neuro Care Hospital' },
];

const EXPERIENCE_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'Experience' },
  { value: '1-5', label: '1 - 5 Years' },
  { value: '5-10', label: '5 - 10 Years' },
  { value: '10+', label: '10+ Years' },
];

const FEES_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'Fees' },
  { value: '500-800', label: '₹500 - ₹800' },
  { value: '800-1200', label: '₹800 - ₹1200' },
];

const DoctorSearchSection: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(doctorsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [hospitalFilter, setHospitalFilter] = useState('All');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [feesFilter, setFeesFilter] = useState('All');
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

  const sarahTestDoctor = doctorsData.find((doctor) => doctor.id === 'd1');
  const sarahFromCurrentList = doctorsList.find((doctor) =>
    doctor.id === 'd1' || doctor.name.toLowerCase().includes('sarah jenkins')
  );
  const pinnedSarah = sarahFromCurrentList || sarahTestDoctor;
  const effectiveDoctors = pinnedSarah
    ? [pinnedSarah, ...doctorsList.filter((doctor) => doctor.id !== pinnedSarah.id && !doctor.name.toLowerCase().includes('sarah jenkins'))]
    : doctorsList;

  const filteredDoctors = effectiveDoctors.filter(doc => {
    const matchesSearch = (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.hospital || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty = specialtyFilter === 'All' ||
      doc.specialty.toLowerCase().includes(specialtyFilter.toLowerCase().split(' ')[0]) ||
      specialtyFilter.toLowerCase().includes(doc.specialty.toLowerCase().split(' ')[0]);
    const matchesLocation = locationFilter === 'All' || doc.location === locationFilter;

    return matchesSearch && matchesSpecialty && matchesLocation;
  });

  useEffect(() => {
    setCurrentIndex(0);
  }, [searchTerm, specialtyFilter, locationFilter, hospitalFilter, experienceFilter, feesFilter]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filteredDoctors.length - 3)));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1 < filteredDoctors.length ? prev + 1 : 0));
  };

  const visibleDoctors = searchTerm.trim()
    ? filteredDoctors.slice(0, 4)
    : filteredDoctors.slice(currentIndex, currentIndex + 4);

  return (
    <section id="doctors" className="doctor-search-section">
      <div className="search-section-container">
        {/* Header */}
        <div className="search-section-header">
          <h2 className="search-section-title">Find Your Doctor</h2>
          <p className="search-section-subtitle">Search by name, specialty, hospital or symptoms</p>
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
              placeholder="Search doctor, specialty, hospital or symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className="btn-voice-search"
              title="AI Recommend Specialist"
              onClick={async () => {
                if (!searchTerm.trim()) return;
                try {
                  const res = await recommendDoctorSpecialist(searchTerm);
                  if (res && res.data && res.data.specialization) {
                    setSpecialtyFilter(res.data.specialization);
                  }
                } catch (e) {
                  console.error('AI doctor recommendation error', e);
                }
              }}
            >
              <span className="text-xs font-bold text-orange-600 flex items-center gap-1 px-1">✨ AI Match</span>
            </button>
            <button type="button" className="btn-search-submit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Search
            </button>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="filter-pills-row">
            <CustomSelect
              icon="⚕️"
              options={SPECIALTY_OPTIONS}
              value={specialtyFilter}
              onChange={setSpecialtyFilter}
            />

            <CustomSelect
              icon="📍"
              options={LOCATION_OPTIONS}
              value={locationFilter}
              onChange={setLocationFilter}
            />

            <CustomSelect
              icon="🏥"
              options={HOSPITAL_OPTIONS}
              value={hospitalFilter}
              onChange={setHospitalFilter}
            />

            <CustomSelect
              icon="📅"
              options={EXPERIENCE_OPTIONS}
              value={experienceFilter}
              onChange={setExperienceFilter}
            />

            <CustomSelect
              icon="₹"
              options={FEES_OPTIONS}
              value={feesFilter}
              onChange={setFeesFilter}
            />

            <button type="button" className="btn-more-filters">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
              More Filters
            </button>
          </div>
        </div>

        {/* Doctor Cards Carousel Header */}
        <div className="doctors-carousel-header">
          <h3 className="doctors-carousel-title">Top Doctors Near You</h3>
          <button
            type="button"
            className="link-view-all"
            onClick={() => navigate('/patient/search')}
          >
            View All Doctors
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
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
            {visibleDoctors.map((doctor: Doctor) => (
              <div key={doctor.id} className="doctor-card-item">
                <div className="doctor-card-image-wrap">
                  <img src={doctor.imageUrl} alt={doctor.name} className="doctor-avatar-img" />
                  <button
                    type="button"
                    className={`favorite-btn ${favorites.includes(doctor.id) ? 'active' : ''}`}
                    onClick={() => toggleFavorite(doctor.id)}
                    aria-label="Favorite doctor"
                  >
                    ♥
                  </button>
                </div>

                <div className="doctor-card-body">
                  <h4 className="doctor-name">{doctor.name}</h4>
                  <p className="doctor-specialty">{doctor.specialty}</p>
                  <p className="doctor-experience-tag">{doctor.experience}</p>

                  <div className="doctor-rating-row">
                    <span className="star-icon">⭐</span>
                    <span className="rating-score">{doctor.rating}</span>
                    <span className="reviews-count">({doctor.reviewsCount} reviews)</span>
                  </div>

                  <p className="doctor-hospital-location">
                    <span className="location-pin">📍</span>
                    {doctor.hospital}, {doctor.location}
                  </p>

                  <div className="doctor-card-actions">
                    <button
                      type="button"
                      className="btn-view-profile"
                      onClick={() => navigate(`/patient/book/${doctor.id}`)}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      className="btn-book-doctor"
                      onClick={() => navigate(`/patient/book/${doctor.id}`)}
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredDoctors.length === 0 && (
              <div className="appointments-empty-state">
                No doctor matches “{searchTerm}”. Try another name or clear the filters.
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
