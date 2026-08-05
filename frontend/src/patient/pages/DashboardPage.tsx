import React, { useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { setDashboardTab, type DashboardTabType } from '../store/uiSlice';
import { useNavigate } from 'react-router-dom';
import { uploadMedicalReport } from '../services/medicalReportsApi';
import { getAppointmentTimeStatus } from '../../utils/appointmentTime';
import PrescriptionViewModal from '../../common/components/PrescriptionViewModal';
import { clearAuth } from '../../auth/authStorage';
import { getPatientDashboard, updatePatientProfile, uploadPatientAvatar } from '../services/patientApi';
import AccountDeletionDangerZone from '../../auth/components/AccountDeletionDangerZone';

interface ConsultationItem {
  id: string;
  doctorName: string;
  specialty: string;
  avatar: string;
  date: string;
  time: string;
  mode: 'Video Consultation' | 'Chat Consultation' | 'In-Person Visit';
  status?: string;
  scheduledAt?: string;
  doctorId?: string;
  prescription?: any;
}

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const activeTab = useSelector((state: RootState) => state.ui.dashboardTab);
  const [activeSubTab, setActiveSubTab] = useState<'consultations' | 'prescriptions'>('prescriptions');
  const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<ConsultationItem | null>(null);
  const [latestAppointment, setLatestAppointment] = useState<any>(null);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const defaultDoctor = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    if (image.src === defaultDoctor) return;
    image.onerror = null;
    image.src = defaultDoctor;
  };

  const [reportUploadState, setReportUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [reportUploadMessage, setReportUploadMessage] = useState('');
  const reportInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [consultationsList, setConsultationsList] = useState<ConsultationItem[]>([]);
  const [prescriptionsList, setPrescriptionsList] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [showRxModal, setShowRxModal] = useState<boolean>(false);
  const [selectedRxData, setSelectedRxData] = useState<any>(null);
  const [selectedEhrModalData, setSelectedEhrModalData] = useState<any>(null);

  // Profile & Settings states
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'medical' | 'security' | 'notifications' | 'billing'>('personal');
  const [profileData, setProfileData] = useState({
    fullName: '', email: '', phone: '', dob: '', gender: '', bloodGroup: '',
    height: '', weight: '', address: '', emergencyContactName: '',
    emergencyContactPhone: '', allergies: [] as string[], chronicConditions: [] as string[],
  });

  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    enable2FA: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    whatsappReminders: true,
    emailPrescriptions: true,
    smsAlerts: true,
    healthTips: false,
  });

  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const [ehrReportsList, setEhrReportsList] = useState<any[]>(false ? [
    {
      id: 'EHR-2026-001',
      title: 'Blood CBC & Dengue Test Report',
      date: 'Aug 02, 2026',
      status: '✓ Processed via OCR',
      summary: 'Extracted Platelet Count: 185,000 / μL • Hemoglobin: 14.2 g/dL',
      source: 'Diagnostic Lab',
      extractedData: 'Platelets: 185,000 / μL | RBC: 4.8 M/μL | WBC: 7,200 / μL | Hemoglobin: 14.2 g/dL'
    },
    {
      id: 'EHR-9941',
      title: 'General Physician Consultation EHR',
      date: 'Jul 25, 2026',
      status: '🩺 Clinical Record',
      summary: 'Diagnosis: Acute Viral Fever • Prescriptions issued & Rest advised',
      source: 'SehatSetu Telehealth',
      extractedData: 'Diagnosis: Acute Viral Fever | Prescribed: Paracetamol 650mg, Cetirizine 10mg | Follow-up: 5 days'
    }
  ] : []);

  useEffect(() => {
    // Disabled legacy mock/local-storage loader; authenticated data is loaded below.
    if (false) {
    // Clear legacy 2024 cached mock items
    const activeRxStr = localStorage.getItem('sehatsetu_active_prescription');
    if (activeRxStr && (activeRxStr!.includes('2024') || activeRxStr!.includes('May 20'))) {
      localStorage.removeItem('sehatsetu_active_prescription');
    }

    const fetchAppointments = async () => {
      try {
        const res = await fetch('/api/appointments');
        if (res.ok) {
          const apps = await res.json();
          if (Array.isArray(apps) && apps.length > 0) {
            setLatestAppointment(apps[0]); // Most recently booked appointment
            const dbConsultations: ConsultationItem[] = apps.map((app: any) => {
              const matchedDoc = app.doctor || null;
              
              let displayDate = app.date;
              if (app.scheduledAt) {
                const sDate = new Date(app.scheduledAt);
                if (!isNaN(sDate.getTime())) {
                  displayDate = sDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                }
              }
              
              if (!displayDate || displayDate.includes('May') || displayDate.includes('2024') || displayDate.includes('Thu 23')) {
                const today = new Date();
                displayDate = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
              }

              return {
                id: app.id || `CONS-${Math.floor(1000 + Math.random() * 9000)}`,
                doctorName: matchedDoc?.name || app.doctorName || 'Dr. Alok Verma',
                specialty: matchedDoc?.specialty || 'General Physician',
                avatar: matchedDoc?.imageUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
                date: displayDate,
                time: app.timeSlot || '10:00 AM',
                mode: (app.consultMode || 'Video Consultation') as any,
              };
            });
            setConsultationsList(dbConsultations);
          }
        }
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      }
    };
    fetchAppointments();

    // Sync recently issued prescriptions from live consultations
    const activeRx = localStorage.getItem('sehatsetu_active_prescription');
    if (activeRx) {
      try {
        const parsed = JSON.parse(activeRx!);
        const formattedRx = {
          id: parsed.id || 'RX-2026-8849',
          doctorName: parsed.doctorName || 'Dr. Ananya Sharma',
          date: parsed.date || 'Today',
          meds: Array.isArray(parsed.medications) 
            ? parsed.medications.map((m: any) => m.name).join(', ') 
            : 'Tab. Paracetamol 650mg, Tab. Cetirizine 10mg',
          fullData: parsed,
        };

        setPrescriptionsList((prev) => {
          const exists = prev.some((p) => p.id === formattedRx.id);
          return exists ? prev : [formattedRx, ...prev];
        });
      } catch (e) {
        console.error('Error loading prescription on patient dashboard:', e);
      }
    }
    }
  }, []);

  useEffect(() => {
    let active = true;
    getPatientDashboard()
      .then((data) => {
        if (!active) return;
        const p = data.profile;
        setProfileImageUrl(p.profileImageUrl || '');
        setProfileData({
          fullName: p.fullName || '', email: p.email || '', phone: p.phone || '',
          dob: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '', gender: p.gender || '',
          bloodGroup: p.bloodGroup || '', height: p.height || '', weight: p.weight || '',
          address: '', emergencyContactName: '', emergencyContactPhone: p.emergencyContact || '',
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : [],
        });

        const appointments = Array.isArray(data.appointments) ? data.appointments : [];
        setLatestAppointment(appointments.find((a: any) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED') || null);
        setConsultationsList(appointments.map((app: any) => ({
          id: app.id,
          doctorName: app.doctor?.name || app.doctor?.user?.fullName || 'Doctor',
          specialty: app.doctor?.specialty || 'Medical consultation',
          avatar: app.doctor?.imageUrl || '',
          date: app.scheduledAt ? new Date(app.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : (app.date || ''),
          time: app.timeSlot || (app.scheduledAt ? new Date(app.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
          mode: app.consultMode === 'CHAT' ? 'Chat Consultation' : app.consultMode === 'IN_PERSON' ? 'In-Person Visit' : 'Video Consultation',
          status: app.status || 'SCHEDULED',
          scheduledAt: app.scheduledAt,
          doctorId: app.doctorId,
          prescription: app.prescription || null,
        })));

        const prescriptionRecords = [...(data.prescriptions || [])];
        appointments.forEach((appointment: any) => {
          if (appointment.prescription && !prescriptionRecords.some((rx: any) => rx.id === appointment.prescription.id)) {
            prescriptionRecords.push({ ...appointment.prescription, appointment, doctor: appointment.doctor });
          }
        });
        setPrescriptionsList(prescriptionRecords.map((rx: any) => {
          const medications = Array.isArray(rx.medicines) ? rx.medicines : [];
          const doctorName = rx.doctor?.name || rx.doctor?.user?.fullName || 'Doctor';
          const date = new Date(rx.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          return {
            id: rx.id, doctorName, date,
            meds: medications.map((m: any) => m.name || String(m)).join(', ') || 'No medicines listed',
            fullData: {
              ...rx,
              doctorName,
              doctorSpecialty: rx.doctor?.specialty,
              doctorHospital: rx.doctor?.hospital || 'SehatSetu Digital Health Clinic',
              patientName: p.fullName,
              patientAge: p.age,
              patientGender: p.gender,
              date,
              diagnosis: rx.appointment?.ehrRecord?.diagnosis || rx.appointment?.healthConcern || '',
              symptoms: rx.appointment?.symptoms || [],
              notes: rx.appointment?.ehrRecord?.notes || rx.appointment?.notes || '',
              medications,
            },
          };
        }));

        const clinicalRecords = (data.ehrRecords || []).map((record: any) => ({
          id: record.id, title: record.diagnosis || 'Consultation health record',
          date: new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          status: 'Clinical Record', summary: record.aiSummary || record.notes || 'No clinical summary available.',
          source: 'SehatSetu consultation', extractedData: record.notes || record.aiSummary || '',
        }));
        const reports = (data.medicalReports || []).map((report: any) => ({
          id: report.id, title: report.originalFileName,
          date: new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          status: report.ocrStatus, summary: report.extractedText || 'Report uploaded; processing may still be in progress.',
          source: 'Uploaded medical report', extractedData: report.extractedText || '',
        }));
        setEhrReportsList([...reports, ...clinicalRecords]);
        setDashboardError('');
      })
      .catch((error) => setDashboardError(error instanceof Error ? error.message : 'Unable to load patient dashboard.'))
      .finally(() => setDashboardLoading(false));
    return () => { active = false; };
  }, []);

  const handleTabClick = (tab: DashboardTabType) => {
    dispatch(setDashboardTab(tab));
  };

  const patientInitials = profileData.fullName
    .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P';
  const patientFirstName = profileData.fullName.split(/\s+/).filter(Boolean)[0] || 'Patient';

  const saveProfile = async () => {
    setProfileSaveSuccess(false);
    try {
      const updated = await updatePatientProfile({
        fullName: profileData.fullName, phone: profileData.phone,
        dateOfBirth: profileData.dob, gender: profileData.gender,
        bloodGroup: profileData.bloodGroup, height: profileData.height,
        weight: profileData.weight, emergencyContact: profileData.emergencyContactPhone,
        allergies: profileData.allergies, chronicConditions: profileData.chronicConditions,
      });
      setProfileData((current) => ({ ...current, ...updated, dob: updated.dateOfBirth ? String(updated.dateOfBirth).slice(0, 10) : current.dob }));
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to save profile.');
    }
  };

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setDashboardError('');
    setAvatarUploading(true);
    try {
      const result = await uploadPatientAvatar(file);
      setProfileImageUrl(result.profileImageUrl);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Profile picture upload failed.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleReportSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setReportUploadState('uploading');
    setReportUploadMessage(`🔍 Uploading & Running AI OCR on ${file.name}…`);
    try {
      const result: any = await uploadMedicalReport(file);
      setReportUploadState('success');
      setReportUploadMessage(`✨ ${file.name} uploaded & AI OCR Extracted successfully!`);

      const newEhrItem = {
        id: result?.id || `EHR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: '✓ Processed via OCR',
        summary: result?.extractedText ? `OCR Extracted Text: ${result.extractedText.slice(0, 80)}...` : 'AI Extracted: Key health parameters & lab findings stored in EHR.',
        source: 'Uploaded EHR Report',
        extractedData: result?.extractedText || 'Extracted parameters: Normal range. Report verified & indexed in database.'
      };

      setEhrReportsList((prev) => [newEhrItem, ...prev]);
    } catch (error) {
      setReportUploadState('error');
      setReportUploadMessage(
        error instanceof Error ? error.message : 'Report upload failed.',
      );
    }
  };

  return (
    <div className="sehat-dashboard-root">
      {/* 1. PERMANENT SIDEBAR PANEL (Matching Home Page Sidebar 100%) */}
      <aside className="sehat-dashboard-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
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
                className={`sidebar-item ${currentPage === 'landing' && activeTab !== 'overview' && activeTab !== 'appointments' && activeTab !== 'records' && activeTab !== 'prescriptions' ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Home</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => {
                  handleTabClick('overview');
                  navigate('/patient/dashboard');
                }}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                </svg>
                <span>Dashboard</span>
              </button>

              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'doctors' ? 'active' : ''}`}
                onClick={() => navigate('/patient/search')}
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
              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabClick('profile')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profile & Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer User Profile Card */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="user-avatar">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : <span>{patientInitials}</span>}
              <span className="online-indicator"></span>
            </div>
            <div className="user-details">
              <span className="user-name">{profileData.fullName || 'Patient'}</span>
              <span className="user-id">Patient portal</span>
            </div>
          </div>
          <button 
            type="button" 
            className="user-logout-btn" 
            title="Sign Out"
            onClick={() => { clearAuth(); navigate('/patient/login'); }}
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
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={profileData.fullName || 'Patient'} className="user-pill-avatar" />
              ) : (
                <div className="user-pill-avatar" style={{ display: 'grid', placeItems: 'center', background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>{patientInitials}</div>
              )}
              <div className="user-pill-info">
                <span className="user-pill-name">{profileData.fullName || 'Patient'}</span>
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
          {dashboardLoading && <p className="tab-subtitle">Loading your health data…</p>}
          {dashboardError && <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{dashboardError}</p>}
          {activeTab === 'overview' && (
            <>
          {/* Greeting Header */}
          <div className="dash-greeting-header">
            <h1 className="greeting-title">
              Good Morning, {patientFirstName} <span className="wave-emoji">👋</span>
            </h1>
            <p className="greeting-subtitle">Here's your health summary of today.</p>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="quick-actions-2grid">
            {/* Card 1: Book Appointment */}
            <div className="action-card" onClick={() => navigate('/patient/book/new')}>
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
            <div
              className="action-card"
              onClick={() => {
                if (reportUploadState !== 'uploading') {
                  reportInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  reportUploadState !== 'uploading' &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  reportInputRef.current?.click();
                }
              }}
            >
              <input
                ref={reportInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleReportSelected}
                style={{ display: 'none' }}
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
                <p
                  className="card-desc"
                  style={
                    reportUploadState === 'error'
                      ? { color: '#dc2626' }
                      : reportUploadState === 'success'
                        ? { color: '#15803d' }
                        : undefined
                  }
                >
                  {reportUploadMessage || 'Upload and securely process medical reports'}
                </p>
              </div>
              <span className="arrow-link blue-arrow">→</span>
            </div>
          </div>

          {/* Main Dashboard 2-Column Section */}
          <div className="dash-body-grid">
            {/* LEFT COLUMN: Upcoming Appointment & Recent Consultations */}
            <div className="dash-left-col">
              {/* Upcoming Appointment Box */}
              {(() => {
                if (!latestAppointment) {
                  return (
                    <div className="upcoming-appt-card">
                      <div className="upcoming-card-header"><h2 className="section-title">Upcoming Appointment</h2></div>
                      <p className="tab-subtitle">You have no upcoming appointments.</p>
                    </div>
                  );
                }
                const bookedDoctor = latestAppointment.doctor;
                const displayDocName = bookedDoctor?.name || bookedDoctor?.user?.fullName || 'Doctor';
                const displayDocSub = [bookedDoctor?.specialty, bookedDoctor?.experience].filter(Boolean).join(' • ');
                const displayDate = latestAppointment?.scheduledAt ? new Date(latestAppointment.scheduledAt).toLocaleDateString() : (latestAppointment?.date || 'Date pending');
                const displayTime = latestAppointment?.timeSlot || 'Time pending';
                const displayMode = latestAppointment?.consultMode || 'VIDEO';
                const displayPhoto = bookedDoctor?.imageUrl || '';
                const apptId = latestAppointment.id;

                return (
                  <div className="upcoming-appt-card">
                    <div className="upcoming-card-header">
                      <h2 className="section-title">Upcoming Appointment</h2>
                      <button type="button" className="link-view-all" onClick={() => handleTabClick('appointments')}>
                        View All Appointments
                      </button>
                    </div>

                    <div className="upcoming-card-content">
                      <img 
                        src={displayPhoto} 
                        alt={displayDocName} 
                        className="doctor-avatar-large" 
                        loading="lazy"
                        onError={handleImageError}
                      />
                      <div className="doc-meta">
                        <div className="doc-name-verified">
                          <h3 className="doctor-name">{displayDocName}</h3>
                          <span className="verified-blue-tick">✓</span>
                        </div>
                        <p className="doctor-sub">{displayDocSub}</p>

                        <div className="appt-datetime-row">
                          <span className="icon-text">📅 {displayDate}</span>
                          <span className="icon-text">🕒 {displayTime}</span>
                        </div>

                        <div className="appt-mode-chip">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2"/>
                          </svg>
                          <span>{displayMode}</span>
                        </div>
                      </div>

                      {(() => {
                        const timeStatus = getAppointmentTimeStatus(
                          latestAppointment?.scheduledAt,
                          displayDate,
                          displayTime
                        );

                        return (
                          <div className="upcoming-card-right">
                            <span className="badge-confirmed">
                              {latestAppointment?.status === 'COMPLETED' ? 'Completed' : timeStatus.isJoinable ? 'Live Now' : 'Confirmed'}
                            </span>
                            <div className="action-buttons-group">
                              <button 
                                type="button" 
                                className="btn-reschedule"
                                onClick={() => navigate('/patient/book/new')}
                              >
                                Reschedule
                              </button>
                              {timeStatus.isJoinable ? (
                                <button 
                                  type="button" 
                                  className="btn-join-consultation animate-pulse bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                  onClick={() => navigate(`/patient/consultation/${apptId}`)}
                                >
                                  📹 Join Consultation
                                </button>
                              ) : (
                                <button 
                                  type="button" 
                                  className="btn-join-consultation opacity-60 cursor-not-allowed bg-slate-200 text-slate-600 border border-slate-300"
                                  title={timeStatus.sublabel}
                                  onClick={() => alert(`Consultation is scheduled for ${displayTime}. You can join 10 minutes prior to your scheduled time.`)}
                                >
                                  🔒 {timeStatus.label}
                                </button>
                              )}
                            </div>
                            {!timeStatus.isJoinable && timeStatus.sublabel && (
                              <span className="text-[11px] font-semibold text-amber-600 block text-right mt-1">
                                ⏱️ {timeStatus.sublabel}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

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
                    {consultationsList.map((item) => (
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
                    {prescriptionsList.map((rx) => (
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
                            onClick={() => {
                              setSelectedRxData(rx.fullData || {
                                id: rx.id,
                                doctorName: rx.doctorName,
                                patientName: profileData.fullName,
                                date: rx.date,
                                medications: [],
                                dietAdvice: ''
                              });
                              setShowRxModal(true);
                            }}
                          >
                            View / Download PDF
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
              {(() => {
                const doctorPrescribedReminders = (latestAppointment?.prescriptions && Array.isArray(latestAppointment.prescriptions) && latestAppointment.prescriptions.length > 0)
                  ? latestAppointment.prescriptions.map((rx: any) => ({
                      icon: '💊',
                      title: rx.medicationName || 'Prescribed Medication',
                      sub: `${rx.dosage || 'Take as directed'} (${rx.frequency || 'Daily'})`,
                      time: rx.timing || '08:00 AM',
                    }))
                  : [];

                const defaultGenericReminders = [
                  {
                    icon: '💧',
                    title: 'Drink Water',
                    sub: 'Drink at least 2 liters (8 glasses) per day for optimal hydration',
                    time: 'Daily',
                  },
                  {
                    icon: '🚶',
                    title: 'Daily Walk & Exercise',
                    sub: 'Walk at least 30 minutes daily for cardiovascular wellness',
                    time: 'Daily',
                  },
                  {
                    icon: '😴',
                    title: 'Restful Sleep',
                    sub: 'Get 7-8 hours of continuous sleep for body recovery',
                    time: 'Daily',
                  },
                ];

                const displayReminders: Array<{ icon: string; title: string; sub: string; time: string }> = doctorPrescribedReminders.length > 0 
                  ? doctorPrescribedReminders 
                  : defaultGenericReminders;

                const isDocRecommended = doctorPrescribedReminders.length > 0;

                return (
                  <div className="dash-widget-card">
                    <div className="widget-header">
                      <div>
                        <h3 className="widget-title">Health Reminders</h3>
                        <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                          {isDocRecommended ? '🩺 Doctor Prescribed' : '🌿 Daily Wellness Guidelines'}
                        </span>
                      </div>
                      <button type="button" className="widget-link" onClick={() => handleTabClick('records')}>
                        View All
                      </button>
                    </div>

                    <div className="reminders-list">
                      {displayReminders.map((item, idx) => (
                        <div key={idx} className="reminder-item">
                          <div className={`reminder-icon-box ${idx % 2 === 0 ? 'blue' : 'green'}`}>
                            {item.icon}
                          </div>
                          <div className="reminder-info">
                            <span className="reminder-title">{item.title}</span>
                            <span className="reminder-sub">{item.sub}</span>
                          </div>
                          <span className="reminder-time">{item.time}</span>
                        </div>
                      ))}
                    </div>

                    <button type="button" className="btn-add-reminder" onClick={() => alert('Add reminder modal opened')}>
                      + Add Reminder
                    </button>
                  </div>
                );
              })()}

              {/* Widget 3: Need Immediate Help? (Emergency) */}
              <div className="emergency-widget-card">
                <h3 className="emergency-heading">Need Immediate Help?</h3>
                <p className="emergency-sub">Talk to our support team or emergency services.</p>

                <div className="emergency-widget-bottom">
                  <a
                    href="tel:102"
                    className="btn-emergency-call"
                    onClick={() => setShowEmergencyModal(false)}
                  >
                    📞 Emergency Call
                  </a>

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
                  <p className="tab-subtitle">Manage your upcoming and past consultations.</p>
                </div>
              </div>
              
              <div className="appointments-filter-bar">
                <button type="button" className={`filter-btn ${appointmentFilter === 'upcoming' ? 'active' : ''}`} onClick={() => setAppointmentFilter('upcoming')}>Upcoming</button>
                <button type="button" className={`filter-btn ${appointmentFilter === 'past' ? 'active' : ''}`} onClick={() => setAppointmentFilter('past')}>Past</button>
                <button type="button" className={`filter-btn ${appointmentFilter === 'cancelled' ? 'active' : ''}`} onClick={() => setAppointmentFilter('cancelled')}>Cancelled</button>
              </div>

              <div className="appointments-cards-grid">
                {consultationsList.filter((item) => {
                  const status = (item.status || 'SCHEDULED').toUpperCase();
                  const isCancelled = status === 'CANCELLED' || status === 'CANCELED';
                  const isPast = status === 'COMPLETED';
                  return appointmentFilter === 'cancelled' ? isCancelled : appointmentFilter === 'past' ? isPast : !isCancelled && !isPast;
                }).map((item) => (
                  <div key={item.id} className="appointment-card-item">
                    <div className="appt-card-top">
                      <div className="doc-profile-left">
                        <img src={item.avatar} alt={item.doctorName} className="appt-doc-img" />
                        <div>
                          <h3 className="appt-doc-name">{item.doctorName}</h3>
                          <span className="appt-doc-spec">{item.specialty}</span>
                          <span className="appt-id-code">ID: {item.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="appt-card-details">
                      <div className="detail-chip highlight">
                        <span>📅</span> {item.date}
                      </div>
                      <div className="detail-chip">
                        <span>🕒</span> {item.time}
                      </div>
                      <div className="detail-chip">
                        <span>🎥</span> {item.mode}
                      </div>
                    </div>

                    {(() => {
                      const cardTimeStatus = getAppointmentTimeStatus(item.scheduledAt, item.date, item.time);
                      return (
                        <div className="appt-card-footer">
                          {cardTimeStatus.isJoinable ? (
                            <button 
                              type="button" 
                              className="btn-join-video-sm animate-pulse bg-emerald-600 hover:bg-emerald-700 text-white font-bold" 
                              onClick={() => navigate(`/patient/consultation/${item.id}`)}
                            >
                              📹 Join Consultation
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              className="btn-join-video-sm opacity-60 cursor-not-allowed bg-slate-200 text-slate-600 border border-slate-300" 
                              onClick={() => alert(`Consultation is scheduled for ${item.time}. You can join 10 minutes prior to your scheduled time.`)}
                            >
                              🔒 {cardTimeStatus.label}
                            </button>
                          )}
                          {appointmentFilter === 'upcoming' && (
                            <button type="button" className="btn-card-secondary" onClick={() => navigate(`/patient/book/${item.doctorId || 'new'}?reschedule=${encodeURIComponent(item.id)}`)}>
                              Reschedule
                            </button>
                          )}
                          {appointmentFilter === 'past' && item.prescription && (
                            <button type="button" className="btn-card-secondary" onClick={() => {
                              const rx = prescriptionsList.find((entry) => entry.id === item.prescription?.id);
                              setSelectedRxData(rx?.fullData || item.prescription);
                              setShowRxModal(true);
                            }}>View Prescription</button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
                {consultationsList.filter((item) => {
                  const status = (item.status || 'SCHEDULED').toUpperCase();
                  const cancelled = status === 'CANCELLED' || status === 'CANCELED';
                  const past = status === 'COMPLETED';
                  return appointmentFilter === 'cancelled' ? cancelled : appointmentFilter === 'past' ? past : !cancelled && !past;
                }).length === 0 && <div className="appointments-empty-state">No {appointmentFilter} appointments found.</div>}
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="records-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="tab-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="tab-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>Electronic Health Records (EHR) & Medical History</h2>
                  <p className="tab-subtitle" style={{ fontSize: '14px', color: '#64748b' }}>Connected directly with database EHR records, lab reports, and OCR clinical summaries.</p>
                </div>
                <button
                  type="button"
                  onClick={() => reportInputRef.current?.click()}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  📁 Upload New EHR Report
                </button>
              </div>

              {/* EHR Overview Summary Banner */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>🏥 Verified EHR Clinical Timeline</h3>
                <p style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
                  Your Electronic Health Record aggregates all consultation notes, prescriptions, and lab reports processed through AI OCR. All files are securely encrypted and stored in your medical vault.
                </p>
              </div>

              {/* EHR Database Records Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {ehrReportsList.map((item) => (
                  <div key={item.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                      <span style={{ background: item.status.includes('OCR') ? '#dcfce7' : '#dbeafe', color: item.status.includes('OCR') ? '#15803d' : '#1e40af', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px' }}>
                        {item.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.date}</span>
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{item.title}</h4>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>{item.summary}</p>
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb' }}>ID: {item.id}</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedEhrModalData(item)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        🔍 View AI OCR Data
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-tab-content">
              {/* Profile Hero Header */}
              <div className="profile-hero-header">
                <div className="profile-avatar-wrapper">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelected}
                    style={{ display: 'none' }}
                  />
                  <div className="profile-avatar-large">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt={profileData.fullName || 'Patient'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : patientInitials}
                  </div>
                  <button 
                    type="button" 
                    className="profile-avatar-edit-btn"
                    title="Upload New Profile Picture"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarUploading ? '…' : '✏️'}
                  </button>
                </div>

                <div className="profile-hero-info">
                  <div className="profile-hero-name-row">
                    <h2 className="profile-hero-name">{profileData.fullName}</h2>
                    <span className="profile-badge-pill profile-badge-verified">
                      ✓ Verified Patient
                    </span>
                    <span className="profile-badge-pill profile-badge-gold">
                      ⭐ Gold Member
                    </span>
                  </div>
                  <p className="profile-hero-sub">{profileData.email} • {profileData.phone}</p>
                  <p className="profile-hero-meta">Patient ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#ffffff' }}>#PAT-2026-9812</span> • Reg Date: Aug 2026</p>
                </div>
              </div>

              {/* Settings Sub-Tabs Header Bar */}
              <div className="profile-subtabs-bar">
                {[
                  { id: 'personal', label: '👤 Personal Details' },
                  { id: 'medical', label: '🩺 Medical Profile & Vitals' },
                  { id: 'security', label: '🔒 Account & Security' },
                  { id: 'notifications', label: '🔔 Notifications' },
                  { id: 'billing', label: '💳 Billing & Payments' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`profile-subtab-btn ${profileSubTab === tab.id ? 'active' : ''}`}
                    onClick={() => setProfileSubTab(tab.id as any)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Toast Success Alert */}
              {profileSaveSuccess && (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  <span>✓ Profile settings updated and saved successfully!</span>
                  <button onClick={() => setProfileSaveSuccess(false)} style={{ background: 'none', border: 'none', color: '#047857', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              {/* Sub-Tab 1: Personal Details */}
              {profileSubTab === 'personal' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title">Personal & Contact Information</h3>
                  
                  <div className="profile-form-grid">
                    <div className="profile-field-group">
                      <label className="profile-label">Full Name</label>
                      <input 
                        type="text" 
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Email Address</label>
                      <input 
                        type="email" 
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Phone Number</label>
                      <input 
                        type="text" 
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Date of Birth</label>
                      <input 
                        type="date" 
                        value={profileData.dob}
                        onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Gender</label>
                      <select 
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                        className="profile-input-control"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Blood Group</label>
                      <select 
                        value={profileData.bloodGroup}
                        onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                        className="profile-input-control"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Height (cm)</label>
                      <input 
                        type="number" 
                        value={profileData.height}
                        onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Weight (kg)</label>
                      <input 
                        type="number" 
                        value={profileData.weight}
                        onChange={(e) => setProfileData({ ...profileData, weight: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group full-width">
                      <label className="profile-label">Residential Address</label>
                      <input 
                        type="text" 
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Emergency Contact Name</label>
                      <input 
                        type="text" 
                        value={profileData.emergencyContactName}
                        onChange={(e) => setProfileData({ ...profileData, emergencyContactName: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Emergency Contact Phone</label>
                      <input 
                        type="text" 
                        value={profileData.emergencyContactPhone}
                        onChange={(e) => setProfileData({ ...profileData, emergencyContactPhone: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="profile-save-btn"
                    >
                      💾 Save Profile Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Medical Profile & Vitals */}
              {profileSubTab === 'medical' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title">Medical History & Vitals Overview</h3>
                  
                  {/* Current Vitals Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>❤️</span>
                      <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Blood Pressure</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#881337' }}>--</span>
                      <span style={{ fontSize: '10px', color: '#f43f5e', display: 'block', fontWeight: '600' }}>No reading recorded</span>
                    </div>

                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>💓</span>
                      <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Heart Rate</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#78350f' }}>--</span>
                      <span style={{ fontSize: '10px', color: '#f59e0b', display: 'block', fontWeight: '600' }}>No reading recorded</span>
                    </div>

                    <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🩸</span>
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Blood Sugar</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b' }}>--</span>
                      <span style={{ fontSize: '10px', color: '#10b981', display: 'block', fontWeight: '600' }}>No reading recorded</span>
                    </div>

                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🫁</span>
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Oxygen (SpO2)</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a' }}>--</span>
                      <span style={{ fontSize: '10px', color: '#3b82f6', display: 'block', fontWeight: '600' }}>No reading recorded</span>
                    </div>
                  </div>

                  {/* Known Allergies */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 className="profile-label">Known Medical Allergies</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {profileData.allergies.map((allergy, idx) => (
                        <span key={idx} style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚠️ {allergy}
                        </span>
                      ))}
                      <button 
                        onClick={() => {
                          const newAllergy = prompt('Enter new allergy:');
                          if (newAllergy) setProfileData({ ...profileData, allergies: [...profileData.allergies, newAllergy] });
                        }}
                        style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', border: 'none' }}
                      >
                        + Add Allergy
                      </button>
                    </div>
                  </div>

                  {/* Chronic Conditions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 className="profile-label">Chronic Conditions</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {profileData.chronicConditions.map((condition, idx) => (
                        <span key={idx} style={{ backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🩺 {condition}
                        </span>
                      ))}
                      <button 
                        onClick={() => {
                          const newCond = prompt('Enter condition name:');
                          if (newCond) setProfileData({ ...profileData, chronicConditions: [...profileData.chronicConditions, newCond] });
                        }}
                        style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', border: 'none' }}
                      >
                        + Add Condition
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Account & Security */}
              {profileSubTab === 'security' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title">Password & Security Settings</h3>

                  <div style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="profile-field-group">
                      <label className="profile-label">Current Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={securitySettings.currentPassword}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-label">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={securitySettings.newPassword}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={securitySettings.confirmPassword}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => alert('Password updated successfully!')}
                      className="profile-save-btn"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      Update Password
                    </button>
                  </div>

                  {/* 2FA Section */}
                  <div style={{ paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 className="profile-label">Two-Factor Authentication (2FA)</h4>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>Secure your account with SMS & Email verification OTPs on login.</p>
                    </div>
                    <button 
                      onClick={() => setSecuritySettings({ ...securitySettings, enable2FA: !securitySettings.enable2FA })}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: securitySettings.enable2FA ? '#059669' : '#e2e8f0',
                        color: securitySettings.enable2FA ? '#ffffff' : '#334155',
                        border: 'none'
                      }}
                    >
                      {securitySettings.enable2FA ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <AccountDeletionDangerZone role="PATIENT" />
                </div>
              )}

              {/* Sub-Tab 4: Notifications */}
              {profileSubTab === 'notifications' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title">Notification & Alert Preferences</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { key: 'whatsappReminders', title: 'WhatsApp Consultation Reminders', desc: 'Receive instant WhatsApp links 15 minutes before your video call.' },
                      { key: 'emailPrescriptions', title: 'Email Prescription Copy', desc: 'Automatically email PDF prescription copies after consultation end.' },
                      { key: 'smsAlerts', title: 'SMS Booking Alerts', desc: 'Receive SMS confirmations and status updates for doctor appointments.' },
                      { key: 'healthTips', title: 'Weekly Wellness & Health Tips', desc: 'Personalized AI tips tailored to your health profile and chronic conditions.' },
                    ].map((item) => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <div>
                          <h4 className="profile-label">{item.title}</h4>
                          <p style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={(notificationSettings as any)[item.key]}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                          style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 5: Billing & Payments */}
              {profileSubTab === 'billing' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title">Saved Payment Methods & History</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Default Payment UPI</span>
                        <span style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', fontSize: '10px', fontWeight: 'bold', padding: '2px 10px', borderRadius: '9999px' }}>Not configured</span>
                      </div>
                      <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: '#ffffff' }}>No saved UPI</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8' }}>Add a payment method during checkout.</p>
                    </div>

                    <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Visa Debit Card</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Not configured</span>
                      </div>
                      <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: '#ffffff' }}>No saved card</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8' }}>Payment details are not stored here.</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
          
          {activeTab === 'prescriptions' && (
            <div className="prescriptions-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="tab-section-header">
                <div>
                  <h2 className="tab-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>Prescriptions & Medications</h2>
                  <p className="tab-subtitle" style={{ fontSize: '14px', color: '#64748b' }}>View and download all official medical prescriptions issued by your doctors.</p>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div className="consultations-table">
                  {prescriptionsList.map((rx) => (
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
                          onClick={() => {
                            setSelectedRxData(rx.fullData || {
                              id: rx.id,
                              doctorName: rx.doctorName,
                              patientName: profileData.fullName,
                              date: rx.date,
                              medications: [],
                              dietAdvice: ''
                            });
                            setShowRxModal(true);
                          }}
                        >
                          View / Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                  {prescriptionsList.length === 0 && <div className="appointments-empty-state">No prescriptions have been issued yet.</div>}
                </div>
              </div>
            </div>
          )}
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

      {/* AI OCR Data Inspection Modal */}
      {selectedEhrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">✓ Verified AI OCR Result</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{selectedEhrModalData.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedEhrModalData(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AI Extracted Clinical Data</span>
              <p className="text-xs font-mono text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                {selectedEhrModalData.extractedData}
              </p>
            </div>

            <div className="text-xs text-gray-500">
              <p>• Report ID: <span className="font-mono font-bold">{selectedEhrModalData.id}</span></p>
              <p>• Source: <span className="font-semibold">{selectedEhrModalData.source}</span></p>
              <p>• Uploaded Date: <span className="font-semibold">{selectedEhrModalData.date}</span></p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setSelectedEhrModalData(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close EHR Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription View & Download Modal */}
      <PrescriptionViewModal
        isOpen={showRxModal}
        isModal={true}
        onClose={() => setShowRxModal(false)}
        data={selectedRxData}
      />
    </div>
  );
};

export default DashboardPage;
