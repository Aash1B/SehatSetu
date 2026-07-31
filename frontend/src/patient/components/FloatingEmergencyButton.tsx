import React, { useState } from 'react';

const FloatingEmergencyButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Floating Red Circular SOS Button */}
      <button 
        type="button" 
        className="floating-emergency-btn"
        onClick={() => setModalOpen(true)}
        title="Emergency Help 24/7"
        aria-label="Emergency Help 24/7"
      >
        <div className="siren-pulse-ring"></div>
        <div className="emergency-icon-wrap">
          <svg className="siren-svg-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9v3H3v2h18v-2h-2V9c0-3.87-3.13-7-7-7z" fill="#FFFFFF"/>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" fill="#FFFFFF"/>
            <path d="M12 4V1m7.07 3.07l2.12-2.12M4.93 4.07L2.81 1.95M19 9h3M2 9h3" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="emergency-label">EMERGENCY</span>
      </button>

      {/* Emergency Assistance Modal */}
      {modalOpen && (
        <div className="emergency-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="emergency-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="close-modal-btn"
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>

            <div className="emergency-modal-header">
              <div className="modal-siren-badge">🚨</div>
              <h3 className="modal-title">Emergency Medical Help</h3>
              <p className="modal-subtitle">Fast, 24/7 response when every second counts</p>
            </div>

            <div className="emergency-actions-list">
              <a href="tel:102" className="emergency-action-item call-ambulance">
                <span className="action-icon">🚑</span>
                <div className="action-info">
                  <div className="action-title">Call Ambulance</div>
                  <div className="action-sub">Dial 102 - Immediate Dispatch</div>
                </div>
                <span className="call-now-tag">CALL NOW</span>
              </a>

              <a 
                href="https://www.google.com/search?q=emergency+hospitals+and+ICU+availability+near+me" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="emergency-action-item find-nearest" 
                onClick={() => setModalOpen(false)}
              >
                <span className="action-icon">🏥</span>
                <div className="action-info">
                  <div className="action-title">Emergency Hospitals Nearby</div>
                  <div className="action-sub">View ER centers & ICU availability</div>
                </div>
                <span className="arrow-tag">VIEW →</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingEmergencyButton;
