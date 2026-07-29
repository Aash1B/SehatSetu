import React, { useState } from 'react';

interface VideoPlayerProps {
  doctorName?: string;
  doctorSpecialty?: string;
  doctorAvatar?: string;
  patientName?: string;
  patientAvatar?: string;
  isMicMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isAudioOnly: boolean;
  isHandRaised: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  doctorName = 'Dr. Ananya Sharma',
  doctorSpecialty = 'Senior Dermatologist',
  doctorAvatar = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
  patientName = 'Ananya Sharma (You)',
  patientAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  isMicMuted,
  isVideoOff,
  isScreenSharing,
  isAudioOnly,
  isHandRaised,
}) => {
  const [pipPosition, setPipPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

  const cyclePipPosition = () => {
    const positions: Array<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'> = [
      'top-right',
      'bottom-right',
      'bottom-left',
      'top-left',
    ];
    const nextIdx = (positions.indexOf(pipPosition) + 1) % positions.length;
    setPipPosition(positions[nextIdx]);
  };

  return (
    <div className="sehat-video-player-stage">
      {/* 1. MAIN STAGE CONTENT (DOCTOR STREAM OR SCREEN SHARE) */}
      <div className="main-stream-container">
        {isScreenSharing ? (
          /* Simulated Screen Share Mode */
          <div className="screenshare-view">
            <div className="screenshare-bar">
              <div className="screenshare-info">
                <span className="live-dot"></span>
                <span>Dr. Ananya Sharma is sharing screen: <strong>Dermatology_Dermoscopy_Report.pdf</strong></span>
              </div>
              <span className="badge-sharing-mode">High Resolution View</span>
            </div>

            <div className="screenshare-content-box">
              <div className="medical-report-mock">
                <div className="report-header-sim">
                  <h3>SEHATSETU CLINICAL DERMATOLOGY ANALYSIS</h3>
                  <span>Report ID: DERM-2024-991</span>
                </div>
                <div className="report-body-sim">
                  <div className="report-image-preview">
                    <img
                      src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600"
                      alt="Dermoscopy analysis"
                      className="scan-image"
                    />
                    <div className="scan-overlay-annotation">
                      <span>Area A: Mild Erythema (Localized)</span>
                    </div>
                  </div>
                  <div className="report-findings">
                    <h4>Clinical Observation:</h4>
                    <p>• Epidermal surface presents mild contact dermatitis.</p>
                    <p>• No deep lesion or fungal proliferation detected.</p>
                    <p>• Recommended topical cortisone application for 5-7 days.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isAudioOnly ? (
          /* Audio-Only Mode Fallback Screen */
          <div className="audio-only-stage">
            <div className="audio-avatar-pulsing">
              <div className="pulse-ring ring-1"></div>
              <div className="pulse-ring ring-2"></div>
              <div className="pulse-ring ring-3"></div>
              <img src={doctorAvatar} alt={doctorName} className="audio-doc-avatar" />
            </div>

            <h3 className="audio-stage-name">{doctorName}</h3>
            <span className="audio-stage-spec">{doctorSpecialty}</span>
            <div className="audio-quality-pill">
              <span className="headset-icon">🎧</span>
              <span>Audio-Only Mode Active • Low Bandwidth Saver</span>
            </div>

            {/* Audio Wave Visualizer Simulation */}
            <div className="audio-waves-container">
              <span className="bar bar1"></span>
              <span className="bar bar2"></span>
              <span className="bar bar3"></span>
              <span className="bar bar4"></span>
              <span className="bar bar5"></span>
              <span className="bar bar6"></span>
              <span className="bar bar7"></span>
            </div>
          </div>
        ) : (
          /* Normal Live Video Feed Display */
          <div className="video-feed-wrapper">
            <img
              src={doctorAvatar}
              alt={doctorName}
              className="remote-doctor-video"
            />
            <div className="video-overlay-gradient"></div>
          </div>
        )}

        {/* Doctor Label & Mic Status Badge */}
        <div className="doctor-label-pill">
          <span className="active-speaker-ring"></span>
          <img src={doctorAvatar} alt={doctorName} className="label-avatar" />
          <div>
            <span className="label-name">{doctorName}</span>
            <span className="label-role">Doctor • Speaking</span>
          </div>
          <div className="label-mic-status">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10B981" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
        </div>

        {/* Top Badges (Connection Quality & Security Encryption) */}
        <div className="stage-top-badges">
          <div className="connection-quality-badge">
            <span className="green-signal-bars">
              <span className="bar-b bar-b1"></span>
              <span className="bar-b bar-b2"></span>
              <span className="bar-b bar-b3"></span>
              <span className="bar-b bar-b4"></span>
            </span>
            <span>HD 1080p • 18ms</span>
          </div>

          <div className="encryption-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10B981" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>256-bit Encrypted</span>
          </div>
        </div>

        {/* Floating Notification Toast (Hand Raised / Prescription Update) */}
        {isHandRaised && (
          <div className="hand-raised-toast">
            <span>✋ You raised your hand. Dr. Ananya Sharma has been notified.</span>
          </div>
        )}
      </div>

      {/* 2. FLOATING PIP (PICTURE-IN-PICTURE) SELF PATIENT PREVIEW */}
      <div className={`patient-pip-container ${pipPosition}`}>
        <div className="pip-header-bar" onClick={cyclePipPosition} title="Click to move PIP corner">
          <span className="pip-title">{patientName}</span>
          <button type="button" className="pip-move-btn">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>

        <div className="pip-video-box">
          {isVideoOff ? (
            <div className="pip-cam-off-placeholder">
              <img src={patientAvatar} alt={patientName} className="pip-avatar-img" />
              <span className="cam-off-badge">Camera Off</span>
            </div>
          ) : (
            <img
              src={patientAvatar}
              alt={patientName}
              className="pip-patient-video"
            />
          )}

          {/* Mic Status Overlay Badge on PIP */}
          <div className={`pip-mic-badge ${isMicMuted ? 'muted' : 'active'}`}>
            {isMicMuted ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#EF4444" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#10B981" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
