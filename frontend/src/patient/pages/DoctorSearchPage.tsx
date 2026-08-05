import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import FloatingEmergencyButton from '../components/FloatingEmergencyButton';
import CustomSelect, { type OptionItem } from '../components/CustomSelect';
import { PRIORITY_CONFIG, doctorsData, type Doctor } from '../data/doctorsData';
import { fetchDoctors } from '../services/doctorApi';

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(doctorsData);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [specialtyFilter, setSpecialtyFilter] = useState(() => searchParams.get('specialty') || 'All');
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get('location') || 'All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const defaultDoctor = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    if (image.src === defaultDoctor) return;
    image.onerror = null;
    image.src = defaultDoctor;
  };

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchDoctors();
        if (fetched && fetched.length > 0) {
          setDoctorsList(fetched);
        } else {
          setDoctorsList(doctorsData);
        }
      } catch (err) {
        console.warn('Backend doctors fetch fallback:', err);
        setDoctorsList(doctorsData);
      }
    })();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredAndSortedDoctors = useMemo(() => {
    const locFilter = locationFilter.trim().toLowerCase();
    const targetLoc = locFilter !== 'all' ? locFilter : (localStorage.getItem('patientCity') || 'mumbai').toLowerCase();

    return doctorsList
      .filter((doc: Doctor) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = 
          !query ||
          (doc.name && doc.name.toLowerCase().includes(query)) ||
          (doc.specialty && doc.specialty.toLowerCase().includes(query)) ||
          (doc.hospital && doc.hospital.toLowerCase().includes(query)) ||
          (doc.location && doc.location.toLowerCase().includes(query)) ||
          (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query)));

        const specFilterLower = specialtyFilter.trim().toLowerCase();
        const docSpecLower = (doc.specialty || '').toLowerCase();
        const matchesSpecialty = 
          specialtyFilter === 'All' || 
          docSpecLower.includes(specFilterLower.split(' ')[0]) ||
          specFilterLower.includes(docSpecLower.split(' ')[0]) ||
          docSpecLower.split(' ')[0] === specFilterLower.split(' ')[0];

        const matchesLocation = 
          locationFilter === 'All' || 
          (doc.location && doc.location.toLowerCase().includes(locFilter)) ||
          (doc.hospital && doc.hospital.toLowerCase().includes(locFilter));

        const matchesAvailability = !onlyAvailableToday || doc.availableToday;

        return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailability;
      })
      .sort((a: Doctor, b: Doctor) => {
        const locA = `${a.location || ''} ${a.hospital || ''}`.toLowerCase();
        const locB = `${b.location || ''} ${b.hospital || ''}`.toLowerCase();

        const matchA = locA.includes(targetLoc);
        const matchB = locB.includes(targetLoc);

        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;

        const rateA = typeof a.rating === 'number' ? a.rating : parseFloat(String(a.rating || 0));
        const rateB = typeof b.rating === 'number' ? b.rating : parseFloat(String(b.rating || 0));
        if (rateB !== rateA) return rateB - rateA;

        return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
      });
  }, [doctorsList, searchTerm, specialtyFilter, locationFilter, onlyAvailableToday]);

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

                    <div className="relative h-[220px] w-full overflow-hidden rounded-t-2xl bg-slate-100 sm:h-[240px] lg:h-[270px]">
                      <img
                        src={doctor.imageUrl}
                        alt={`Dr. ${doctor.name}`}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: doctor.imagePosition || '50% 20%' }}
                        loading="lazy"
                        onError={handleImageError}
                      />
                      {doctor.availableToday && (
                        <span className="status-online-dot" title="Available Today for Booking"></span>
                      )}
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
