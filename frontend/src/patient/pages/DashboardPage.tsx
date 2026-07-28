import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { setCurrentPage, setDashboardTab, type DashboardTabType } from '../store/uiSlice';

interface ConsultationItem {
  id: string;
  doctorName: string;
  specialty: string;
  avatar: string;
  date: string;
  time: string;
  mode: 'Video Consultation' | 'Chat Consultation' | 'In-Person Visit';
}

const recentConsultationsData: ConsultationItem[] = [
  {
    id: 'CONS-001',
    doctorName: 'Dr. Alok Verma',
    specialty: 'General Physician',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    date: '10 May 2024',
    time: '06:00 PM',
    mode: 'Video Consultation',
  },
  {
    id: 'CONS-002',
    doctorName: 'Dr. Priya Mehta',
    specialty: 'Gynecologist',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    date: '02 May 2024',
    time: '11:00 AM',
    mode: 'Video Consultation',
  },
  {
    id: 'CONS-003',
    doctorName: 'Dr. Alok Verma',
    specialty: 'General Physician',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    date: '18 Apr 2024',
    time: '05:30 PM',
    mode: 'Chat Consultation',
  },
];

const recentPrescriptionsData = [
  {
    id: 'RX-101',
    doctorName: 'Dr. Ananya Sharma',
    date: '20 May 2024',
    meds: 'Tab. Paracetamol 500mg, Tab. Cetirizine 10mg',
  },
  {
    id: 'RX-102',
    doctorName: 'Dr. Alok Verma',
    date: '10 May 2024',
    meds: 'Amoxicillin 500mg, Vitamin C Tablets',
  },
];

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const activeTab = useSelector((state: RootState) => state.ui.dashboardTab);
  const [activeSubTab, setActiveSubTab] = useState<'consultations' | 'prescriptions'>('prescriptions');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<ConsultationItem | null>(null);

  const handleTabClick = (tab: DashboardTabType) => {
    dispatch(setDashboardTab(tab));
  };

  return (
    <div className="sehat-dashboard-root">
      {/* 1. PERMANENT SIDEBAR PANEL (Matching Home Page Sidebar 100%) */}
      <aside className="sehat-dashboard-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => dispatch(setCurrentPage('landing'))} style={{ cursor: 'pointer' }}>
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316"/>
                <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <span className="sidebar-brand-title">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
              <span className="sidebar-portal-badge">Patient Portal</span>
            </div>
          </div>
        </div>

        {/* Content Navigation */}
        <div className="sidebar-content">
          {/* Section 1: Main Menu */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Main Navigation</span>
            <nav className="sidebar-menu">
              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'landing' ? 'active' : ''}`}
                onClick={() => dispatch(setCurrentPage('landing'))}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Home</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabClick('overview')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Patient Dashboard</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'doctors' ? 'active' : ''}`}
                onClick={() => dispatch(setCurrentPage('doctors'))}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="17" y1="11" x2="23" y2="11"></line>
                </svg>
                <span>Find Doctors</span>
              </button>
            </nav>
          </div>

          {/* Section 2: Patient Care Hub */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Patient Care Hub</span>
            <nav className="sidebar-menu">
              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => handleTabClick('appointments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>My Appointments</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'video' ? 'active' : ''}`}
                onClick={() => handleTabClick('video')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span>Video Consultation</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'records' ? 'active' : ''}`}
                onClick={() => handleTabClick('records')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Health Records & History</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => handleTabClick('prescriptions')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
                <span>Prescriptions & Meds</span>
              </button>
            </nav>
          </div>


          {/* Section 4: Settings & Support */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Account & Support</span>
            <nav className="sidebar-menu">
              <button type="button" className="sidebar-item" onClick={() => alert('Profile & Settings opened')}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profile & Settings</span>
              </button>
              <button type="button" className="sidebar-item" onClick={() => alert('Help & FAQs opened')}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Help & FAQs</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer User Profile Card */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="user-avatar">
              <span>AS</span>
              <span className="online-indicator"></span>
            </div>
            <div className="user-details">
              <span className="user-name">Ananya Sharma</span>
              <span className="user-id">Patient ID: #SS-89421</span>
            </div>
          </div>
          <button 
            type="button" 
            className="user-logout-btn" 
            title="Sign Out"
            onClick={() => dispatch(setCurrentPage('landing'))}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA (Covers Full Page Width) */}
      <div className="sehat-main-wrapper">
        {/* Top Header Navbar Bar */}
        <header className="sehat-top-bar">
          <div className="top-bar-space"></div>
          <div className="top-bar-actions">
            {/* Notification Bell */}
            <button type="button" className="btn-notification-bell" aria-label="Notifications">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="bell-badge">2</span>
            </button>

            {/* User Profile Dropdown Pill */}
            <div className="top-user-pill">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" 
                alt="Ananya Sharma" 
                className="user-pill-avatar" 
              />
              <div className="user-pill-info">
                <span className="user-pill-name">Ananya Sharma</span>
                <span className="user-pill-role">Patient</span>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container (Full Page Width) */}
        <main className="sehat-dash-content">
          {/* Greeting Header */}
          <div className="dash-greeting-header">
            <h1 className="greeting-title">
              Good Morning, Ananya <span className="wave-emoji">👋</span>
            </h1>
            <p className="greeting-subtitle">Here's your health summary of today.</p>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="quick-actions-2grid">
            {/* Card 1: Book Appointment */}
            <div className="action-card" onClick={() => dispatch(setCurrentPage('book-appointment'))}>
              <div className="card-icon-badge blue-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="12" y1="13" x2="12" y2="17"/>
                  <line x1="10" y1="15" x2="14" y2="15"/>
                </svg>
              </div>
              <div className="action-card-text">
                <h3 className="card-heading">Book Appointment</h3>
                <p className="card-desc">Find doctors and book an appointment</p>
              </div>
              <span className="arrow-link blue-arrow">→</span>
            </div>

            {/* Card 2: Upload Reports */}
            <div className="action-card" onClick={() => handleTabClick('records')}>
              <div className="card-icon-badge purple-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <polyline points="12 18 12 12 9 15"/>
                  <polyline points="12 12 15 15"/>
                </svg>
              </div>
              <div className="action-card-text">
                <h3 className="card-heading">Upload Reports</h3>
                <p className="card-desc">Upload and share your medical reports</p>
              </div>
              <span className="arrow-link blue-arrow">→</span>
            </div>
          </div>

          {/* Main Dashboard 2-Column Section */}
          <div className="dash-body-grid">
            {/* LEFT COLUMN: Upcoming Appointment & Recent Consultations */}
            <div className="dash-left-col">
              {/* Upcoming Appointment Box */}
              <div className="upcoming-appt-card">
                <div className="upcoming-card-header">
                  <h2 className="section-title">Upcoming Appointment</h2>
                  <button type="button" className="link-view-all" onClick={() => handleTabClick('appointments')}>
                    View All Appointments
                  </button>
                </div>

                <div className="upcoming-card-content">
                  <img 
                    src="https://images.unsplash.com/photo-1594824813566-88855ce78906?auto=format&fit=crop&q=80&w=300" 
                    alt="Dr. Ananya Sharma" 
                    className="doctor-avatar-large" 
                  />
                  <div className="doc-meta">
                    <div className="doc-name-verified">
                      <h3 className="doctor-name">Dr. Ananya Sharma</h3>
                      <span className="verified-blue-tick">✓</span>
                    </div>
                    <p className="doctor-sub">Dermatologist • 11+ Years Experience</p>

                    <div className="appt-datetime-row">
                      <span className="icon-text">📅 Mon, 20 May 2024</span>
                      <span className="icon-text">🕒 07:30 PM</span>
                    </div>

                    <div className="appt-mode-chip">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                      <span>Video Consultation</span>
                    </div>
                  </div>

                  <div className="upcoming-card-right">
                    <span className="badge-confirmed">Confirmed</span>
                    <div className="action-buttons-group">
                      <button 
                        type="button" 
                        className="btn-reschedule"
                        onClick={() => dispatch(setCurrentPage('book-appointment'))}
                      >
                        Reschedule
                      </button>
                      <button 
                        type="button" 
                        className="btn-join-consultation"
                        onClick={() => alert('Joining consultation with Dr. Ananya Sharma...')}
                      >
                        Join Consultation
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Consultations Section */}
              <div className="recent-consultations-card">
                {/* Tabs Header */}
                <div className="consultations-tabs-header">
                  <div className="tab-buttons-row">
                    <button 
                      type="button" 
                      className={`tab-sub-btn ${activeSubTab === 'prescriptions' ? 'active' : ''}`}
                      onClick={() => setActiveSubTab('prescriptions')}
                    >
                      Recent Prescriptions
                    </button>
                    <button 
                      type="button" 
                      className={`tab-sub-btn ${activeSubTab === 'consultations' ? 'active' : ''}`}
                      onClick={() => setActiveSubTab('consultations')}
                    >
                      Recent Consultations
                    </button>
                  </div>
                </div>

                {/* Consultations Table / List */}
                {activeSubTab === 'consultations' ? (
                  <div className="consultations-table">
                    {recentConsultationsData.map((item) => (
                      <div key={item.id} className="consultation-row">
                        <div className="row-doctor-info">
                          <img src={item.avatar} alt={item.doctorName} className="row-doc-img" />
                          <div>
                            <h4 className="row-doc-name">{item.doctorName}</h4>
                            <span className="row-doc-spec">{item.specialty}</span>
                          </div>
                        </div>

                        <div className="row-datetime">
                          <span>📅 {item.date}</span>
                          <span>🕒 {item.time}</span>
                        </div>

                        <div className="row-mode">
                          <span>{item.mode}</span>
                        </div>

                        <div className="row-action">
                          <button 
                            type="button" 
                            className="btn-view-details"
                            onClick={() => setShowDetailsModal(item)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="consultations-table">
                    {recentPrescriptionsData.map((rx) => (
                      <div key={rx.id} className="consultation-row">
                        <div className="row-doctor-info">
                          <div className="rx-icon-box">💊</div>
                          <div>
                            <h4 className="row-doc-name">{rx.doctorName}</h4>
                            <span className="row-doc-spec">{rx.meds}</span>
                          </div>
                        </div>

                        <div className="row-datetime">
                          <span>📅 {rx.date}</span>
                        </div>

                        <div className="row-mode">
                          <span className="rx-tag">Prescription Issued</span>
                        </div>

                        <div className="row-action">
                          <button 
                            type="button" 
                            className="btn-view-details"
                            onClick={() => alert(`Downloading ${rx.id} Prescription PDF...`)}
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table Bottom Link */}
                <div className="consultations-footer-link">
                  <button type="button" className="btn-all-consultations" onClick={() => handleTabClick('appointments')}>
                    View All Consultations
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Health Overview, Reminders, Emergency Widget */}
            <div className="dash-right-col">


              {/* Widget 2: Health Reminders */}
              <div className="dash-widget-card">
                <div className="widget-header">
                  <h3 className="widget-title">Health Reminders</h3>
                  <button type="button" className="widget-link" onClick={() => handleTabClick('records')}>
                    View All
                  </button>
                </div>

                <div className="reminders-list">
                  <div className="reminder-item">
                    <div className="reminder-icon-box blue">💊</div>
                    <div className="reminder-info">
                      <span className="reminder-title">Take Vitamin D3</span>
                      <span className="reminder-sub">Daily, After Breakfast</span>
                    </div>
                    <span className="reminder-time">08:00 AM</span>
                  </div>

                  <div className="reminder-item">
                    <div className="reminder-icon-box green">🧪</div>
                    <div className="reminder-info">
                      <span className="reminder-title">Drink Water</span>
                      <span className="reminder-sub">Daily Goal: 8 glasses</span>
                    </div>
                    <span className="reminder-time">Daily</span>
                  </div>
                </div>

                <button type="button" className="btn-add-reminder" onClick={() => alert('Add reminder modal opened')}>
                  + Add Reminder
                </button>
              </div>

              {/* Widget 3: Need Immediate Help? (Emergency) */}
              <div className="emergency-widget-card">
                <h3 className="emergency-heading">Need Immediate Help?</h3>
                <p className="emergency-sub">Talk to our support team or emergency services.</p>

                <div className="emergency-widget-bottom">
                  <button 
                    type="button" 
                    className="btn-emergency-call"
                    onClick={() => setShowEmergencyModal(false)}
                  >
                    📞 Emergency Call
                  </button>

                  <div className="headset-badge-247">
                    <span className="headset-emoji">🎧</span>
                    <span className="tag-247">24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowDetailsModal(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>Consultation Details ({showDetailsModal.id})</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowDetailsModal(null)}>✕</button>
            </div>

            <div className="modal-body-content">
              <div className="doc-modal-summary">
                <img src={showDetailsModal.avatar} alt={showDetailsModal.doctorName} className="modal-doc-img" />
                <div>
                  <h3>{showDetailsModal.doctorName}</h3>
                  <p>{showDetailsModal.specialty}</p>
                  <span className="status-pill completed">Completed</span>
                </div>
              </div>

              <div className="modal-info-list">
                <div className="info-item">
                  <span className="info-lbl">Date:</span>
                  <span className="info-val">{showDetailsModal.date}</span>
                </div>
                <div className="info-item">
                  <span className="info-lbl">Time:</span>
                  <span className="info-val">{showDetailsModal.time}</span>
                </div>
                <div className="info-item">
                  <span className="info-lbl">Consultation Mode:</span>
                  <span className="info-val">{showDetailsModal.mode}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary-outline" onClick={() => setShowDetailsModal(null)}>
                Close
              </button>
              <button type="button" className="btn-join-consultation" onClick={() => alert('Downloading Consultation Summary PDF...')}>
                Download Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowEmergencyModal(false)}>
          <div className="modal-content-card emergency-style" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="text-red">🚨 24/7 Emergency Assistance</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowEmergencyModal(false)}>✕</button>
            </div>

            <div className="modal-body-content">
              <p className="emergency-intro">If you have a life-threatening medical emergency, call 108 or contact our 24/7 ICU Desk.</p>

              <div className="emergency-numbers-list">
                <a href="tel:108" className="emergency-num-btn red-bg">
                  📞 Call Ambulance & Emergency (108)
                </a>
                <a href="tel:1800112233" className="emergency-num-btn blue-bg">
                  🏥 SehatSetu ICU Helpline (1800-11-2233)
                </a>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary-outline" onClick={() => setShowEmergencyModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
