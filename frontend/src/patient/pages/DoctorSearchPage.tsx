import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import FloatingEmergencyButton from '../components/FloatingEmergencyButton';
import CustomSelect, { type OptionItem } from '../components/CustomSelect';
import { doctorsData, PRIORITY_CONFIG, type Doctor } from '../data/doctorsData';
import { fetchDoctors } from '../services/doctorApi';
import { setCurrentPage } from '../store/uiSlice';

const SPECIALTY_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'All Specializations' },
  { value: 'General Physician', label: 'General Physician' },
  { value: 'Cardiologist', label: 'Cardiologist' },
  { value: 'Neurologist', label: 'Neurologist' },
  { value: 'Dermatologist', label: 'Dermatologist' },
  { value: 'Orthopedic Doctor', label: 'Orthopedic Doctor' },
  { value: 'Gynecologist', label: 'Gynecologist & Obstetrician' },
  { value: 'Pediatrician', label: 'Pediatrician (Child Specialist)' },
  { value: 'Ophthalmologist', label: 'Ophthalmologist' },
  { value: 'Dentist', label: 'Dentist' },
  { value: 'ENT Specialist', label: 'ENT Specialist' },
];

const LOCATION_OPTIONS: OptionItem[] = [
  { value: 'All', label: 'All Locations' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Hyderabad', label: 'Hyderabad' },
];

const DoctorSearchPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(doctorsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchDoctors();
        if (fetched && fetched.length > 0) {
          setDoctorsList(fetched);
        }
      } catch (err) {
        console.warn('Backend doctors fetch fallback:', err);
      }
    })();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredAndSortedDoctors = useMemo(() => {
    return doctorsList
      .filter((doc: Doctor) => {
        const matchesSearch = 
          doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

        const matchesSpecialty = 
          specialtyFilter === 'All' || 
          doc.specialty.toLowerCase().includes(specialtyFilter.toLowerCase());

        const matchesLocation = 
          locationFilter === 'All' || doc.location === locationFilter;

        const matchesAvailability = !onlyAvailableToday || doc.availableToday;

        return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailability;
      })
      .sort((a: Doctor, b: Doctor) => {
        const isGenA = a.specialty.toLowerCase().includes('general physician');
        const isGenB = b.specialty.toLowerCase().includes('general physician');

        if (isGenA && !isGenB) return -1;
        if (!isGenA && isGenB) return 1;
        return b.priorityScore - a.priorityScore;
      });
  }, [searchTerm, specialtyFilter, locationFilter, onlyAvailableToday]);

  return (
    <div className="all-doctors-page">
      <Sidebar />
      <Navbar />

      {/* Main Content Section - Search Bar at Top, Cards Below */}
      <main className="doctors-page-main">
        <div className="doctors-main-container">
          {/* Breadcrumb Header */}
          <div className="doctors-page-top-nav">
            <button 
              type="button" 
              className="breadcrumb-back-btn"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-title">All Doctors</span>
          </div>

          {/* Search Bar & Filter Toolbar Box */}
          <div className="doctors-filter-card">
            <div className="doctors-search-row">
              <div className="doctors-search-input-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search doctor by name, specialty, hospital or symptoms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="doctors-search-input"
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                    title="Clear text"
                  >
                    ✕
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn-voice-search-end" 
                  title="Voice Search"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </button>
              </div>

              <div className="availability-toggle-wrap">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={onlyAvailableToday}
                    onChange={(e) => setOnlyAvailableToday(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">Available Today Only 🟢</span>
                </label>
              </div>
            </div>

            <div className="doctors-dropdowns-row">
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

              {(specialtyFilter !== 'All' || locationFilter !== 'All' || searchTerm !== '' || onlyAvailableToday) && (
                <button 
                  type="button" 
                  className="btn-reset-filters"
                  onClick={() => {
                    setSpecialtyFilter('All');
                    setLocationFilter('All');
                    setSearchTerm('');
                    setOnlyAvailableToday(false);
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="results-counter-bar">
              <span className="counter-text">
                Showing <strong>{filteredAndSortedDoctors.length}</strong> {filteredAndSortedDoctors.length === 1 ? 'Doctor' : 'Doctors'}
              </span>
            </div>
          </div>

          {/* Doctor Cards Grid */}
          {filteredAndSortedDoctors.length > 0 ? (
            <div className="doctors-page-grid">
              {filteredAndSortedDoctors.map((doctor) => {
                const priorityMeta = PRIORITY_CONFIG[doctor.priorityLevel] || PRIORITY_CONFIG.P4;
                const isFav = favorites.includes(doctor.id);

                return (
                  <div 
                    key={doctor.id} 
                    className={`doctor-full-card ${priorityMeta.bgClass}-border`}
                  >
                    {/* Badge */}
                    <div className={`doctor-card-priority-badge ${priorityMeta.bgClass}`}>
                      {priorityMeta.badgeText}
                    </div>

                    <div className="doctor-card-top">
                      <div className="doctor-avatar-container">
                        <img src={doctor.imageUrl} alt={doctor.name} className="doctor-full-avatar" />
                        {doctor.availableToday && (
                          <span className="status-online-dot" title="Available Today for Booking"></span>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`doctor-card-fav-btn ${isFav ? 'active' : ''}`}
                        onClick={() => toggleFavorite(doctor.id)}
                        aria-label="Save Doctor"
                      >
                        ♥
                      </button>
                    </div>

                    <div className="doctor-card-info">
                      <h3 className="doctor-full-name">{doctor.name}</h3>
                      <p className="doctor-full-specialty">{doctor.specialty}</p>

                      <div className="doctor-meta-tags-row">
                        <span className="meta-tag exp-tag">
                          ⌛ {doctor.experience}
                        </span>
                        <span className="meta-tag rating-tag">
                          ⭐ {doctor.rating} ({doctor.reviewsCount} reviews)
                        </span>
                      </div>

                      <div className="doctor-hospital-detail">
                        <span className="hospital-pin">📍</span>
                        <div className="hospital-text">
                          <strong className="hospital-name">{doctor.hospital}</strong>
                          <span className="location-city">{doctor.location}</span>
                        </div>
                      </div>

                      {/* Doctor Tags */}
                      {doctor.tags && (
                        <div className="doctor-skills-tags">
                          {doctor.tags.map((tag, idx) => (
                            <span key={idx} className="skill-pill-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="doctor-fee-availability-row">
                        <div className="fee-box">
                          <span className="fee-label">Consultation Fee</span>
                          <span className="fee-amount">{doctor.fee}</span>
                        </div>
                        <div className="availability-box">
                          <span className="slot-badge">
                            {doctor.availableToday ? '🟢 Available Today' : '📅 Next Slot Tomorrow'}
                          </span>
                        </div>
                      </div>

                      <div className="doctor-card-action-btns">
                        <button
                          type="button"
                          className="btn-full-book-now"
                          onClick={() => navigate(`/patient/book/${doctor.id}`)}
                        >
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="doctors-no-results-box">
              <div className="no-results-icon">🔍</div>
              <h3>No doctors match your criteria</h3>
              <p>Try adjusting your search terms to find available specialists.</p>
              <button
                type="button"
                className="btn-clear-filters-large"
                onClick={() => {
                  setSpecialtyFilter('All');
                  setLocationFilter('All');
                  setSearchTerm('');
                  setOnlyAvailableToday(false);
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <FloatingEmergencyButton />
    </div>
  );
};

export default DoctorSearchPage;
