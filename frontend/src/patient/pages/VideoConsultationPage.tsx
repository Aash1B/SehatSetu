import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCurrentPage } from '../store/uiSlice';
import VideoPlayer from '../components/VideoPlayer';
import VideoCallControls from '../components/VideoCallControls';
import VideoCallSidebar, { type SidebarTabType } from '../components/VideoCallSidebar';
import EndCallModal from '../components/EndCallModal';

const VideoConsultationPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Call duration timer
  const [secondsElapsed, setSecondsElapsed] = useState<number>(872); // Starts around 14m 32s for realistic feel
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Call states
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTabType | 'none'>('chat');
  const [isEndCallModalOpen, setIsEndCallModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Timer interval effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleToggleSidebarTab = (tab: SidebarTabType) => {
    if (activeSidebarTab === tab) {
      setActiveSidebarTab('none');
    } else {
      setActiveSidebarTab(tab);
    }
  };

  const handleEndCallTrigger = () => {
    setIsTimerRunning(false);
    setIsEndCallModalOpen(true);
  };

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`sehat-video-consultation-root ${activeSidebarTab !== 'none' ? 'sidebar-open' : ''}`}>
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="vcall-top-header">
        <div className="vcall-header-left">
          <button
            type="button"
            className="btn-vcall-back"
            onClick={() => {
              dispatch(setCurrentPage('dashboard'));
              navigate('/patient/dashboard');
            }}
            title="Return to Patient Dashboard"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Dashboard</span>
          </button>

          <div className="vcall-brand-pill">
            <div className="brand-logo-small">
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316" />
              </svg>
            </div>
            <span className="brand-name">SehatSetu</span>
            <span className="live-call-badge">
              <span className="pulsing-red-dot"></span> LIVE
            </span>
          </div>
        </div>

        {/* Doctor Details & Consultation Counter */}
        <div className="vcall-header-center">
          <div className="vcall-doctor-summary">
            <img
              src="https://images.unsplash.com/photo-1594824813566-88855ce78906?auto=format&fit=crop&q=80&w=150"
              alt="Dr. Ananya Sharma"
              className="vcall-doc-avatar"
            />
            <div>
              <div className="doc-name-verified">
                <h3 className="vcall-doc-name">Dr. Ananya Sharma</h3>
                <span className="blue-tick-sm">✓</span>
              </div>
              <span className="vcall-doc-spec">Senior Dermatologist • OPD Room 4</span>
            </div>
          </div>

          <div className="vcall-timer-box">
            <span className="timer-icon">⏱️</span>
            <span className="timer-display">{formatTimer(secondsElapsed)}</span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="vcall-header-right">
          <button
            type="button"
            className="vcall-icon-btn"
            onClick={toggleFullscreenMode}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT BODY GRID (VIDEO PLAYER + SIDEBAR) */}
      <div className="vcall-body-grid">
        {/* Main Video View Stage */}
        <main className="vcall-stage-area">
          <VideoPlayer
            doctorName="Dr. Ananya Sharma"
            doctorSpecialty="Senior Dermatologist"
            isMicMuted={isMicMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            isAudioOnly={isAudioOnly}
            isHandRaised={isHandRaised}
          />
        </main>

        {/* Right Collapsible Side Panel */}
        {activeSidebarTab !== 'none' && (
          <aside className="vcall-sidebar-area">
            <VideoCallSidebar
              activeTab={activeSidebarTab}
              onTabChange={(tab) => setActiveSidebarTab(tab)}
              onClose={() => setActiveSidebarTab('none')}
              doctorName="Dr. Ananya Sharma"
            />
          </aside>
        )}
      </div>

      {/* 3. BOTTOM FLOATING GLASS CONTROL DOCK */}
      <VideoCallControls
        isMicMuted={isMicMuted}
        onToggleMic={() => setIsMicMuted(!isMicMuted)}
        isVideoOff={isVideoOff}
        onToggleVideo={() => setIsVideoOff(!isVideoOff)}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
        isAudioOnly={isAudioOnly}
        onToggleAudioOnly={() => setIsAudioOnly(!isAudioOnly)}
        isHandRaised={isHandRaised}
        onToggleRaiseHand={() => setIsHandRaised(!isHandRaised)}
        activeSidebarTab={activeSidebarTab}
        onToggleSidebarTab={handleToggleSidebarTab}
        onEndCall={handleEndCallTrigger}
      />

      {/* 4. END CALL SUMMARY & RATING MODAL */}
      <EndCallModal
        isOpen={isEndCallModalOpen}
        callDuration={secondsElapsed}
        doctorName="Dr. Ananya Sharma"
        doctorSpecialty="Senior Dermatologist"
        onClose={() => setIsEndCallModalOpen(false)}
      />
    </div>
  );
};

export default VideoConsultationPage;
