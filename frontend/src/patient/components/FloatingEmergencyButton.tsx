import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DOCTOR_HELPLINE = 'tel:18001234567';
const FALLBACK_HOSPITALS_URL = 'https://www.google.com/maps/search/emergency+hospital+near+me';

type SirenSvgProps = {
  className?: string;
  idPrefix: string;
  width?: number;
  height?: number;
};

const SirenSvg: React.FC<SirenSvgProps> = ({ className, idPrefix, width = 72, height = 72 }) => {
  const gradientId = (name: string) => `${idPrefix}-${name}`;

  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId('rayGrad')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#FF9F2E" />
        </linearGradient>
        <linearGradient id={gradientId('domeGrad')} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#FFB9C7" />
          <stop offset="40%" stopColor="#F1567A" />
          <stop offset="100%" stopColor="#D42A4E" />
        </linearGradient>
        <radialGradient id={gradientId('lensGrad')} cx="32%" cy="24%" r="80%">
          <stop offset="0%" stopColor="#FFFBE8" />
          <stop offset="55%" stopColor="#FFC24B" />
          <stop offset="100%" stopColor="#EE9A1C" />
        </radialGradient>
        <linearGradient id={gradientId('baseGrad')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E4E4E1" />
        </linearGradient>
        <linearGradient id={gradientId('baseShade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <g stroke={`url(#${gradientId('rayGrad')})`} strokeWidth="9" strokeLinecap="round">
        <line x1="100" y1="34" x2="100" y2="4" />
        <line x1="66" y1="42" x2="46" y2="18" />
        <line x1="46" y1="66" x2="14" y2="54" />
        <line x1="134" y1="42" x2="154" y2="18" />
        <line x1="154" y1="66" x2="186" y2="54" />
      </g>
      <path d="M52,132 L52,92 C52,58 70,38 100,38 C130,38 148,58 148,92 L148,132 Z" fill={`url(#${gradientId('domeGrad')})`} />
      <path d="M52,132 L52,92 C52,58 70,38 100,38 C130,38 148,58 148,92 L148,132 Z" fill={`url(#${gradientId('baseShade')})`} opacity="0.5" />
      <ellipse cx="100" cy="90" rx="20" ry="32" fill={`url(#${gradientId('lensGrad')})`} />
      <rect x="30" y="128" width="140" height="28" rx="12" fill={`url(#${gradientId('baseGrad')})`} />
      <rect x="30" y="146" width="140" height="10" rx="5" fill={`url(#${gradientId('baseShade')})`} />
    </svg>
  );
};

const FloatingEmergencyButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation('patient');
  const emergencyTitle = t('emergency.title');

  useEffect(() => {
    if (!modalOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalOpen]);

  const openNearbyHospitals = () => {
    setModalOpen(false);

    const openMaps = (url: string) => {
      const mapWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (mapWindow) {
        mapWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    };

    if (!navigator.geolocation) {
      openMaps(FALLBACK_HOSPITALS_URL);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        openMaps(`https://www.google.com/maps/search/emergency+hospital/@${latitude},${longitude},14z`);
      },
      () => openMaps(FALLBACK_HOSPITALS_URL),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <>
      <div className="emergency-btn-wrap">
        <button
          type="button"
          className="emergency-btn floating-emergency-btn"
          onClick={() => setModalOpen(true)}
          title={emergencyTitle}
          aria-label={emergencyTitle}
        >
          <div className="ring" />
          <SirenSvg className="siren-svg" idPrefix="emergency-trigger" />
          <div className="text-block">
            <div
              className="label"
              id="labelText"
              style={{ fontSize: emergencyTitle.length > 9 ? '15px' : '20px' }}
            >
              {emergencyTitle}
            </div>
            <div className="divider" aria-hidden="true">
              <span className="line" />
              <span className="dot" />
              <span className="line right" />
            </div>
          </div>
        </button>
      </div>

      {modalOpen && (
        <div
          className="emergency-modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="emergency-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-modal-title"
          >
            <button
              type="button"
              className="close-modal-btn"
              onClick={() => setModalOpen(false)}
              aria-label={t('close')}
            >
              ✕
            </button>

            <div className="emergency-modal-header">
              <div className="modal-siren-badge">
                <SirenSvg className="modal-siren-image" idPrefix="emergency-modal" width={82} height={82} />
              </div>
              <h2 id="emergency-modal-title" className="modal-title">{t('emergencyHelp')}</h2>
              <p className="modal-subtitle">{t('emergencySubtitle')}</p>
            </div>

            <div className="emergency-actions-list">
              <a href="tel:102" className="emergency-action-item call-ambulance">
                <span className="action-icon" aria-hidden="true">🚑</span>
                <div className="action-info">
                  <div className="action-title">{t('callAmbulance')}</div>
                  <div className="action-sub">{t('dialAmbulance')}</div>
                </div>
                <span className="call-now-tag"><span aria-hidden="true">📞</span> {t('callNow')}</span>
              </a>

              <a href={DOCTOR_HELPLINE} className="emergency-action-item call-doctor">
                <span className="action-icon" aria-hidden="true">📞</span>
                <div className="action-info">
                  <div className="action-title">{t('doctorHelpline')}</div>
                  <div className="action-sub">{t('tollFree')}</div>
                </div>
                <span className="call-now-tag"><span aria-hidden="true">🎧</span> {t('connect')}</span>
              </a>

              <button
                type="button"
                className="emergency-action-item find-nearest"
                onClick={openNearbyHospitals}
              >
                <span className="action-icon" aria-hidden="true">🏥</span>
                <div className="action-info">
                  <div className="action-title">{t('emergencyHospitals')}</div>
                  <div className="action-sub">{t('erIcu')}</div>
                </div>
                <span className="arrow-tag"><span aria-hidden="true">📍</span> {t('viewArrow')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingEmergencyButton;
