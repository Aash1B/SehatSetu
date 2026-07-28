import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { doctorsData, type Doctor } from '../data/doctorsData';
import { setCurrentPage } from '../store/uiSlice';
import CustomSelect, { type OptionItem } from './CustomSelect';

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
  { value: '5+', label: '5+ Years' },
  { value: '10+', label: '10+ Years' },
  { value: '15+', label: '15+ Years' },
];

const FEES_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'Fees' },
  { value: '500-800', label: '₹500 - ₹800' },
  { value: '800-1200', label: '₹800 - ₹1200' },
];

const DoctorSearchSection: React.FC = () => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [hospitalFilter, setHospitalFilter] = useState('All');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [feesFilter, setFeesFilter] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredDoctors = doctorsData.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty = specialtyFilter === 'All' || 
      doc.specialty.toLowerCase().includes(specialtyFilter.toLowerCase().split(' ')[0]) ||
      specialtyFilter.toLowerCase().includes(doc.specialty.toLowerCase().split(' ')[0]);
    const matchesLocation = locationFilter === 'All' || doc.location === locationFilter;

    return matchesSearch && matchesSpecialty && matchesLocation;
  });

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filteredDoctors.length - 3)));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1 < filteredDoctors.length ? prev + 1 : 0));
  };

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
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="main-search-input"
              placeholder="Search doctor, specialty, hospital or symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="button" className="btn-voice-search" title="Voice Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
            <button type="button" className="btn-search-submit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
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
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
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
            onClick={() => dispatch(setCurrentPage('doctors'))}
          >
            View All Doctors
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Carousel Container */}
        <div className="doctors-carousel-wrapper">
          <button type="button" className="carousel-nav-btn prev-btn" onClick={handlePrev} aria-label="Previous">
            ‹
          </button>

          <div className="doctors-cards-grid">
            {filteredDoctors.slice(currentIndex, currentIndex + 4).map((doctor: Doctor) => (
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
                      onClick={() => dispatch(setCurrentPage('book-appointment'))}
                    >
                      View Profile
                    </button>
                    <button 
                      type="button" 
                      className="btn-book-doctor"
                      onClick={() => dispatch(setCurrentPage('book-appointment'))}
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
