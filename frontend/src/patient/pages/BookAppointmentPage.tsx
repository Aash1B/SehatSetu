import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '../store/uiSlice';
import { doctorsData, type Doctor } from '../data/doctorsData';
import Footer from '../components/Footer';

interface BookingFormData {
  // Step 1
  healthConcern: string;
  symptoms: string[];
  duration: string;
  severity: 'Mild' | 'Moderate' | 'Uncomfortable' | 'Severe' | 'Emergency';
  consultMode: 'Video Consultation' | 'In-Person Visit' | 'Chat / Message';
  urgency: string;
  notes: string;
  // Step 2
  selectedDoctor: Doctor | null;
  // Step 3
  selectedDate: string;
  selectedTimeSlot: string;
  // Step 4
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientPhone: string;
  patientEmail: string;
}

const ALL_SYMPTOMS = [
  'Fever', 'Headache', 'Chest Pain', 'Shortness of Breath',
  'Joint Pain', 'Skin Rash', 'Fatigue', 'Anxiety', 'Cough',
  'Back Pain', 'Nausea', 'Dizziness'
];

const BookAppointmentPage: React.FC = () => {
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [symptomSearch, setSymptomSearch] = useState<string>('');
  const [step2SearchTerm, setStep2SearchTerm] = useState<string>('');
  const [step2Specialty, setStep2Specialty] = useState<string>('All');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallets'>('upi');

  const [formData, setFormData] = useState<BookingFormData>({
    healthConcern: 'specific-symptoms',
    symptoms: ['Chest Pain', 'Fatigue'],
    duration: '4-7 days',
    severity: 'Moderate',
    consultMode: 'Video Consultation',
    urgency: 'This Week',
    notes: '',
    selectedDoctor: doctorsData[0],
    selectedDate: 'Tomorrow, 10:00 AM',
    selectedTimeSlot: '10:30 AM',
    patientName: 'Ananya Sharma',
    patientAge: '28',
    patientGender: 'Female',
    patientPhone: '+91 98765 43210',
    patientEmail: 'ananya.sharma@example.com',
  });

  const filteredStep2Doctors = doctorsData.filter(doc => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.location.toLowerCase().includes(step2SearchTerm.toLowerCase());

    const matchesSpecialty = 
      step2Specialty === 'All' || 
      doc.specialty.toLowerCase().includes(step2Specialty.toLowerCase());

    return matchesSearch && matchesSpecialty;
  });

  const toggleSymptom = (symptom: string) => {
    setFormData(prev => {
      const exists = prev.symptoms.includes(symptom);
      const updated = exists
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom];
      return { ...prev, symptoms: updated };
    });
  };

  const calculateProgress = () => {
    switch (currentStep) {
      case 1: return 40;
      case 2: return 60;
      case 3: return 80;
      case 4: return 95;
      case 5: return 100;
      default: return 40;
    }
  };

  const handleNextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setBookingConfirmed(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      dispatch(setCurrentPage('landing'));
    }
  };

  const filteredSymptoms = ALL_SYMPTOMS.filter(s =>
    s.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  return (
    <div className="booking-page-layout">
      {/* Top Navbar */}
      <header className="booking-navbar">
        <div className="booking-navbar-container">
          <div className="booking-navbar-left">
            <button 
              type="button" 
              className="btn-nav-arrow-only"
              onClick={() => dispatch(setCurrentPage('landing'))}
              title="Back to Home"
              aria-label="Back to Home"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <button 
              type="button" 
              className="booking-brand-logo"
              onClick={() => dispatch(setCurrentPage('landing'))}
            >
              <div className="logo-badge">
                <svg viewBox="0 0 24 24" fill="none" className="logo-icon" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316"/>
                  <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="brand-title">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
            </button>
          </div>

          <nav className="booking-nav-links">
            <button type="button" className="booking-nav-link" onClick={() => dispatch(setCurrentPage('landing'))}>
              How it works
            </button>
            <button type="button" className="booking-nav-link" onClick={() => dispatch(setCurrentPage('doctors'))}>
              Find a specialist
            </button>
            <button type="button" className="booking-nav-link" onClick={() => dispatch(setCurrentPage('landing'))}>
              Health resources
            </button>
          </nav>

          <div className="booking-nav-actions">
            <button type="button" className="btn-booking-sign-in">Sign In</button>
            <button type="button" className="btn-booking-get-started" onClick={() => dispatch(setCurrentPage('landing'))}>
              Home
            </button>
          </div>
        </div>
      </header>

      {/* Step Tracker Header */}
      <div className="booking-step-tracker-bar">
        <div className="step-tracker-container">
          <div className="step-track-line"></div>
          
          <div className={`step-node ${currentStep >= 1 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
            <span className="step-label">Health Concern</span>
          </div>

          <div className={`step-node ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
            <span className="step-label">Select Doctor</span>
          </div>

          <div className={`step-node ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
            <span className="step-label">Choose Slot</span>
          </div>

          <div className={`step-node ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 4 ? '✓' : '4'}</div>
            <span className="step-label">Patient Info</span>
          </div>

          <div className={`step-node ${currentStep >= 5 ? 'active' : ''}`}>
            <div className="step-number">{bookingConfirmed ? '✓' : '5'}</div>
            <span className="step-label">Confirm & Pay</span>
          </div>
        </div>
      </div>

      {/* Main Booking Content Body */}
      <main className="booking-main-container">
        {/* Top Back Action Bar - Easy navigation at the top */}
        {!bookingConfirmed && (
          <div className="booking-top-back-bar">
            {currentStep > 1 && (
              <button 
                type="button" 
                className="btn-top-back"
                onClick={handlePrevStep}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>Back to Step {currentStep - 1}</span>
              </button>
            )}

            <div className="booking-top-breadcrumbs">
              <button type="button" className="crumb-btn" onClick={() => dispatch(setCurrentPage('landing'))}>
                Home
              </button>
              <span className="crumb-slash">/</span>
              <span className="crumb-active">Book Appointment</span>
            </div>
          </div>
        )}
        {bookingConfirmed ? (
          /* Confirmation Ticket Screen */
          <div className="booking-confirmation-card">
            <div className="confirmation-success-icon">✓</div>
            <h2>Appointment Confirmed!</h2>
            <p className="confirmation-sub">Your appointment has been successfully scheduled with SehatSetu.</p>
            
            <div className="confirmation-ticket">
              <div className="ticket-header">
                <div>
                  <span className="ticket-id">Booking ID: #SS-BOOK-94281</span>
                  <h3 className="ticket-doctor-name">{formData.selectedDoctor?.name}</h3>
                  <span className="ticket-specialty">{formData.selectedDoctor?.specialty}</span>
                </div>
                <div className="ticket-badge">{formData.consultMode}</div>
              </div>

              <div className="ticket-details-grid">
                <div>
                  <span className="detail-label">Date & Time</span>
                  <span className="detail-val">Tomorrow, 10:30 AM</span>
                </div>
                <div>
                  <span className="detail-label">Patient Name</span>
                  <span className="detail-val">{formData.patientName}</span>
                </div>
                <div>
                  <span className="detail-label">Age & Gender</span>
                  <span className="detail-val">{formData.patientAge} Yrs, {formData.patientGender}</span>
                </div>
                <div>
                  <span className="detail-label">Consultation Mode</span>
                  <span className="detail-val">{formData.consultMode}</span>
                </div>
                <div>
                  <span className="detail-label">Fee Paid</span>
                  <span className="detail-val">₹{formData.selectedDoctor?.fee || '800'}</span>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <button 
                type="button" 
                className="btn-primary-orange"
                onClick={() => dispatch(setCurrentPage('landing'))}
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="booking-grid-wrapper">
            {/* Left Column: Form Questionnaire Card */}
            <div className="booking-form-card">
              {currentStep === 1 && (
                <>
                  {/* Title Header */}
                  <div className="form-card-header">
                    <div className="header-icon-badge">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F97316" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </div>
                    <div>
                      <h1 className="form-main-title">What brings you in today?</h1>
                      <p className="form-main-subtitle">Help us match you with the right specialist.</p>
                    </div>
                  </div>

                  {/* Q1: Describe health concern */}
                  <div className="form-question-block">
                    <label className="question-label">How would you describe your health concern?</label>
                    <div className="concern-options-grid">
                      <button
                        type="button"
                        className={`concern-card ${formData.healthConcern === 'specific-symptoms' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, healthConcern: 'specific-symptoms' })}
                      >
                        <div className="concern-card-icon">+</div>
                        <div className="concern-card-text">
                          <span className="concern-title">I have specific symptoms</span>
                          <span className="concern-sub">Something feels different</span>
                        </div>
                        {formData.healthConcern === 'specific-symptoms' && <span className="checkmark">✓</span>}
                      </button>

                      <button
                        type="button"
                        className={`concern-card ${formData.healthConcern === 'routine-checkup' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, healthConcern: 'routine-checkup' })}
                      >
                        <div className="concern-card-icon">🩺</div>
                        <div className="concern-card-text">
                          <span className="concern-title">Routine check-up or follow-up</span>
                          <span className="concern-sub">Stay on top of your health</span>
                        </div>
                        {formData.healthConcern === 'routine-checkup' && <span className="checkmark">✓</span>}
                      </button>

                      <button
                        type="button"
                        className={`concern-card ${formData.healthConcern === 'second-opinion' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, healthConcern: 'second-opinion' })}
                      >
                        <div className="concern-card-icon">💡</div>
                        <div className="concern-card-text">
                          <span className="concern-title">I need a second opinion</span>
                          <span className="concern-sub">A fresh perspective helps</span>
                        </div>
                        {formData.healthConcern === 'second-opinion' && <span className="checkmark">✓</span>}
                      </button>

                      <button
                        type="button"
                        className={`concern-card ${formData.healthConcern === 'talk-to-someone' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, healthConcern: 'talk-to-someone' })}
                      >
                        <div className="concern-card-icon">💙</div>
                        <div className="concern-card-text">
                          <span className="concern-title">I want to talk to someone</span>
                          <span className="concern-sub">Mental health & wellbeing</span>
                        </div>
                        {formData.healthConcern === 'talk-to-someone' && <span className="checkmark">✓</span>}
                      </button>
                    </div>
                  </div>

                  {/* Q2: Symptoms experiencing */}
                  <div className="form-question-block">
                    <label className="question-label">What symptoms are you experiencing?</label>
                    <div className="symptom-search-bar">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94A3B8" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                      </svg>
                      <input 
                        type="text" 
                        placeholder="Search or type a symptom"
                        value={symptomSearch}
                        onChange={(e) => setSymptomSearch(e.target.value)}
                      />
                    </div>
                    <div className="symptoms-pills-row">
                      {filteredSymptoms.map(symptom => {
                        const isSelected = formData.symptoms.includes(symptom);
                        return (
                          <button
                            key={symptom}
                            type="button"
                            className={`symptom-pill ${isSelected ? 'active' : ''}`}
                            onClick={() => toggleSymptom(symptom)}
                          >
                            {symptom}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Q3: Duration */}
                  <div className="form-question-block">
                    <label className="question-label">How long have you been experiencing this?</label>
                    <div className="duration-pills-row">
                      {['Less than a day', '1-3 days', '4-7 days', '1-3 weeks', 'More than a month'].map(d => (
                        <button
                          key={d}
                          type="button"
                          className={`duration-pill ${formData.duration === d ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, duration: d })}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Q4: Severity Scale */}
                  <div className="form-question-block">
                    <label className="question-label">How severe are your symptoms?</label>
                    <div className="severity-emoji-row">
                      {[
                        { level: 'Mild', emoji: '😊', color: '#22C55E' },
                        { level: 'Moderate', emoji: '😐', color: '#EAB308' },
                        { level: 'Uncomfortable', emoji: '😟', color: '#F97316' },
                        { level: 'Severe', emoji: '😫', color: '#EF4444' },
                        { level: 'Emergency', emoji: '😵', color: '#991B1B' },
                      ].map(item => (
                        <button
                          key={item.level}
                          type="button"
                          className={`severity-card ${formData.severity === item.level ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, severity: item.level as any })}
                        >
                          <span className="severity-emoji">{item.emoji}</span>
                          <span className="severity-title" style={{ color: formData.severity === item.level ? item.color : '' }}>
                            {item.level}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="severity-track-bar"></div>
                    <p className="emergency-notice-text">For emergencies, please call 112 or 108.</p>
                  </div>

                  {/* Q5: Consultation Mode */}
                  <div className="form-question-block">
                    <label className="question-label">How would you like to consult?</label>
                    <div className="consult-mode-grid">
                      <button
                        type="button"
                        className={`consult-mode-card ${formData.consultMode === 'Video Consultation' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, consultMode: 'Video Consultation' })}
                      >
                        <div className="popular-badge">Popular</div>
                        <div className="mode-icon">📹</div>
                        <span className="mode-title">Video Consultation</span>
                        <span className="mode-sub">Online from home</span>
                        {formData.consultMode === 'Video Consultation' && <span className="checkmark">✓</span>}
                      </button>

                      <button
                        type="button"
                        className={`consult-mode-card ${formData.consultMode === 'In-Person Visit' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, consultMode: 'In-Person Visit' })}
                      >
                        <div className="mode-icon">👨‍⚕️</div>
                        <span className="mode-title">In-Person Visit</span>
                        <span className="mode-sub">Visit clinic</span>
                        {formData.consultMode === 'In-Person Visit' && <span className="checkmark">✓</span>}
                      </button>

                      <button
                        type="button"
                        className={`consult-mode-card ${formData.consultMode === 'Chat / Message' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, consultMode: 'Chat / Message' })}
                      >
                        <div className="mode-icon">💬</div>
                        <span className="mode-title">Chat / Message</span>
                        <span className="mode-sub">Text-based async</span>
                        {formData.consultMode === 'Chat / Message' && <span className="checkmark">✓</span>}
                      </button>
                    </div>
                  </div>

                  {/* Q6: When do you need to see a doctor? */}
                  <div className="form-question-block">
                    <label className="question-label">When do you need to see a doctor?</label>
                    <div className="urgency-pills-row">
                      {['Today (ASAP)', 'Tomorrow', 'This Week', 'Flexible'].map(u => (
                        <button
                          key={u}
                          type="button"
                          className={`urgency-pill ${formData.urgency === u ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, urgency: u })}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Q7: Additional Details */}
                  <div className="form-question-block">
                    <label className="question-label">Any additional details for the doctor? (Optional)</label>
                    <div className="notes-textarea-wrapper">
                      <textarea
                        rows={3}
                        maxLength={300}
                        placeholder="Share anything that might help your doctor prepare..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                      <span className="char-count">{formData.notes.length}/300</span>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Select Doctor */}
              {currentStep === 2 && (
                <div className="step-2-wrapper">
                  <div className="step2-header-with-back">
                    <button 
                      type="button" 
                      className="btn-round-back-icon" 
                      onClick={handlePrevStep}
                      title="Back"
                    >
                      ‹
                    </button>
                    <div>
                      <h1 className="form-main-title">Select Your Doctor</h1>
                      <p className="form-main-subtitle">Choose from top specialists matched to your symptoms.</p>
                    </div>
                  </div>

                  {/* Step 2 Search & Filter Row */}
                  <div className="step2-search-filter-block">
                    <div className="step2-search-row">
                      <div className="step2-search-input-wrap">
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" width="18" height="18">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Search by doctor name, specialty or keyword..."
                          value={step2SearchTerm}
                          onChange={(e) => setStep2SearchTerm(e.target.value)}
                          className="step2-search-input"
                        />
                        <button type="button" className="step2-mic-btn" title="Voice Search">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="22"/>
                          </svg>
                        </button>
                      </div>

                      <button type="button" className="btn-filter-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
                        </svg>
                        Filters
                      </button>
                    </div>

                    {/* Specialty Chips */}
                    <div className="specialty-chips-row">
                      {['All', 'General Physician', 'Dermatologist', 'Pediatrician', 'Gynecologist', 'Cardiologist'].map(spec => (
                        <button
                          key={spec}
                          type="button"
                          className={`specialty-chip ${step2Specialty === spec ? 'active' : ''}`}
                          onClick={() => setStep2Specialty(spec)}
                        >
                          {spec}
                        </button>
                      ))}
                      <button type="button" className="specialty-chip more-chip">
                        More ∨
                      </button>
                    </div>
                  </div>
                  
                  {/* Doctor Cards Horizontal Rows List */}
                  <div className="step2-doctors-list">
                    {filteredStep2Doctors.map(doc => {
                      const isSelected = formData.selectedDoctor?.id === doc.id;
                      return (
                        <div 
                          key={doc.id} 
                          className={`step2-doctor-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, selectedDoctor: doc })}
                        >
                          <div className="step2-doc-avatar-wrap">
                            <img src={doc.imageUrl} alt={doc.name} className="step2-doc-avatar" />
                          </div>

                          <div className="step2-doc-middle-info">
                            <div className="doc-name-badge-row">
                              <h3 className="doc-name">{doc.name}</h3>
                              <svg className="verified-blue-badge" viewBox="0 0 24 24" fill="#2563EB" width="16" height="16">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </div>
                            <p className="doc-spec-exp">{doc.specialty} • {doc.experience}</p>
                            <p className="doc-hosp-loc">{doc.hospital}, {doc.location}</p>
                            {doc.degrees && <p className="doc-degrees">{doc.degrees}</p>}
                            <div className="doc-rating-row">
                              <span className="star-icon">⭐</span>
                              <span className="rating-num">{doc.rating}</span>
                              <span className="reviews-count">({doc.reviewsCount} reviews)</span>
                            </div>
                          </div>

                          <div className="step2-doc-right-action">
                            <div className="doc-avail-status">
                              <span className={`status-dot ${doc.availableToday ? 'available' : 'tomorrow'}`}></span>
                              <span className="status-text">{doc.availableToday ? 'Available Today' : 'Available Tomorrow'}</span>
                            </div>
                            <span className="doc-consult-type">{formData.consultMode}</span>
                            <span className="doc-fee-price">₹{doc.fee.replace(/\D/g, '')} Consultation Fee</span>

                            <button 
                              type="button" 
                              className={`btn-step2-select ${isSelected ? 'selected' : ''}`}
                            >
                              {isSelected ? 'Selected ✓' : 'View Profile'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Choose Slot */}
              {currentStep === 3 && (
                <div className="step-3-wrapper">
                  <h2 className="form-main-title">Choose Appointment Slot</h2>
                  <p className="form-main-subtitle">
                    Select a date and time slot for <span className="doc-highlight-name">{formData.selectedDoctor?.name || 'Dr. Priya Mehta'}</span>
                  </p>

                  {/* Section 1: Select Date Carousel */}
                  <div className="slot-section-block">
                    <div className="slot-section-header">
                      <span className="section-icon">📅</span>
                      <h3 className="section-title">Select Date</h3>
                    </div>

                    <div className="date-carousel-wrapper">
                      <button type="button" className="carousel-arrow left" title="Previous Dates">‹</button>
                      
                      <div className="date-cards-row">
                        {[
                          { date: '20 May', label: 'Today', dayName: 'Mon' },
                          { date: '21 May', label: '', dayName: 'Tue' },
                          { date: '22 May', label: '', dayName: 'Wed' },
                          { date: '23 May', label: '', dayName: 'Thu' },
                          { date: '24 May', label: '', dayName: 'Fri' },
                          { date: '25 May', label: '', dayName: 'Sat' },
                          { date: '26 May', label: '', dayName: 'Sun' },
                        ].map((d) => {
                          const isSelected = formData.selectedDate.includes(d.date) || (d.label === 'Today' && (formData.selectedDate.includes('Today') || formData.selectedDate.includes('20 May')));
                          return (
                            <button
                              key={d.date}
                              type="button"
                              className={`date-card-box ${isSelected ? 'selected' : ''}`}
                              onClick={() => setFormData({ ...formData, selectedDate: `${d.label ? d.label + ' ' : ''}${d.dayName} ${d.date}` })}
                            >
                              <span className="date-card-tag">{d.label || d.dayName}</span>
                              <span className="date-card-day">{d.dayName}</span>
                              <span className="date-card-num">{d.date}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button type="button" className="carousel-arrow right" title="Next Dates">›</button>
                    </div>
                  </div>

                  {/* Section 2: Available Time Slots Grid */}
                  <div className="slot-section-block" style={{ marginTop: '28px' }}>
                    <div className="slot-section-header">
                      <span className="section-icon">🕒</span>
                      <h3 className="section-title">Available Time Slots</h3>
                    </div>

                    <div className="time-slots-6col-grid">
                      {[
                        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                        '12:00 PM', '12:30 PM', '01:00 PM', '02:00 PM', '02:30 PM', '03:00 PM',
                        '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '07:30 PM',
                      ].map((slot) => {
                        const isSelected = formData.selectedTimeSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`time-slot-pill ${isSelected ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, selectedTimeSlot: slot })}
                          >
                            <span>{slot}</span>
                            {isSelected && <span className="slot-check-icon">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Timezone Info Alert Banner */}
                    <div className="timezone-info-banner">
                      <span className="info-circle-icon">ⓘ</span>
                      <span>All slots are in Indian Standard Time (IST)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Patient Info */}
              {currentStep === 4 && (
                <div className="step-4-wrapper">
                  <h2 className="form-main-title">Patient Details</h2>
                  <p className="form-main-subtitle">Enter details for the consultation record. This gives your doctor vital context about your health.</p>

                  <div className="patient-form-grid">
                    <div className="input-field-group">
                      <label className="field-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-control-input"
                        placeholder="e.g. Ananya Sharma"
                        value={formData.patientName} 
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">Age (Years)</label>
                      <input 
                        type="number" 
                        className="form-control-input"
                        placeholder="e.g. 28"
                        value={formData.patientAge} 
                        onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                      />
                    </div>

                    <div className="input-field-group full-width-field">
                      <label className="field-label">Gender <span className="helper-note">(Provides physiological context for diagnosis)</span></label>
                      <div className="gender-selector-row">
                        {[
                          { id: 'Female', label: 'Female', icon: '👩' },
                          { id: 'Male', label: 'Male', icon: '👨' },
                          { id: 'Other', label: 'Other', icon: '🧑' },
                          { id: 'Prefer not to say', label: 'Prefer not to say', icon: '🔒' },
                        ].map((g) => {
                          const isSelected = formData.patientGender === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              className={`gender-option-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setFormData({ ...formData, patientGender: g.id })}
                            >
                              <span className="gender-card-icon">{g.icon}</span>
                              <span className="gender-card-label">{g.label}</span>
                              {isSelected && <span className="gender-card-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">Phone Number</label>
                      <input 
                        type="text" 
                        className="form-control-input"
                        placeholder="+91 98765 43210"
                        value={formData.patientPhone} 
                        onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">Email Address</label>
                      <input 
                        type="email" 
                        className="form-control-input"
                        placeholder="ananya@example.com"
                        value={formData.patientEmail} 
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Pay */}
              {currentStep === 5 && (
                <div className="step-5-wrapper">
                  <div className="step5-header">
                    <h1 className="form-main-title">Review & Pay</h1>
                    <p className="form-main-subtitle">Please review your appointment details and proceed to payment.</p>
                  </div>

                  {/* Main Appointment Details Card */}
                  <div className="appointment-details-card">
                    <div className="app-details-header">
                      <h2 className="app-details-title">Appointment Details</h2>
                      <button 
                        type="button" 
                        className="btn-edit-appointment" 
                        onClick={() => setCurrentStep(1)}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                    </div>

                    <div className="app-details-list">
                      {/* Row 1: Health Concern */}
                      <div className="app-detail-item">
                        <div className="item-icon-box blue-box">🩺</div>
                        <div className="item-content">
                          <span className="item-label">Health Concern</span>
                          <span className="item-value">{formData.healthConcern === 'specific-symptoms' ? 'Specific Symptoms' : 'Other'}</span>
                          <span className="item-sub">
                            {formData.symptoms.length > 0 ? formData.symptoms.join(', ') : 'General health query'}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Doctor */}
                      <div className="app-detail-item">
                        <div className="item-icon-box green-box">👨‍⚕️</div>
                        <div className="item-content">
                          <span className="item-label">Doctor</span>
                          <span className="item-value">{formData.selectedDoctor?.name || 'Dr. Ananya Sharma'}</span>
                          <span className="item-sub">
                            {formData.selectedDoctor?.specialty || 'Dermatologist'} • {formData.selectedDoctor?.experience || '11+ Years Experience'}
                          </span>
                        </div>
                        {formData.selectedDoctor?.imageUrl && (
                          <img 
                            src={formData.selectedDoctor.imageUrl} 
                            alt={formData.selectedDoctor.name} 
                            className="item-doc-avatar" 
                          />
                        )}
                      </div>

                      {/* Row 3: Date & Time */}
                      <div className="app-detail-item">
                        <div className="item-icon-box purple-box">📅</div>
                        <div className="item-content">
                          <span className="item-label">Date & Time</span>
                          <span className="item-value">{formData.selectedDate || 'Mon, 20 May 2024'}</span>
                          <span className="item-sub time-bold">{formData.selectedTimeSlot || '07:30 PM'}</span>
                        </div>
                        <button type="button" className="btn-add-calendar">
                          📅 Add to Calendar
                        </button>
                      </div>

                      {/* Row 4: Consultation Type */}
                      <div className="app-detail-item">
                        <div className="item-icon-box orange-box">📹</div>
                        <div className="item-content">
                          <span className="item-label">Consultation Type</span>
                          <span className="item-value">{formData.consultMode}</span>
                          <span className="item-sub">Chat / Message</span>
                        </div>
                      </div>

                      {/* Row 5: Patient */}
                      <div className="app-detail-item">
                        <div className="item-icon-box pink-box">👤</div>
                        <div className="item-content">
                          <span className="item-label">Patient</span>
                          <span className="item-value">{formData.patientName}, {formData.patientAge} yrs, {formData.patientGender}</span>
                          <span className="item-sub">{formData.patientPhone} • {formData.patientEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Security Blue Banner */}
                    <div className="security-blue-banner">
                      <svg viewBox="0 0 24 24" fill="#2563EB" width="18" height="18">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span>Your health information is private and secure with us.</span>
                    </div>
                  </div>

                  {/* Bottom Footer Row under Appointment Details Card */}
                  <div className="step5-bottom-bar">
                    <div className="secure-checkout-tag">
                      <span className="lock-icon">🔒</span>
                      <div>
                        <span className="secure-title">Secure Checkout</span>
                        <span className="secure-sub">256-bit SSL encrypted payment</span>
                      </div>
                    </div>

                    <div className="need-help-chat-box">
                      <span className="headset-icon">🎧</span>
                      <div>
                        <span className="help-title">Need Help?</span>
                        <span className="help-sub">Our support team is here to help you.</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-chat-with-us" 
                        onClick={() => setShowHelpModal(true)}
                      >
                        Chat with us
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="form-card-footer">
                <button 
                  type="button" 
                  className="btn-form-back"
                  onClick={handlePrevStep}
                >
                  ← Back
                </button>

                <div className="privacy-badge">
                  🔒 Your health information is private and secure.
                </div>

                <button 
                  type="button" 
                  className="btn-form-next-orange"
                  onClick={handleNextStep}
                >
                  {currentStep === 1 && 'Next: Select Doctor →'}
                  {currentStep === 2 && 'Next: Choose Slot →'}
                  {currentStep === 3 && 'Next: Patient Info →'}
                  {currentStep === 4 && 'Next: Review & Pay →'}
                  {currentStep === 5 && 'Confirm & Pay Now →'}
                </button>
              </div>

              {/* Collapsed Accordion for Next Step preview */}
              {currentStep === 1 && (
                <div className="collapsed-step-accordion">
                  <div className="accordion-header">
                    <span>🔒 Step 2 — Select Doctor</span>
                    <span className="accordion-sub">Complete Step 1 to continue</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Summary Card */}
            <div className="booking-summary-sidebar">
              {currentStep === 5 ? (
                <div className="payment-sidebar-card">
                  {/* Section 1: Payment Summary */}
                  <div className="payment-summary-section">
                    <h3 className="payment-section-title">Payment Summary</h3>
                    
                    <div className="pay-row">
                      <span>Consultation Fee</span>
                      <strong className="pay-amt">₹{formData.selectedDoctor?.fee.replace(/\D/g, '') || '600'}</strong>
                    </div>

                    <div className="pay-row discount-row">
                      <span>Discount</span>
                      <span className="discount-amt">-₹0</span>
                    </div>

                    <div className="pay-divider"></div>

                    <div className="pay-row total-payable-row">
                      <span className="total-label">Total Payable</span>
                      <span className="total-amt">₹{formData.selectedDoctor?.fee.replace(/\D/g, '') || '600'}</span>
                    </div>

                    <div className="no-hidden-charges-badge">
                      <span className="check-icon-green">✓</span>
                      <div>
                        <span className="badge-title">No hidden charges</span>
                        <span className="badge-sub">All taxes included</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pay Securely (Payment Methods) */}
                  <div className="pay-methods-section">
                    <div className="pay-methods-header">
                      <h3 className="payment-section-title">Pay Securely</h3>
                      <div className="pay-logos-row">
                        <span className="pay-logo-badge visa">VISA</span>
                        <span className="pay-logo-badge mc">MC</span>
                        <span className="pay-logo-badge upi">UPI</span>
                        <span className="pay-logo-badge paytm">Paytm</span>
                      </div>
                    </div>

                    <div className="pay-options-group">
                      {/* Option 1: UPI */}
                      <label className={`pay-option-card ${paymentMethod === 'upi' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={paymentMethod === 'upi'}
                          onChange={() => setPaymentMethod('upi')}
                        />
                        <div className="pay-option-content">
                          <div className="pay-option-top">
                            <span className="method-name">UPI</span>
                            <div className="upi-icons-row">
                              <span className="mini-pay-badge gpay">GPay</span>
                              <span className="mini-pay-badge phonepe">Pe</span>
                              <span className="mini-pay-badge paytm-m">Paytm</span>
                            </div>
                          </div>
                          <span className="method-sub">Pay using any UPI app</span>
                        </div>
                      </label>

                      {/* Option 2: Credit / Debit Card */}
                      <label className={`pay-option-card ${paymentMethod === 'card' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                        />
                        <div className="pay-option-content">
                          <span className="method-name">Credit / Debit Card</span>
                          <span className="method-sub">Visa, Mastercard, Rupay</span>
                        </div>
                      </label>

                      {/* Option 3: Net Banking */}
                      <label className={`pay-option-card ${paymentMethod === 'netbanking' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={paymentMethod === 'netbanking'}
                          onChange={() => setPaymentMethod('netbanking')}
                        />
                        <div className="pay-option-content">
                          <span className="method-name">Net Banking</span>
                          <span className="method-sub">All major banks</span>
                        </div>
                      </label>

                      {/* Option 4: Wallets */}
                      <label className={`pay-option-card ${paymentMethod === 'wallets' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={paymentMethod === 'wallets'}
                          onChange={() => setPaymentMethod('wallets')}
                        />
                        <div className="pay-option-content">
                          <span className="method-name">Wallets</span>
                          <span className="method-sub">Paytm, PhonePe, Amazon Pay</span>
                        </div>
                      </label>
                    </div>

                    {/* Pay Button */}
                    <button 
                      type="button" 
                      className="btn-pay-now-primary"
                      onClick={() => setBookingConfirmed(true)}
                    >
                      <span className="lock-icon">🔒</span>
                      <span>Pay ₹{formData.selectedDoctor?.fee.replace(/\D/g, '') || '600'} Securely</span>
                    </button>

                    <div className="secure-payments-note">
                      <span className="check-icon-blue">✓</span>
                      <span>100% Secure Payments</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Card 1: Appointment Summary & Stepper */}
                  <div className="summary-card">
                    <div className="summary-card-header">
                      <h3 className="summary-title">Appointment Summary</h3>
                      <div className="progress-badge">{calculateProgress()}%</div>
                    </div>

                    <div className="summary-stepper-list">
                      <div className="stepper-item completed">
                        <span className="step-circle green">✓</span>
                        <div className="step-text">
                          <span className="step-title">Health Concern</span>
                          <span className="step-desc">Specific Symptoms</span>
                        </div>
                      </div>

                      <div className={`stepper-item ${currentStep >= 2 ? 'completed' : 'pending'}`}>
                        <span className="step-circle green">✓</span>
                        <div className="step-text">
                          <span className="step-title">Select Doctor</span>
                          <span className="step-desc">{formData.selectedDoctor ? formData.selectedDoctor.name : 'Choose specialist'}</span>
                        </div>
                      </div>

                      <div className={`stepper-item ${currentStep === 3 ? 'active-blue' : currentStep > 3 ? 'completed' : 'pending'}`}>
                        <span className="step-circle num">3</span>
                        <div className="step-text">
                          <span className="step-title">Choose Slot</span>
                          <span className="step-desc">Select date & time</span>
                        </div>
                      </div>

                      <div className={`stepper-item ${currentStep === 4 ? 'active-blue' : currentStep > 4 ? 'completed' : 'pending'}`}>
                        <span className="step-circle num">4</span>
                        <div className="step-text">
                          <span className="step-title">Patient Info</span>
                          <span className="step-desc">Your details</span>
                        </div>
                      </div>

                      <div className={`stepper-item ${currentStep === 5 ? 'active-blue' : bookingConfirmed ? 'completed' : 'pending'}`}>
                        <span className="step-circle num">5</span>
                        <div className="step-text">
                          <span className="step-title">Confirm & Pay</span>
                          <span className="step-desc">Review & pay</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Selected Doctor Card Preview */}
                  {formData.selectedDoctor && (
                    <div className="summary-card doc-preview-sidebar-card">
                      <div className="sidebar-doc-preview-content">
                        <img 
                          src={formData.selectedDoctor.imageUrl} 
                          alt={formData.selectedDoctor.name} 
                          className="sidebar-doc-avatar" 
                        />
                        <div className="sidebar-doc-info">
                          <div className="doc-name-badge-row">
                            <h4 className="sidebar-doc-name">{formData.selectedDoctor.name}</h4>
                            <svg className="verified-blue-badge" viewBox="0 0 24 24" fill="#2563EB" width="14" height="14">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </div>
                          <p className="sidebar-doc-spec">{formData.selectedDoctor.specialty}</p>
                          <p className="sidebar-doc-exp">{formData.selectedDoctor.experience}</p>
                          <div className="doc-rating-row">
                            <span className="star-icon">⭐</span>
                            <span className="rating-num">{formData.selectedDoctor.rating}</span>
                            <span className="reviews-count">({formData.selectedDoctor.reviewsCount} reviews)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card 3: Need Help Box */}
                  <div className="summary-card help-sidebar-card">
                    <div className="help-sidebar-content" onClick={() => setShowHelpModal(true)}>
                      <span className="headset-icon">🎧</span>
                      <div>
                        <h5 className="help-sidebar-title">Need Help?</h5>
                        <p className="help-sidebar-sub">Our support team is here to help you.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="booking-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="booking-modal-card" onClick={e => e.stopPropagation()}>
            <h3>Need Help Booking?</h3>
            <p>Our medical assistants are online 24/7 to assist you in picking the right specialist.</p>
            <div className="help-contact-buttons">
              <a href="tel:108" className="btn-primary-orange">Call Support (108)</a>
              <button type="button" className="btn-secondary-outline" onClick={() => setShowHelpModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BookAppointmentPage;
