import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const HeroSection: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <section id="home" className="hero-section">
      <div className="hero-container">
        {/* Left Column Text & CTAs */}
        <div className="hero-content">
          <div className="hero-tag">
            <span className="sparkle-icon">✨</span>
            <span className="hero-tag-text">BETTER CARE STARTS HERE</span>
          </div>

          <h1 className="hero-title">
            Your <span className="text-highlight">Health</span>,<br />
            Our Priority
          </h1>

          <p className="hero-subtitle">
            Connect with top-rated doctors, book appointments instantly, and manage your health — all in one place.
          </p>

          <div className="hero-cta-group">
            <button 
              type="button"
              className="btn-primary-orange"
              onClick={() => navigate('/patient/book/new')}
            >
              Book Appointment
              <svg className="btn-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <a href="#doctors" className="btn-secondary-outline">
              Find a Doctor
              <svg className="btn-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </a>
          </div>

          {/* Social Proof Stack */}
          <div className="social-proof">
            <div className="avatar-stack">
              <span className="avatar avatar-1">A</span>
              <span className="avatar avatar-2">V</span>
              <span className="avatar avatar-3">S</span>
            </div>
            <span className="social-proof-text">
              <strong>50,000+</strong> people cared for
            </span>
          </div>
        </div>

        {/* Right Column Visual Graphic */}
        <div className="hero-visual">
          <div className="visual-circle-bg">
            <div className="trusted-care-badge">
              <span className="plus-sparkle">+</span> Trusted care
            </div>
            <div className="stethoscope-illustration">
              <svg viewBox="0 0 64 64" fill="none" className="stethoscope-svg">
                <path d="M20 12v12c0 6.627 5.373 12 12 12s12-5.373 12-12V12" stroke="#1E293B" strokeWidth="4" strokeLinecap="round"/>
                <path d="M32 36v12c0 4.418-3.582 8-8 8H20" stroke="#1E293B" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="20" cy="56" r="4" fill="#0EA5E9"/>
                <circle cx="20" cy="12" r="3" fill="#F97316"/>
                <circle cx="44" cy="12" r="3" fill="#F97316"/>
              </svg>
              <div className="care-connected-label">Care, connected</div>
            </div>
          </div>

          {/* Floating Next Appointment Card */}
          <div className="floating-card appointment-preview-card">
            <div className="card-header-icon">📅</div>
            <div className="card-details">
              <div className="card-tag">Next appointment</div>
              <div className="card-main-title">Today, 10:30 AM</div>
              <div className="card-sub-title">Dr. Priya Sharma</div>
            </div>
          </div>

          {/* Floating Active Patients Badge */}
          <div className="floating-card active-patients-card">
            <div className="users-icon-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div>
              <div className="stat-number">12.4k</div>
              <div className="stat-label">Active patients</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
