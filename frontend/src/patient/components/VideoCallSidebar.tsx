import React, { useState } from 'react';

export type SidebarTabType = 'chat' | 'prescription' | 'vitals';

interface VideoCallSidebarProps {
  activeTab: SidebarTabType;
  onTabChange: (tab: SidebarTabType) => void;
  onClose: () => void;
  doctorName?: string;
  doctorSpecialty?: string;
}

interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient';
  senderName: string;
  text: string;
  timestamp: string;
  isAttachment?: boolean;
  attachmentName?: string;
}

const VideoCallSidebar: React.FC<VideoCallSidebarProps> = ({
  activeTab,
  onTabChange,
  onClose,
  doctorName = 'Dr. Ananya Sharma',
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'doctor',
      senderName: doctorName,
      text: 'Hello Ananya! Good to see you. How are you feeling today?',
      timestamp: '07:31 PM',
    },
    {
      id: 'm2',
      sender: 'patient',
      senderName: 'You',
      text: 'Hi Doctor, I have had a skin rash on my left arm for 3 days and slight itchiness.',
      timestamp: '07:32 PM',
    },
    {
      id: 'm3',
      sender: 'doctor',
      senderName: doctorName,
      text: 'I understand. Please tilt your camera towards the affected area so I can take a closer look.',
      timestamp: '07:33 PM',
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');

  // Prescription items
  const prescriptionMeds = [
    {
      id: 'rx-1',
      name: 'Tab. Cetirizine 10mg',
      instruction: '1 tablet once daily at night (after dinner)',
      duration: '5 Days',
      type: 'Antihistamine',
    },
    {
      id: 'rx-2',
      name: 'Hydrocortisone 1% Cream',
      instruction: 'Apply thin layer on rash twice daily',
      duration: '7 Days',
      type: 'Topical Ointment',
    },
    {
      id: 'rx-3',
      name: 'Tab. Calamine Soothing Care',
      instruction: 'As needed for itch relief',
      duration: 'As required',
      type: 'Skincare',
    },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'patient',
      senderName: 'You',
      text: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    // Simulate doctor auto-reply after 2.5 seconds
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-doc-${Date.now()}`,
          sender: 'doctor',
          senderName: doctorName,
          text: 'Noted. I have updated your prescription with topical soothing cream.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 2500);
  };

  const handleQuickChipClick = (text: string) => {
    setInputMessage(text);
  };

  return (
    <div className="sehat-video-sidebar">
      {/* Sidebar Top Nav Header */}
      <div className="vsidebar-header">
        <div className="vsidebar-tabs">
          <button
            type="button"
            className={`vtab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => onTabChange('chat')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Live Chat</span>
            <span className="vtab-badge">{messages.length}</span>
          </button>

          <button
            type="button"
            className={`vtab-btn ${activeTab === 'prescription' ? 'active' : ''}`}
            onClick={() => onTabChange('prescription')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Prescription</span>
            <span className="vtab-dot-pulse"></span>
          </button>

          <button
            type="button"
            className={`vtab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
            onClick={() => onTabChange('vitals')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>Vitals</span>
          </button>
        </div>

        <button type="button" className="vsidebar-close-btn" onClick={onClose} aria-label="Close Sidebar">
          ✕
        </button>
      </div>

      {/* TAB 1: LIVE CHAT */}
      {activeTab === 'chat' && (
        <div className="vsidebar-body chat-body">
          <div className="chat-messages-container">
            <div className="chat-encrypted-notice">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10B981" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Messages are end-to-end encrypted</span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-wrapper ${msg.sender === 'patient' ? 'outgoing' : 'incoming'}`}
              >
                <div className="bubble-meta">
                  <span className="bubble-sender">{msg.senderName}</span>
                  <span className="bubble-time">{msg.timestamp}</span>
                </div>
                <div className="bubble-text">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Quick response chips */}
          <div className="quick-chips-row">
            <button type="button" className="quick-chip" onClick={() => handleQuickChipClick('Yes Doctor, I can hear you clearly.')}>
              "Yes, clearly"
            </button>
            <button type="button" className="quick-chip" onClick={() => handleQuickChipClick('How long should I apply this cream?')}>
              "How long to use?"
            </button>
            <button type="button" className="quick-chip" onClick={() => handleQuickChipClick('Can I get a follow-up appointment?')}>
              "Follow-up request"
            </button>
          </div>

          {/* Message Input Box */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="Type message for doctor..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button type="submit" className="chat-send-btn" disabled={!inputMessage.trim()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: LIVE DIGITAL PRESCRIPTION */}
      {activeTab === 'prescription' && (
        <div className="vsidebar-body prescription-body">
          <div className="rx-status-banner">
            <div className="rx-live-indicator">
              <span className="pulse-green-dot"></span>
              <span className="rx-live-text">Live Doctor Workspace</span>
            </div>
            <span className="rx-date">20 May 2024</span>
          </div>

          {/* Prescribed Medications Card */}
          <div className="rx-section-card">
            <h4 className="rx-section-title">
              <span className="rx-symbol">℞</span> Prescribed Medications
            </h4>

            <div className="rx-meds-list">
              {prescriptionMeds.map((med, idx) => (
                <div key={med.id} className="rx-med-item">
                  <div className="med-header">
                    <span className="med-num">{idx + 1}.</span>
                    <span className="med-name">{med.name}</span>
                    <span className="med-type-tag">{med.type}</span>
                  </div>
                  <div className="med-instruction">🕒 {med.instruction}</div>
                  <div className="med-duration">📅 Duration: {med.duration}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Clinical Advice Card */}
          <div className="rx-section-card">
            <h4 className="rx-section-title">💡 Doctor Advice & Diagnosis</h4>
            <div className="rx-notes-content">
              <p>• Diagnosis: Mild Acute Contact Dermatitis (Left forearm).</p>
              <p>• Avoid harsh soaps or hot water baths on the rash.</p>
              <p>• Keep hydrated (2.5L water daily) and consume vitamin-rich diet.</p>
              <p>• Follow up after 5 days if redness persists.</p>
            </div>
          </div>

          {/* Doctor Signature */}
          <div className="rx-signature-box">
            <div className="doc-sig-stamp">
              <span className="sig-text">Verified Electronic Signature</span>
              <span className="sig-name">{doctorName}</span>
              <span className="sig-reg">Reg. No: MCI-2015-88492</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-download-rx-sidebar"
            onClick={() => alert('Downloading official signed PDF prescription...')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Digital Prescription</span>
          </button>
        </div>
      )}

      {/* TAB 3: VITALS & PATIENT SUMMARY */}
      {activeTab === 'vitals' && (
        <div className="vsidebar-body vitals-body">
          <div className="patient-profile-card">
            <div className="patient-avatar-box">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
                alt="Patient Ananya Sharma"
                className="patient-img"
              />
              <div>
                <h4 className="patient-name">Ananya Sharma</h4>
                <span className="patient-sub">28 Yrs • Female • O+ Positive</span>
              </div>
            </div>

            <div className="patient-details-grid">
              <div className="pdetail-item">
                <span className="pdetail-lbl">Height</span>
                <span className="pdetail-val">165 cm</span>
              </div>
              <div className="pdetail-item">
                <span className="pdetail-lbl">Weight</span>
                <span className="pdetail-val">58 kg</span>
              </div>
              <div className="pdetail-item">
                <span className="pdetail-lbl">Allergies</span>
                <span className="pdetail-val alert-tag">Penicillin</span>
              </div>
              <div className="pdetail-item">
                <span className="pdetail-lbl">Blood Pressure</span>
                <span className="pdetail-val">120/80 mmHg</span>
              </div>
            </div>
          </div>

          <div className="vitals-section-card">
            <h4 className="vitals-card-title">Submitted Symptoms</h4>
            <div className="symptoms-chips">
              <span className="symptom-chip">Skin Rash</span>
              <span className="symptom-chip">Itchiness</span>
              <span className="symptom-chip">Redness</span>
            </div>
          </div>

          <div className="vitals-section-card">
            <h4 className="vitals-card-title">Live Vitals Sync</h4>
            <div className="vitals-stream-list">
              <div className="vital-row">
                <div className="vital-label-col">
                  <span className="vital-icon">❤️</span>
                  <div>
                    <span className="vital-title">Heart Rate</span>
                    <span className="vital-status normal">Normal</span>
                  </div>
                </div>
                <span className="vital-value">74 bpm</span>
              </div>

              <div className="vital-row">
                <div className="vital-label-col">
                  <span className="vital-icon">🫁</span>
                  <div>
                    <span className="vital-title">Oxygen (SpO2)</span>
                    <span className="vital-status normal">Optimal</span>
                  </div>
                </div>
                <span className="vital-value">99 %</span>
              </div>

              <div className="vital-row">
                <div className="vital-label-col">
                  <span className="vital-icon">🌡️</span>
                  <div>
                    <span className="vital-title">Temperature</span>
                    <span className="vital-status normal">Normal</span>
                  </div>
                </div>
                <span className="vital-value">98.4 °F</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallSidebar;
