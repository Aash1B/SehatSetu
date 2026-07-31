import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import { setCurrentPage, setDashboardTab, type DashboardTabType } from '../store/uiSlice';
import { fetchPatientDashboardData, type PatientProfile } from '../services/patientApi';

interface ReminderItem {
  id: string;
  title: string;
  sub: string;
  time: string;
  icon: string;
  colorClass: string;
}

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const activeTab = useSelector((state: RootState) => state.ui.dashboardTab);
  const [activeSubTab, setActiveSubTab] = useState<'consultations' | 'prescriptions'>('consultations');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Medical Report "${file.name}" uploaded successfully!`);
    }
  };

  // Dynamic Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([
    { id: '1', title: 'Take Vitamin D3', sub: 'Daily, After Breakfast', time: '08:00 AM', icon: '💊', colorClass: 'blue' },
    { id: '2', title: 'Drink Water Goal', sub: 'Daily Goal: 8 glasses', time: 'Daily', icon: '🧪', colorClass: 'green' },
  ]);
  const [showAddReminderModal, setShowAddReminderModal] = useState<boolean>(false);
  const [newReminderTitle, setNewReminderTitle] = useState<string>('');
  const [newReminderSub, setNewReminderSub] = useState<string>('');
  const [newReminderTime, setNewReminderTime] = useState<string>('09:00 AM');

  useEffect(() => {
    setIsLoading(true);
    fetchPatientDashboardData()
      .then((data) => {
        if (data) {
          setDashboardData(data);
          if (data.profile) {
            setPatientProfile(data.profile);
          }
        }
      })
      .catch((err) => console.warn('Error fetching patient dashboard data:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleTabClick = (tab: DashboardTabType) => {
    dispatch(setDashboardTab(tab));
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    const newRem: ReminderItem = {
      id: Date.now().toString(),
      title: newReminderTitle,
      sub: newReminderSub || 'Custom Reminder',
      time: newReminderTime || 'Daily',
      icon: '⏰',
      colorClass: 'purple',
    };
    setReminders((prev) => [...prev, newRem]);
    setNewReminderTitle('');
    setNewReminderSub('');
    setShowAddReminderModal(false);
  };

  const appointments = dashboardData?.appointments || [];
  const upcomingAppt = appointments.length > 0 ? appointments[0] : null;

  return (
    <div className="sehat-dashboard-root">
      {/* 1. PERMANENT SIDEBAR PANEL */}
      <aside className="sehat-dashboard-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => { dispatch(setCurrentPage('landing')); navigate('/'); }} style={{ cursor: 'pointer' }}>
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
          <div className="sidebar-group">
            <span className="sidebar-group-title">Main Navigation</span>
            <nav className="sidebar-menu">
              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'landing' ? 'active' : ''}`}
                onClick={() => { dispatch(setCurrentPage('landing')); navigate('/'); }}
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
                onClick={() => { dispatch(setCurrentPage('doctors')); navigate('/patient/search'); }}
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
                className={`sidebar-item ${currentPage === 'video-call' ? 'active' : ''}`}
                onClick={() => { dispatch(setCurrentPage('video-call')); navigate('/patient/consultation/CONS-001'); }}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span>Video Consultation</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar-circle">
              {patientProfile?.fullName ? patientProfile.fullName.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="user-details-text">
              <span className="user-display-name">{patientProfile?.fullName || 'Patient Profile'}</span>
              <span className="user-patient-id">{patientProfile?.email || 'Registered Patient'}</span>
            </div>
          </div>

          <button 
            type="button" 
            className="user-logout-btn" 
            title="Sign Out"
            onClick={() => { dispatch(setCurrentPage('landing')); navigate('/patient/login'); }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="sehat-main-wrapper">
        {/* Top Header Navbar Bar */}
        <header className="sehat-top-bar">
          <div className="top-bar-space"></div>
          <div className="top-bar-actions">
            {/* Live Patient Profile Pill */}
            <div className="top-user-pill">
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#2563EB',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
              }}>
                {patientProfile?.fullName ? patientProfile.fullName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="user-pill-info">
                <span className="user-pill-name">{patientProfile?.fullName || 'Patient Account'}</span>
                <span className="user-pill-role">{patientProfile?.role || 'Patient'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="sehat-dash-content">
          {activeTab === 'overview' && (
            <>
              {/* Greeting Header */}
              <div className="dash-greeting-header">
                <h1 className="greeting-title">
                  Good Day, {patientProfile?.fullName ? patientProfile.fullName.split(' ')[0] : 'Patient'} <span className="wave-emoji">👋</span>
                </h1>
                <p className="greeting-subtitle">Here's your live health summary from Supabase.</p>
              </div>

              {/* Quick Action Cards Grid */}
              <div className="quick-actions-2grid">
                <div className="action-card" onClick={() => { dispatch(setCurrentPage('book-appointment')); navigate('/patient/book/doc-6'); }}>
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
                    <p className="card-desc">Find doctors and schedule live appointments</p>
                  </div>
                  <span className="arrow-link blue-arrow">→</span>
                </div>

                <div className="action-card" onClick={() => fileInputRef.current?.click()}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReportUpload}
                    style={{ display: 'none' }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
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
                {/* LEFT COLUMN: Live Upcoming Appointment & Consultations */}
                <div className="dash-left-col">
                  {/* Upcoming Appointment Box */}
                  <div className="upcoming-appt-card">
                    <div className="upcoming-card-header">
                      <h2 className="section-title">Upcoming Appointment</h2>
                      <button type="button" className="link-view-all" onClick={() => handleTabClick('appointments')}>
                        View All ({appointments.length})
                      </button>
                    </div>

                    {upcomingAppt ? (
                      <div className="upcoming-card-content">
                        <img 
                          src={upcomingAppt.doctor?.imageUrl || 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=300'} 
                          alt={upcomingAppt.doctor?.name || upcomingAppt.patientName} 
                          className="doctor-avatar-large" 
                        />
                        <div className="doc-meta">
                          <div className="doc-name-verified">
                            <h3 className="doctor-name">{upcomingAppt.doctor?.name || upcomingAppt.patientName}</h3>
                            <span className="verified-blue-tick">✓</span>
                          </div>
                          <p className="doctor-sub">
                            {upcomingAppt.doctor?.specialty || 'Medical Specialist'} • {upcomingAppt.doctor?.experience || '10+ Years Experience'}
                          </p>

                          <div className="appt-datetime-row">
                            <span className="icon-text">📅 {upcomingAppt.date || 'Scheduled'}</span>
                            <span className="icon-text">🕒 {upcomingAppt.timeSlot || '10:00 AM'}</span>
                          </div>

                          <div className="appt-mode-chip">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2">
                              <polygon points="23 7 16 12 23 17 23 7"/>
                              <rect x="1" y="5" width="15" height="14" rx="2"/>
                            </svg>
                            <span>{upcomingAppt.consultMode || 'Video Consultation'}</span>
                          </div>
                        </div>

                        <div className="upcoming-card-right">
                          <span className="badge-confirmed">{upcomingAppt.status || 'Scheduled'}</span>
                          <div className="action-buttons-group">
                            <button 
                              type="button" 
                              className="btn-join-consultation"
                              onClick={() => { dispatch(setCurrentPage('video-call')); navigate(`/patient/consultation/${upcomingAppt.id}`); }}
                            >
                              Join Consultation
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="upcoming-card-content" style={{ padding: '24px', textAlign: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', width: '100%' }}>
                          <span style={{ fontSize: '32px' }}>📅</span>
                          <h3 style={{ margin: '8px 0 4px', fontSize: '16px', color: '#1E293B' }}>No Upcoming Appointments</h3>
                          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Schedule a live consultation with a verified doctor.</p>
                          <button 
                            type="button" 
                            className="btn-join-consultation" 
                            onClick={() => { dispatch(setCurrentPage('book-appointment')); navigate('/patient/book/doc-6'); }}
                          >
                            Book Appointment Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent Consultations Section */}
                  <div className="recent-consultations-card">
                    <div className="consultations-tabs-header">
                      <div className="tab-buttons-row">
                        <button 
                          type="button" 
                          className={`tab-sub-btn ${activeSubTab === 'consultations' ? 'active' : ''}`}
                          onClick={() => setActiveSubTab('consultations')}
                        >
                          Live Consultations ({appointments.length})
                        </button>
                      </div>
                    </div>

                    <div className="consultations-table">
                      {appointments.length > 0 ? (
                        appointments.map((appt: any) => (
                          <div key={appt.id} className="consultation-row">
                            <div className="row-doctor-info">
                              <img 
                                src={appt.doctor?.imageUrl || 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=300'} 
                                alt={appt.doctor?.name || appt.patientName} 
                                className="row-doc-img" 
                              />
                              <div>
                                <h4 className="row-doc-name">{appt.doctor?.name || appt.patientName}</h4>
                                <span className="row-doc-spec">{appt.doctor?.specialty || 'Specialist'}</span>
                              </div>
                            </div>

                            <div className="row-datetime">
                              <span>📅 {appt.date}</span>
                              <span>🕒 {appt.timeSlot || '10:00 AM'}</span>
                            </div>

                            <div className="row-mode">
                              <span>{appt.consultMode || 'Video Consultation'}</span>
                            </div>

                            <div className="row-action">
                              <button 
                                type="button" 
                                className="btn-view-details"
                                onClick={() => { dispatch(setCurrentPage('video-call')); navigate(`/patient/consultation/${appt.id}`); }}
                              >
                                Join Call
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                          No appointments booked yet in Supabase.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Reminders & Emergency Help */}
                <div className="dash-right-col">
                  {/* Health Reminders */}
                  <div className="dash-widget-card">
                    <div className="widget-header">
                      <h3 className="widget-title">Health Reminders</h3>
                    </div>

                    <div className="reminders-list">
                      {reminders.map((rem) => (
                        <div key={rem.id} className="reminder-item">
                          <div className={`reminder-icon-box ${rem.colorClass}`}>{rem.icon}</div>
                          <div className="reminder-info">
                            <span className="reminder-title">{rem.title}</span>
                            <span className="reminder-sub">{rem.sub}</span>
                          </div>
                          <span className="reminder-time">{rem.time}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      type="button" 
                      className="btn-add-reminder" 
                      onClick={() => setShowAddReminderModal(true)}
                    >
                      + Add Reminder
                    </button>
                  </div>

                  {/* Immediate Emergency Help */}
                  <div className="emergency-widget-card">
                    <h3 className="emergency-heading">Need Immediate Help?</h3>
                    <p className="emergency-sub">Connect with our 24/7 medical emergency team.</p>

                    <div className="emergency-widget-bottom">
                      <button 
                        type="button" 
                        className="btn-emergency-call"
                        onClick={() => alert('Initiating Emergency Tele-Assistance Call...')}
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
            </>
          )}

          {activeTab === 'appointments' && (
            <div className="appointments-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="tab-section-header">
                <div>
                  <h2 className="tab-title">My Appointments</h2>
                  <p className="tab-subtitle">Manage your live appointments in Supabase.</p>
                </div>
              </div>

              <div className="appointments-cards-grid">
                {appointments.length > 0 ? (
                  appointments.map((item: any) => (
                    <div key={item.id} className="appointment-card-item">
                      <div className="appt-card-top">
                        <div className="doc-profile-left">
                          <img 
                            src={item.doctor?.imageUrl || 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=300'} 
                            alt={item.doctor?.name || item.patientName} 
                            className="appt-doc-img" 
                          />
                          <div>
                            <h3 className="appt-doc-name">{item.doctor?.name || item.patientName}</h3>
                            <span className="appt-doc-spec">{item.doctor?.specialty || 'Doctor Specialist'}</span>
                            <span className="appt-id-code">ID: {item.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <span className="badge-confirmed">{item.status || 'Booked'}</span>
                      </div>

                      <div className="appt-card-body" style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>
                        <div>📅 Date: {item.date}</div>
                        <div>🕒 Slot: {item.timeSlot || '10:00 AM'}</div>
                        <div>🩺 Consult Mode: {item.consultMode}</div>
                      </div>

                      <div className="appt-card-actions" style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                        <button 
                          type="button" 
                          className="btn-join-consultation"
                          onClick={() => { dispatch(setCurrentPage('video-call')); navigate(`/patient/consultation/${item.id}`); }}
                          style={{ width: '100%' }}
                        >
                          Join Video Call
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No appointments booked yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="modal-backdrop-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Add Health Reminder</h3>
            <form onSubmit={handleAddReminder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Take Blood Pressure Medication"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Instructions</label>
                <input 
                  type="text" 
                  placeholder="e.g. Daily after lunch"
                  value={newReminderSub}
                  onChange={(e) => setNewReminderSub(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Time</label>
                <input 
                  type="text" 
                  placeholder="e.g. 02:00 PM"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
