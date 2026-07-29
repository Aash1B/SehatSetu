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

  // Call States
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTabType>(null);
  const [isEndCallModalOpen, setIsEndCallModalOpen] = useState<boolean>(false);

  // Timer State (HH:MM:SS)
  const [secondsElapsed, setSecondsElapsed] = useState<number>(145); // start at 02:25

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSidebarTab = (tab: SidebarTabType) => {
    setActiveSidebarTab((prev) => (prev === tab ? null : tab));
  };

  const handleEndCallTrigger = () => {
    setIsEndCallModalOpen(true);
  };

  return (
    <div className="sehat-videocall-container relative flex flex-col h-screen w-screen bg-[#0B0F19] overflow-hidden font-sans text-white select-none">
      {/* Top Bar Header */}
      <header className="videocall-top-bar flex items-center justify-between px-6 py-3 bg-[#111827]/80 backdrop-blur-md border-b border-gray-800/60 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 text-orange-400 p-2 rounded-xl border border-orange-500/30">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Dashboard</span>
          </button>

          <div className="vcall-brand-pill">
            <div className="brand-logo-small">
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="var(--color-aster-blue)"/>
              </svg>
            </div>
            <p className="text-xs text-gray-400">Dr. Sunita Deshmukh • General Physician</p>
          </div>
        </div>

        {/* Doctor Details & Consultation Counter */}
        <div className="vcall-header-center">
          <div className="vcall-doctor-summary">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300"
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

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="text-xs text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-all flex items-center gap-1.5"
            onClick={() => { dispatch(setCurrentPage('dashboard')); navigate('/patient/dashboard'); }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* 1. MAIN VIDEO PLAYER AREA */}
        <VideoPlayer
          isVideoOn={isVideoOn}
          isMicOn={isMicOn}
          isScreenSharing={isScreenSharing}
          isHandRaised={isHandRaised}
          doctorName="Dr. Sunita Deshmukh"
          patientName="Ananya Sharma"
        />

        {/* 2. SIDEBAR PANEL (Chat, EHR, Notes, AI Prescriptions) */}
        {activeSidebarTab && (
          <VideoCallSidebar
            activeTab={activeSidebarTab}
            onClose={() => setActiveSidebarTab(null)}
          />
        )}
      </div>

      {/* 3. BOTTOM CONTROL BAR */}
      <VideoCallControls
        isMicOn={isMicOn}
        onToggleMic={() => setIsMicOn(!isMicOn)}
        isVideoOn={isVideoOn}
        onToggleVideo={() => setIsVideoOn(!isVideoOn)}
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
        doctorName="Dr. Sunita Deshmukh"
        doctorSpecialty="General Physician"
        onClose={() => setIsEndCallModalOpen(false)}
      />
    </div>
  );
};

export default VideoConsultationPage;
