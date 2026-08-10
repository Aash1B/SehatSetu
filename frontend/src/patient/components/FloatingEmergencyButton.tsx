import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FloatingEmergencyButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation('patient');

  return (
    <>
      {/* Floating Red Circular SOS Button */}
      <button
        type="button"
        className="floating-emergency-btn"
        onClick={() => setModalOpen(true)}
        title={t('emergencyHelp')}
        aria-label={t('emergencyHelp')}
      >
        <div className="siren-pulse-ring"></div>
        <div className="emergency-icon-wrap">
          <img src="/emergency.jpeg" alt={t('emergencyHelp')} className="emergency-img" loading="eager" />
        </div>
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
              <h3 className="modal-title">{t('emergencyHelp')}</h3>
              <p className="modal-subtitle">{t('emergencySubtitle')}</p>
            </div>

            <div className="emergency-actions-list">
              <a href="tel:102" className="emergency-action-item call-ambulance">
                <span className="action-icon">🚑</span>
                <div className="action-info">
                  <div className="action-title">{t('callAmbulance')}</div>
                  <div className="action-sub">{t('dialAmbulance')}</div>
                </div>
                <span className="call-now-tag">{t('callNow')}</span>
              </a>

              <a href="tel:18001234567" className="emergency-action-item call-doctor">
                <span className="action-icon">📞</span>
                <div className="action-info">
                  <div className="action-title">{t('doctorHelpline')}</div>
                  <div className="action-sub">{t('tollFree')}</div>
                </div>
                <span className="call-now-tag">{t('connect')}</span>
              </a>

              <a
                href="https://www.google.com/maps/search/hospitals+near+me"
                target="_blank"
                rel="noopener noreferrer"
                className="emergency-action-item find-nearest"
                onClick={() => setModalOpen(false)}
              >
                <span className="action-icon">🏥</span>
                <div className="action-info">
                  <div className="action-title">{t('emergencyHospitals')}</div>
                  <div className="action-sub">{t('erIcu')}</div>
                </div>
                <span className="arrow-tag">{t('viewArrow')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingEmergencyButton;
