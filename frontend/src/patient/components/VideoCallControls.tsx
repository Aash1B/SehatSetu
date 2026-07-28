import React, { useState } from 'react';
import type { SidebarTabType } from './VideoCallSidebar';

interface VideoCallControlsProps {
  isMicMuted: boolean;
  onToggleMic: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  isAudioOnly: boolean;
  onToggleAudioOnly: () => void;
  isHandRaised: boolean;
  onToggleRaiseHand: () => void;
  activeSidebarTab: SidebarTabType | 'none';
  onToggleSidebarTab: (tab: SidebarTabType) => void;
  onEndCall: () => void;
}

const VideoCallControls: React.FC<VideoCallControlsProps> = ({
  isMicMuted,
  onToggleMic,
  isVideoOff,
  onToggleVideo,
  isScreenSharing,
  onToggleScreenShare,
  isAudioOnly,
  onToggleAudioOnly,
  isHandRaised,
  onToggleRaiseHand,
  activeSidebarTab,
  onToggleSidebarTab,
  onEndCall,
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  return (
    <div className="sehat-call-controls-wrapper">
      <div className="call-controls-dock">
        {/* Mic Toggle Button */}
        <button
          type="button"
          className={`control-btn ${isMicMuted ? 'muted' : 'active-state'}`}
          onClick={onToggleMic}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          <span className="control-btn-label">{isMicMuted ? 'Muted' : 'Mic On'}</span>
        </button>

        {/* Camera Toggle Button */}
        <button
          type="button"
          className={`control-btn ${isVideoOff ? 'off-state' : 'active-state'}`}
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M21 21l-4.35-4.35M23 7l-7 5 7 5V7z" />
              <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
          <span className="control-btn-label">{isVideoOff ? 'Cam Off' : 'Camera'}</span>
        </button>

        {/* Screen Share Toggle */}
        <button
          type="button"
          className={`control-btn ${isScreenSharing ? 'sharing' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <path d="M12 7v6m-3-3l3-3 3 3" />
          </svg>
          <span className="control-btn-label">{isScreenSharing ? 'Sharing' : 'Share'}</span>
        </button>

        {/* Audio Only Mode Toggle */}
        <button
          type="button"
          className={`control-btn ${isAudioOnly ? 'audio-only-active' : ''}`}
          onClick={onToggleAudioOnly}
          title="Toggle Audio-Only Mode (Save Data)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <span className="control-btn-label">{isAudioOnly ? 'Audio Mode' : 'HD Video'}</span>
        </button>

        <div className="control-divider"></div>

        {/* Raise Hand Button */}
        <button
          type="button"
          className={`control-btn ${isHandRaised ? 'hand-raised' : ''}`}
          onClick={onToggleRaiseHand}
          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <span className="hand-emoji">✋</span>
          <span className="control-btn-label">{isHandRaised ? 'Hand Up' : 'Raise'}</span>
        </button>

        {/* Live Chat Drawer Trigger */}
        <button
          type="button"
          className={`control-btn ${activeSidebarTab === 'chat' ? 'active-tab' : ''}`}
          onClick={() => onToggleSidebarTab('chat')}
          title="Open Live Chat"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="control-badge-dot"></span>
          <span className="control-btn-label">Chat</span>
        </button>

        {/* Prescription Drawer Trigger */}
        <button
          type="button"
          className={`control-btn ${activeSidebarTab === 'prescription' ? 'active-tab' : ''}`}
          onClick={() => onToggleSidebarTab('prescription')}
          title="Open Digital Prescription"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="control-btn-label">Rx Notes</span>
        </button>

        {/* Vitals Drawer Trigger */}
        <button
          type="button"
          className={`control-btn ${activeSidebarTab === 'vitals' ? 'active-tab' : ''}`}
          onClick={() => onToggleSidebarTab('vitals')}
          title="Open Vitals & Health Summary"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="control-btn-label">Vitals</span>
        </button>

        {/* Device Settings Popup Trigger */}
        <div className="relative-settings-container">
          <button
            type="button"
            className="control-btn settings-gear-btn"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            title="Audio & Video Settings"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {showSettingsMenu && (
            <div className="device-settings-popup">
              <h5 className="popup-title">Device Settings</h5>
              <div className="popup-field">
                <label className="popup-lbl">Microphone</label>
                <select className="popup-select" defaultValue="default">
                  <option value="default">Default - Internal Microphone (Realtek High Definition)</option>
                  <option value="headset">External Headset Mic (Bluetooth)</option>
                </select>
              </div>

              <div className="popup-field">
                <label className="popup-lbl">Camera</label>
                <select className="popup-select" defaultValue="webcam">
                  <option value="webcam">Integrated HD Webcam (1080p)</option>
                  <option value="virtual">OBS Virtual Camera</option>
                </select>
              </div>

              <div className="popup-field">
                <label className="popup-lbl">Output Speaker</label>
                <select className="popup-select" defaultValue="speakers">
                  <option value="speakers">Speakers / Headphones (Realtek Audio)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="control-divider"></div>

        {/* End Call Button */}
        <button
          type="button"
          className="control-btn end-call-btn"
          onClick={onEndCall}
          title="End Video Consultation"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67M22 1l-21 21" />
          </svg>
          <span className="control-btn-label font-semibold">End Call</span>
        </button>
      </div>
    </div>
  );
};

export default VideoCallControls;
