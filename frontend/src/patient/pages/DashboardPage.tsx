import React, { useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { setDashboardTab, type DashboardTabType } from '../store/uiSlice';
import { useNavigate } from 'react-router-dom';
import { uploadMedicalReport } from '../services/medicalReportsApi';
import { doctorsData } from '../data/doctorsData';
import { getAppointmentTimeStatus } from '../../utils/appointmentTime';
import PrescriptionViewModal from '../../common/components/PrescriptionViewModal';
import { clearAuth } from '../../auth/authStorage';
import { getPatientDashboard, updatePatientProfile, uploadPatientAvatar } from '../services/patientApi';
import AccountDeletionDangerZone from '../../auth/components/AccountDeletionDangerZone';
import { useTranslation } from 'react-i18next';
import { LiquidLoader } from '../../common/components/LiquidLoader';

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

/* Legacy mock datasets were removed. Patient records now come from the authenticated API. */
const recentConsultationsData: ConsultationItem[] = [
  {
    id: 'CONS-001',
    doctorName: 'Dr. Alok Verma',
    specialty: 'Pediatrician & General Physician',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    date: 'Aug 02, 2026',
    time: '06:00 PM',
    mode: 'Video Consultation',
  },
  {
    id: 'CONS-002',
    doctorName: 'Dr. Priya Mehta',
    specialty: 'Gynecologist',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    date: 'Jul 28, 2026',
    time: '11:00 AM',
    mode: 'Video Consultation',
  },
  {
    id: 'CONS-003',
    doctorName: 'Dr. Alok Verma',
    specialty: 'General Physician',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    date: 'Jul 20, 2026',
    time: '05:30 PM',
    mode: 'Chat Consultation',
  },
];

const recentPrescriptionsData = [
  {
    id: 'RX-2026-8849',
    doctorName: 'Dr. Ananya Sharma',
    date: 'Aug 02, 2026',
    meds: 'Tab. Paracetamol 650mg, Tab. Cetirizine 10mg',
    fullData: {
      id: 'RX-2026-8849',
      doctorName: 'Dr. Ananya Sharma',
      doctorSpecialty: 'General Physician & Telehealth Specialist',
      doctorRegNo: 'MCI-IND-98742',
      doctorHospital: 'SehatSetu Digital Health Clinic',
      patientName: 'Patient',
      patientAge: 31,
      patientGender: 'Female',
      date: 'Aug 02, 2026',
      diagnosis: 'Acute Viral Fever with Body Ache',
      symptoms: ['Persistent Fever (4 days)', 'Body ache & Fatigue'],
      medications: [
        { name: 'Tab. Paracetamol 650mg', dosage: '650 mg', frequency: '1-0-1', duration: '5 days', timing: 'After Food' },
        { name: 'Tab. Cetirizine 10mg', dosage: '10 mg', frequency: '0-0-1', duration: '3 days', timing: 'SOS at Night' }
      ],
      dietAdvice: 'Increase fluid intake (min 3L/day), avoid spicy and oily foods, take warm water & rest.',
      notes: 'Follow up in 5 days if fever persists. Complete CBC & Dengue NS1 test if body ache continues.'
    }
  },
  {
    id: 'RX-2026-7412',
    doctorName: 'Dr. Alok Verma',
    date: 'Jul 28, 2026',
    meds: 'Amoxicillin 500mg, Vitamin C 500mg',
    fullData: {
      id: 'RX-2026-7412',
      doctorName: 'Dr. Alok Verma',
      doctorSpecialty: 'Pediatrician & General Practitioner',
      doctorRegNo: 'MCI-IND-65412',
      doctorHospital: 'Max Super Speciality Hospital',
      patientName: 'Patient',
      patientAge: 31,
      patientGender: 'Female',
      date: 'Jul 28, 2026',
      diagnosis: 'Upper Respiratory Tract Infection',
      symptoms: ['Sore Throat', 'Mild Cough', 'Nasal Congestion'],
      medications: [
        { name: 'Cap. Amoxicillin 500mg', dosage: '500 mg', frequency: '1-1-1', duration: '5 days', timing: 'After Food' },
        { name: 'Tab. Vitamin C 500mg', dosage: '500 mg', frequency: '1-0-0', duration: '10 days', timing: 'Morning' }
      ],
      dietAdvice: 'Warm saline gargles 3 times daily. Avoid cold beverages and ice creams.',
      notes: 'Rest for 3 days and stay well hydrated.'
    }
  },
];

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['patient', 'common', 'buttons', 'errors', 'appointment']);
  const tCommon = (key: string) => i18n.t(key, { ns: 'common' });
  const tNav = (key: string) => i18n.t(key, { ns: 'navbar' });

  const CONSULT_MODE: Record<string, string> = {
    'Video Consultation': 'forms.consultMode.video',
    'Chat Consultation': 'forms.consultMode.chat',
    'In-Person Visit': 'forms.consultMode.inPerson',
    VIDEO: 'forms.consultMode.video',
    CHAT: 'forms.consultMode.chat',
    IN_PERSON: 'forms.consultMode.inPerson',
  };
  const translateMode = (mode: string) => i18n.t(CONSULT_MODE[mode] || 'forms.consultMode.video', { ns: 'forms', defaultValue: mode });
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const activeTab = useSelector((state: RootState) => state.ui.dashboardTab);
  const [activeSubTab, setActiveSubTab] = useState<'consultations' | 'prescriptions'>('prescriptions');
  const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<ConsultationItem | null>(null);
  const [latestAppointment, setLatestAppointment] = useState<any>(null);
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
  const [previewDoc, setPreviewDoc] = useState<{ url: string; fileName: string } | null>(null);

  // Profile & Settings states
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'medical' | 'security' | 'notifications' | 'billing'>('personal');
  const [profileData, setProfileData] = useState({
    fullName: '', email: '', phone: '', dob: '', gender: '', maritalStatus: '', occupation: '',
    preferredLanguages: [] as string[], bloodGroup: '', height: '', weight: '', address: '', pincode: '', emergencyContactName: '',
    emergencyContactPhone: '', emergencyContactRelationship: '',
    secondaryEmergencyName: '', secondaryEmergencyPhone: '', secondaryEmergencyRelationship: '',
    allergies: [] as string[], chronicConditions: [] as string[],
    severeConditions: [] as string[], familyHistory: [] as string[],
  });
  const [showSecondaryContact, setShowSecondaryContact] = useState(false);

  // Medical preset options
  const allergyPresets = ['Peanuts', 'Dairy', 'Insect Stings', 'Dust', 'Any Medication', 'Pets'];
  const currentConditionPresets = ['Diabetes', 'High Blood Pressure', 'Hypertension', 'Asthma', 'Sinus', 'Thyroid'];
  const severeConditionPresets = ['Heart Disease', 'Stroke', 'COPD', 'Liver Cirrhosis', 'Pneumonia', "Parkinson's"];
  const familyHistoryPresets = ['Diabetes', 'Thyroid', 'Heart Disease', 'Cancer', 'Other'];

  // Custom input state for each medical section
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [showCustomAllergyInput, setShowCustomAllergyInput] = useState(false);
  const [customCurrentCondInput, setCustomCurrentCondInput] = useState('');
  const [showCustomCurrentCondInput, setShowCustomCurrentCondInput] = useState(false);
  const [customSevereCondInput, setCustomSevereCondInput] = useState('');
  const [showCustomSevereCondInput, setShowCustomSevereCondInput] = useState(false);
  const [customFamilyHistInput, setCustomFamilyHistInput] = useState('');
  const [showCustomFamilyHistInput, setShowCustomFamilyHistInput] = useState(false);

  const languageOptions = ['Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Kannada'];
  const maritalStatusOptions = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
  const relationshipOptions = ['Father', 'Mother', 'Husband', 'Wife', 'Son', 'Daughter', 'Friend', 'Other'];

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
                const matchedDoc = doctorsData.find(d => d.id === app.doctorId) || doctorsData[0];

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
          maritalStatus: p.maritalStatus || '', occupation: p.occupation || '',
          preferredLanguages: Array.isArray(p.preferredLanguages) ? p.preferredLanguages : [],
          bloodGroup: p.bloodGroup || '', height: p.height || '', weight: p.weight || '',
          address: p.address || '', pincode: p.pincode || '', emergencyContactName: p.emergencyContactName || '', emergencyContactPhone: p.emergencyContact || p.emergencyContactPhone || '', emergencyContactRelationship: p.emergencyContactRelationship || '',
          secondaryEmergencyName: p.secondaryEmergencyName || '',
          secondaryEmergencyPhone: p.secondaryEmergencyPhone || '',
          secondaryEmergencyRelationship: p.secondaryEmergencyRelationship || '',
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : [],
          severeConditions: Array.isArray(p.severeConditions) ? p.severeConditions : [],
          familyHistory: Array.isArray(p.familyHistory) ? p.familyHistory : [],
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
            meds: medications.map((m: any) => m.name || String(m)).join(', ') || t('noMedicines'),
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
          status: 'Clinical Record', summary: record.aiSummary || record.notes || t('noClinicalSummary'),
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
        maritalStatus: profileData.maritalStatus, occupation: profileData.occupation,
        preferredLanguages: profileData.preferredLanguages,
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
    setReportUploadMessage(`🔍 ${t('uploadingReport', { file: file.name })}`);
    try {
      const result: any = await uploadMedicalReport(file);
      setReportUploadState('success');
      setReportUploadMessage(`✨ ${t('uploadSuccess', { file: file.name })}`);

      const newEhrItem = {
        id: result?.id || `EHR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: t('processedViaOcr'),
        summary: result?.extractedText ? `${t('ocrExtractedText')}: ${result.extractedText.slice(0, 80)}...` : t('aiExtractedSummary'),
        source: t('uploadedEhrReport'),
        extractedData: result?.extractedText || t('extractedParameters')
      };

      setEhrReportsList((prev) => [newEhrItem, ...prev]);
    } catch (error) {
      setReportUploadState('error');
      setReportUploadMessage(
        error instanceof Error ? error.message : 'Report upload failed.',
      );
    }
  };

  if (dashboardLoading) {
    return <LiquidLoader fullScreen text="Loading your dashboard" />;
  }

  return (
    <div className="sehat-dashboard-root">
      {/* 1. PERMANENT SIDEBAR PANEL (Matching Home Page Sidebar 100%) */}
      <aside className="sehat-dashboard-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316" />
                <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="sidebar-brand-title">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
              <span className="sidebar-portal-badge"> {t('patientPortal')} </span>
            </div>
          </div>
        </div>

        {/* Content Navigation */}
        <div className="sidebar-content">
          {/* Section 1: Main Menu */}
          <div className="sidebar-group">
            <span className="sidebar-group-title"> {t('mainNavigation')} </span>
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
                {tCommon('home')}
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
                {tNav('dashboard')}
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
                <span> {t('findDoctors')} </span>
              </button>
            </nav>
          </div>

          {/* Section 2: Patient Care Hub */}
          <div className="sidebar-group">
            <span className="sidebar-group-title"> {t('patientCareHub')} </span>
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
                <span> {t('myAppointments')} </span>
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
                <span> {t('healthRecords')} </span>
              </button>

              <button
                type="button"
                className={`sidebar-item ${currentPage === 'dashboard' && activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => handleTabClick('prescriptions')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
                <span> {t('prescriptions')} </span>
              </button>

              <button
                type="button"
                className="sidebar-item"
                onClick={() => navigate('/patient/mch')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                  <path d="M12 8v4m-2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
                <span> MCH Tracking </span>
              </button>
            </nav>
          </div>


          {/* Section 4: Settings & Support */}
          <div className="sidebar-group">
            <span className="sidebar-group-title"> {t('accountSupport')} </span>
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
                <span> {t('profileSettings')} </span>
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
              <span className="user-id"> {t('patientPortal')} </span>
            </div>
          </div>
          <button
            type="button"
            className="user-logout-btn"
            title={t('logout')}
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="bell-badge">2</span>
            </button>

            {/* User Profile Display */}
            <div className="top-user-pill">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={profileData.fullName || 'Patient'} className="user-pill-avatar" />
              ) : (
                <div className="user-pill-avatar" style={{ display: 'grid', placeItems: 'center', background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>{patientInitials}</div>
              )}
              <div className="user-pill-info">
                <span className="user-pill-name">{profileData.fullName || 'Patient'}</span>
                <span className="user-pill-role"> {t('patient')} </span>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container (Full Page Width) */}
        <main className="sehat-dash-content">
          {/* Hidden report file input: mounted at the top level (not inside a tab-specific
              conditional) so both the "Upload Reports" card (Overview tab) and the
              "Upload New EHR" button (Records tab) can reliably trigger it via reportInputRef. */}
          <input
            ref={reportInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleReportSelected}
            style={{ display: 'none' }}
          />
          {dashboardError && <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{dashboardError}</p>}
          {activeTab === 'overview' && (
            <>
              {/* Greeting Header */}
              <div className="dash-greeting-header">
                <h1 className="greeting-title">
                  {t('goodMorning')}, {patientFirstName} <img src="/namaskar.png" alt="Namaskar" style={{ width: "28px", height: "28px", marginLeft: "6px", display: "inline-block", verticalAlign: "text-bottom", transform: "translateY(-2px)" }} />
                </h1>
                <p className="greeting-subtitle"> {t('healthSummary')} </p>
              </div>

              {/* Quick Action Cards Grid */}
              <div className="quick-actions-2grid">
                {/* Card 1: Book Appointment */}
                <div className="action-card" onClick={() => navigate('/patient/book/new')}>
                  <div className="card-icon-badge blue-badge">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="12" y1="13" x2="12" y2="17" />
                      <line x1="10" y1="15" x2="14" y2="15" />
                    </svg>
                  </div>
                  <div className="action-card-text">
                    <h3 className="card-heading"> {t('bookAppointment')} </h3>
                    <p className="card-desc"> {t('findDoctors')} </p>
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
                  <div className="card-icon-badge purple-badge">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <polyline points="12 18 12 12 9 15" />
                      <polyline points="12 12 15 15" />
                    </svg>
                  </div>
                  <div className="action-card-text">
                    <h3 className="card-heading"> {t('uploadReports')} </h3>
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
                      {reportUploadMessage || t('uploadDesc')}
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
                          <div className="upcoming-card-header"><h2 className="section-title"> {t('upcomingAppointment')} </h2></div>
                          <p className="tab-subtitle"> {t('noUpcomingAppointments')} </p>
                        </div>
                      );
                    }
                    const bookedDocId = latestAppointment?.doctorId || 'd1';
                    const bookedDoctor = latestAppointment.doctor || doctorsData.find(d => d.id === bookedDocId);
                    const displayDocName = bookedDoctor?.name || bookedDoctor?.user?.fullName || 'Doctor';
                    const displayDocSub = [bookedDoctor?.specialty, bookedDoctor?.experience].filter(Boolean).join(' • ');
                    const displayDate = latestAppointment?.scheduledAt ? new Date(latestAppointment.scheduledAt).toLocaleDateString() : (latestAppointment?.date || t('datePending'));
                    const displayTime = latestAppointment?.timeSlot || t('timePending');
                    const displayMode = latestAppointment?.consultMode || 'VIDEO';
                    const displayPhoto = bookedDoctor?.imageUrl || '';
                    const apptId = latestAppointment.id;

                    return (
                      <div className="upcoming-appt-card">
                        <div className="upcoming-card-header">
                          <h2 className="section-title"> {t('upcomingAppointment')} </h2>
                          <button type="button" className="link-view-all" onClick={() => handleTabClick('appointments')}> {t('viewAllAppointments')} </button>
                        </div>

                        <div className="upcoming-card-content">
                          <img
                            src={displayPhoto}
                            alt={displayDocName}
                            className="doctor-avatar-large"
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
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" />
                              </svg>
                              <span>{translateMode(displayMode)}</span>
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
                                  {latestAppointment?.status === 'COMPLETED' ? t('completed') : timeStatus.isJoinable ? t('liveNow') : t('confirmed')}
                                </span>
                                <div className="action-buttons-group">
                                  <button
                                    type="button"
                                    className="btn-reschedule"
                                    onClick={() => navigate('/patient/book/new')}
                                  > {t('reschedule')} </button>
                                  {timeStatus.isJoinable ? (
                                    <button
                                      type="button"
                                      className="btn-join-consultation animate-pulse bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                      onClick={() => navigate(`/patient/consultation/${apptId}`)}
                                    >
                                      📹 {t('joinConsultation')}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-join-consultation opacity-60 cursor-not-allowed bg-slate-200 text-slate-600 border border-slate-300"
                                      title={timeStatus.sublabel}
                                      onClick={() => alert(t('youCanJoin'))}
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
                        > {t('recentPrescriptions')} </button>
                        <button
                          type="button"
                          className={`tab-sub-btn ${activeSubTab === 'consultations' ? 'active' : ''}`}
                          onClick={() => setActiveSubTab('consultations')}
                        > {t('recentConsultations')} </button>
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
                              <span>{translateMode(item.mode)}</span>
                            </div>

                            <div className="row-action">
                              <button
                                type="button"
                                className="btn-view-details"
                                onClick={() => setShowDetailsModal(item)}
                              > {t('viewDetails')} </button>
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
                              <span className="rx-tag"> {t('prescriptionIssued')} </span>
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
                              > {t('viewDownloadPdf')} </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Table Bottom Link */}
                    <div className="consultations-footer-link">
                      <button type="button" className="btn-all-consultations" onClick={() => handleTabClick('appointments')}> {t('viewAllConsultations')} </button>
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
                        title: rx.medicationName || t('prescribedMedication'),
                        sub: `${rx.dosage || t('takeAsDirected')} (${rx.frequency || t('daily')})`,
                        time: rx.timing || t('daily'),
                      }))
                      : [];

                    const defaultGenericReminders = [
                      {
                        icon: '💧',
                        title: t('drinkWater'),
                        sub: t('drinkWaterDesc'),
                        time: t('daily'),
                      },
                      {
                        icon: '🚶',
                        title: t('dailyWalk'),
                        sub: t('dailyWalkDesc'),
                        time: t('daily'),
                      },
                      {
                        icon: '😴',
                        title: t('restfulSleep'),
                        sub: t('sleepDesc'),
                        time: t('daily'),
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
                            <h3 className="widget-title"> {t('healthReminders')} </h3>
                            <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                              {isDocRecommended ? `🩺 ${t('doctorPrescribed')}` : `🌿 ${t('dailyWellness')}`}
                            </span>
                          </div>
                          <button type="button" className="widget-link" onClick={() => handleTabClick('records')}> {t('viewAll')} </button>
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
                          + {t('addReminder')}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Widget 3: Need Immediate Help? (Emergency) */}
                  <div className="emergency-widget-card">
                    <h3 className="emergency-heading"> {t('needImmediateHelp')} </h3>
                    <p className="emergency-sub"> {t('supportTeam')} </p>

                    <div className="emergency-widget-bottom">
                      <a
                        href="tel:102"
                        className="btn-emergency-call cursor-pointer"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          window.location.href = 'tel:102';
                        }}
                      >
                        📞 {t('emergencyCall')}
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
                  <h2 className="tab-title"> {t('myAppointments')} </h2>
                  <p className="tab-subtitle"> {t('manageConsultations')} </p>
                </div>
              </div>

              <div className="appointments-filter-bar">
                <button type="button" className={`filter-btn ${appointmentFilter === 'upcoming' ? 'active' : ''}`} onClick={() => setAppointmentFilter('upcoming')}> {t('upcoming')} </button>
                <button type="button" className={`filter-btn ${appointmentFilter === 'past' ? 'active' : ''}`} onClick={() => setAppointmentFilter('past')}> {t('past')} </button>
                <button type="button" className={`filter-btn ${appointmentFilter === 'cancelled' ? 'active' : ''}`} onClick={() => setAppointmentFilter('cancelled')}> {t('cancelled')} </button>
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
                          <span className="appt-id-code">{t('patientID')} {item.id}</span>
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
                        <span>🎥</span> {translateMode(item.mode)}
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
                              📹 {t('joinConsultation')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-join-video-sm opacity-60 cursor-not-allowed bg-slate-200 text-slate-600 border border-slate-300"
                              onClick={() => alert(t('youCanJoin'))}
                            >
                              🔒 {cardTimeStatus.label}
                            </button>
                          )}
                          {appointmentFilter === 'upcoming' && (
                            <button type="button" className="btn-card-secondary" onClick={() => navigate(`/patient/book/${item.doctorId || 'new'}?reschedule=${encodeURIComponent(item.id)}`)}> {t('reschedule')} </button>
                          )}
                          {appointmentFilter === 'past' && item.prescription && (
                            <button type="button" className="btn-card-secondary" onClick={() => {
                              const rx = prescriptionsList.find((entry) => entry.id === item.prescription?.id);
                              setSelectedRxData(rx?.fullData || item.prescription);
                              setShowRxModal(true);
                            }}> {t('viewPrescription')} </button>
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
                }).length === 0 && <div className="appointments-empty-state">{t('noAppointments', { filter: t(appointmentFilter) })}</div>}
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="records-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="tab-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="tab-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}> {t('ehrTitle')} </h2>
                  <p className="tab-subtitle" style={{ fontSize: '14px', color: '#64748b' }}>{t('connectedToDatabase')}.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={reportUploadState === 'uploading'}
                    onClick={() => {
                      if (reportUploadState !== 'uploading') {
                        reportInputRef.current?.click();
                      }
                    }}
                    style={{
                      backgroundColor: reportUploadState === 'uploading' ? '#93c5fd' : '#2563eb',
                      color: 'white',
                      fontWeight: 'bold',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: reportUploadState === 'uploading' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                    }}
                  >
                    📁 {reportUploadState === 'uploading' ? t('uploading') : t('uploadNewEhr')}
                  </button>
                  {reportUploadMessage && (
                    <p
                      role="status"
                      style={{
                        fontSize: '12px',
                        margin: 0,
                        color: reportUploadState === 'error' ? '#dc2626' : reportUploadState === 'success' ? '#15803d' : '#64748b'
                      }}
                    >
                      {reportUploadMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* EHR Overview Summary Banner */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>🏥 {t('verifiedEhrTimeline')}</h3>
                <p style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}> {t('ehrDesc')} </p>
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
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb' }}>{t('patientID')} {item.id}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEhrModalData(item)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        🔍 {t('viewOcrData')}
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
                      ✓ {t('verifiedPatient')}
                    </span>
                    <span className="profile-badge-pill profile-badge-gold">
                      ⭐ {t('goldMember')}
                    </span>
                  </div>
                  <p className="profile-hero-sub">{profileData.email} • {profileData.phone}</p>
                  <p className="profile-hero-meta">Patient ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#ffffff' }}>#PAT-2026-9812</span> • Reg Date: Aug 2026</p>
                </div>
              </div>

              {/* Settings Sub-Tabs Header Bar */}
              <div className="profile-subtabs-bar">
                {[
                  { id: 'personal', label: '👤 ' + t('personalDetails') },
                  { id: 'medical', label: '🩺 ' + t('medicalProfileVitals') },
                  { id: 'security', label: '🔒 ' + t('passwordSecurity') },
                  { id: 'notifications', label: '🔔 ' + t('notificationPrefs') },
                  { id: 'billing', label: '💳 ' + t('billingPayments') },
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
                  <span>✓ {t('profileSaved')}</span>
                  <button onClick={() => setProfileSaveSuccess(false)} style={{ background: 'none', border: 'none', color: '#047857', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              {/* Sub-Tab 1: Personal Details */}
              {profileSubTab === 'personal' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title"> {t('personalContact')} </h3>

                  <div className="profile-form-grid">
                    <div className="profile-field-group">
                      <label className="profile-label">{t('fullName')}</label>
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('emailAddress')} </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('phone')} </label>
                      <input
                        type="text"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('dateOfBirth')} </label>
                      <input
                        type="date"
                        value={profileData.dob}
                        onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('genderLabel')} </label>
                      <select
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                        className="profile-input-control"
                      >
                        <option value="Female"> {t('female')} </option>
                        <option value="Male"> {t('male')} </option>
                        <option value="Other"> {t('other')} </option>
                      </select>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('bloodGroupLabel')} </label>
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
                      <label className="profile-label"> {t('heightCmLabel')} </label>
                      <input
                        type="number"
                        value={profileData.height}
                        onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('weightKgLabel')} </label>
                      <input
                        type="number"
                        value={profileData.weight}
                        onChange={(e) => setProfileData({ ...profileData, weight: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Marital Status</label>
                      <select
                        value={profileData.maritalStatus}
                        onChange={(e) => setProfileData({ ...profileData, maritalStatus: e.target.value })}
                        className="profile-input-control"
                      >
                        <option value="">Select marital status</option>
                        {maritalStatusOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Occupation</label>
                      <input
                        type="text"
                        value={profileData.occupation}
                        onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
                        className="profile-input-control"
                        placeholder="Enter occupation"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label">Preferred Languages</label>
                      <select
                        value={profileData.preferredLanguages[0] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfileData({ ...profileData, preferredLanguages: val ? [val] : [] });
                        }}
                        className="profile-input-control"
                      >
                        <option value="">Select preferred language</option>
                        {languageOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>


                    {/* Residential Address & PIN Code */}
                    <div className="profile-field-group full-width" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="profile-label"> {t('residentialAddress')} </label>
                        <input
                          type="text"
                          placeholder="Street / House No / Area"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          className="profile-input-control"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="profile-label">Postal PIN Code / ZIP</label>
                        <input
                          type="text"
                          placeholder="Enter 6-digit PIN code"
                          value={profileData.pincode}
                          onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value })}
                          className="profile-input-control"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact Card */}
                  <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%)',
                    border: '1px solid #fecdd3',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ffe4e6', display: 'grid', placeItems: 'center', color: '#e11d48', fontSize: '18px', fontWeight: 'bold' }}>
                        🚨
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#9f1239' }}>Emergency Contact Information</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#be123c' }}>Primary contact person to notify in case of medical emergency</p>
                      </div>
                    </div>

                    {/* Primary Emergency Contact */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div className="profile-field-group">
                        <label className="profile-label" style={{ color: '#881337' }}>Emergency Contact Name</label>
                        <input
                          type="text"
                          placeholder="Contact person's full name"
                          value={profileData.emergencyContactName}
                          onChange={(e) => setProfileData({ ...profileData, emergencyContactName: e.target.value })}
                          className="profile-input-control"
                          style={{ borderColor: '#fda4af', backgroundColor: '#ffffff' }}
                        />
                      </div>

                      <div className="profile-field-group">
                        <label className="profile-label" style={{ color: '#881337' }}>Emergency Contact Phone</label>
                        <input
                          type="text"
                          placeholder="Emergency phone number (+91...)"
                          value={profileData.emergencyContactPhone}
                          onChange={(e) => setProfileData({ ...profileData, emergencyContactPhone: e.target.value })}
                          className="profile-input-control"
                          style={{ borderColor: '#fda4af', backgroundColor: '#ffffff' }}
                        />
                      </div>

                      <div className="profile-field-group">
                        <label className="profile-label" style={{ color: '#881337' }}>Relationship</label>
                        <select
                          value={profileData.emergencyContactRelationship}
                          onChange={(e) => setProfileData({ ...profileData, emergencyContactRelationship: e.target.value })}
                          className="profile-input-control"
                          style={{ borderColor: '#fda4af', backgroundColor: '#ffffff' }}
                        >
                          <option value="">Select relationship</option>
                          {relationshipOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Add Secondary Contact Button */}
                    {!showSecondaryContact && (
                      <button
                        type="button"
                        onClick={() => setShowSecondaryContact(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'none',
                          border: '1.5px dashed #fda4af',
                          borderRadius: '10px',
                          padding: '10px 16px',
                          color: '#be123c',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: 'fit-content',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2';
                          (e.currentTarget as HTMLButtonElement).style.borderStyle = 'solid';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'none';
                          (e.currentTarget as HTMLButtonElement).style.borderStyle = 'dashed';
                        }}
                      >
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
                        Add Secondary Emergency Contact
                      </button>
                    )}

                    {/* Secondary Emergency Contact */}
                    {showSecondaryContact && (
                      <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1px solid #fecdd3',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#9f1239' }}>🔖 Secondary Emergency Contact</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSecondaryContact(false);
                              setProfileData({ ...profileData, secondaryEmergencyName: '', secondaryEmergencyPhone: '', secondaryEmergencyRelationship: '' });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#be123c',
                              fontSize: '20px',
                              lineHeight: 1,
                              padding: '2px 6px',
                              borderRadius: '6px',
                            }}
                            title="Remove secondary contact"
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div className="profile-field-group">
                            <label className="profile-label" style={{ color: '#881337' }}>Secondary Contact Name</label>
                            <input
                              type="text"
                              placeholder="Secondary contact's full name"
                              value={profileData.secondaryEmergencyName}
                              onChange={(e) => setProfileData({ ...profileData, secondaryEmergencyName: e.target.value })}
                              className="profile-input-control"
                              style={{ borderColor: '#fda4af', backgroundColor: '#ffffff' }}
                            />
                          </div>
                          <div className="profile-field-group">
                            <label className="profile-label" style={{ color: '#881337' }}>Secondary Contact Phone</label>
                            <input
                              type="text"
                              placeholder="Secondary phone number (+91...)"
                              value={profileData.secondaryEmergencyPhone}
                              onChange={(e) => setProfileData({ ...profileData, secondaryEmergencyPhone: e.target.value })}
                              className="profile-input-control"
                              style={{ borderColor: '#fda4af', backgroundColor: '#ffffff' }}
                            />
                          </div>
                          <div className="profile-field-group">
                            <label className="profile-label" style={{ color: '#881337' }}>Relationship</label>
                            <select
                              value={profileData.secondaryEmergencyRelationship}
                              onChange={(e) => setProfileData({ ...profileData, secondaryEmergencyRelationship: e.target.value })}
                              className="profile-input-control"
                              style={{ borderColor: '#fda4af', backgroundColor: '#ffffff' }}
                            >
                              <option value="">Select relationship</option>
                              {relationshipOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="profile-save-btn"
                    >
                      💾 {tCommon('buttons.saveChanges')}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Medical Profile & Vitals */}
              {profileSubTab === 'medical' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title"> {t('medicalHistoryTitle')} </h3>



                  {/* ── Known Allergies ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '14px', background: '#fff5f5', border: '1px solid #fecdd3' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>⚠️</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#9f1239' }}>Known Allergies</h4>
                    </div>
                    {/* Preset chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {allergyPresets.map((item) => {
                        const selected = profileData.allergies.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              const updated = selected
                                ? profileData.allergies.filter(a => a !== item)
                                : [...profileData.allergies, item];
                              setProfileData({ ...profileData, allergies: updated });
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', border: '1.5px solid',
                              borderColor: selected ? '#b91c1c' : '#fda4af',
                              backgroundColor: selected ? '#b91c1c' : '#ffffff',
                              color: selected ? '#ffffff' : '#9f1239',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {selected ? '✓ ' : ''}{item}
                          </button>
                        );
                      })}
                      {/* Custom added items */}
                      {profileData.allergies.filter(a => !allergyPresets.includes(a)).map((item, idx) => (
                        <span key={idx} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: '#b91c1c', color: '#fff', border: '1.5px solid #b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item}
                          <button type="button" onClick={() => setProfileData({ ...profileData, allergies: profileData.allergies.filter(a => a !== item) })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                    {/* Custom input row */}
                    {showCustomAllergyInput ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type allergy and press Enter…"
                          value={customAllergyInput}
                          onChange={e => setCustomAllergyInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customAllergyInput.trim()) {
                              setProfileData({ ...profileData, allergies: [...profileData.allergies, customAllergyInput.trim()] });
                              setCustomAllergyInput('');
                              setShowCustomAllergyInput(false);
                            } else if (e.key === 'Escape') {
                              setCustomAllergyInput(''); setShowCustomAllergyInput(false);
                            }
                          }}
                          style={{ flex: 1, padding: '7px 12px', borderRadius: '10px', border: '1.5px solid #fda4af', fontSize: '13px', outline: 'none', background: '#fff' }}
                        />
                        <button type="button" onClick={() => { if (customAllergyInput.trim()) { setProfileData({ ...profileData, allergies: [...profileData.allergies, customAllergyInput.trim()] }); setCustomAllergyInput(''); } setShowCustomAllergyInput(false); }} style={{ padding: '7px 14px', borderRadius: '10px', background: '#b91c1c', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Add</button>
                        <button type="button" onClick={() => { setCustomAllergyInput(''); setShowCustomAllergyInput(false); }} style={{ padding: '7px 10px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowCustomAllergyInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px dashed #fda4af', borderRadius: '10px', padding: '7px 14px', color: '#be123c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>+ Add Custom Allergy</button>
                    )}
                  </div>

                  {/* ── Current Medical Conditions ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '14px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🩺</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0369a1' }}>Current Medical Conditions</h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {currentConditionPresets.map((item) => {
                        const selected = profileData.chronicConditions.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              const updated = selected
                                ? profileData.chronicConditions.filter(c => c !== item)
                                : [...profileData.chronicConditions, item];
                              setProfileData({ ...profileData, chronicConditions: updated });
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', border: '1.5px solid',
                              borderColor: selected ? '#0369a1' : '#7dd3fc',
                              backgroundColor: selected ? '#0369a1' : '#ffffff',
                              color: selected ? '#ffffff' : '#0369a1',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {selected ? '✓ ' : ''}{item}
                          </button>
                        );
                      })}
                      {profileData.chronicConditions.filter(c => !currentConditionPresets.includes(c)).map((item, idx) => (
                        <span key={idx} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: '#0369a1', color: '#fff', border: '1.5px solid #0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item}
                          <button type="button" onClick={() => setProfileData({ ...profileData, chronicConditions: profileData.chronicConditions.filter(c => c !== item) })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                    {showCustomCurrentCondInput ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type condition and press Enter…"
                          value={customCurrentCondInput}
                          onChange={e => setCustomCurrentCondInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customCurrentCondInput.trim()) {
                              setProfileData({ ...profileData, chronicConditions: [...profileData.chronicConditions, customCurrentCondInput.trim()] });
                              setCustomCurrentCondInput('');
                              setShowCustomCurrentCondInput(false);
                            } else if (e.key === 'Escape') {
                              setCustomCurrentCondInput(''); setShowCustomCurrentCondInput(false);
                            }
                          }}
                          style={{ flex: 1, padding: '7px 12px', borderRadius: '10px', border: '1.5px solid #7dd3fc', fontSize: '13px', outline: 'none', background: '#fff' }}
                        />
                        <button type="button" onClick={() => { if (customCurrentCondInput.trim()) { setProfileData({ ...profileData, chronicConditions: [...profileData.chronicConditions, customCurrentCondInput.trim()] }); setCustomCurrentCondInput(''); } setShowCustomCurrentCondInput(false); }} style={{ padding: '7px 14px', borderRadius: '10px', background: '#0369a1', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Add</button>
                        <button type="button" onClick={() => { setCustomCurrentCondInput(''); setShowCustomCurrentCondInput(false); }} style={{ padding: '7px 10px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowCustomCurrentCondInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px dashed #7dd3fc', borderRadius: '10px', padding: '7px 14px', color: '#0369a1', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>+ Add Custom Condition</button>
                    )}
                  </div>

                  {/* ── Severe Medical Conditions ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '14px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🚨</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#c2410c' }}>Severe Medical Conditions</h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {severeConditionPresets.map((item) => {
                        const selected = profileData.severeConditions.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              const updated = selected
                                ? profileData.severeConditions.filter(c => c !== item)
                                : [...profileData.severeConditions, item];
                              setProfileData({ ...profileData, severeConditions: updated });
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', border: '1.5px solid',
                              borderColor: selected ? '#c2410c' : '#fdba74',
                              backgroundColor: selected ? '#c2410c' : '#ffffff',
                              color: selected ? '#ffffff' : '#c2410c',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {selected ? '✓ ' : ''}{item}
                          </button>
                        );
                      })}
                      {profileData.severeConditions.filter(c => !severeConditionPresets.includes(c)).map((item, idx) => (
                        <span key={idx} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: '#c2410c', color: '#fff', border: '1.5px solid #c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item}
                          <button type="button" onClick={() => setProfileData({ ...profileData, severeConditions: profileData.severeConditions.filter(c => c !== item) })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                    {showCustomSevereCondInput ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type condition and press Enter…"
                          value={customSevereCondInput}
                          onChange={e => setCustomSevereCondInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customSevereCondInput.trim()) {
                              setProfileData({ ...profileData, severeConditions: [...profileData.severeConditions, customSevereCondInput.trim()] });
                              setCustomSevereCondInput('');
                              setShowCustomSevereCondInput(false);
                            } else if (e.key === 'Escape') {
                              setCustomSevereCondInput(''); setShowCustomSevereCondInput(false);
                            }
                          }}
                          style={{ flex: 1, padding: '7px 12px', borderRadius: '10px', border: '1.5px solid #fdba74', fontSize: '13px', outline: 'none', background: '#fff' }}
                        />
                        <button type="button" onClick={() => { if (customSevereCondInput.trim()) { setProfileData({ ...profileData, severeConditions: [...profileData.severeConditions, customSevereCondInput.trim()] }); setCustomSevereCondInput(''); } setShowCustomSevereCondInput(false); }} style={{ padding: '7px 14px', borderRadius: '10px', background: '#c2410c', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Add</button>
                        <button type="button" onClick={() => { setCustomSevereCondInput(''); setShowCustomSevereCondInput(false); }} style={{ padding: '7px 10px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowCustomSevereCondInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px dashed #fdba74', borderRadius: '10px', padding: '7px 14px', color: '#c2410c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>+ Add Custom Condition</button>
                    )}
                  </div>

                  {/* ── Family Medical History ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '14px', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🧬</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#6d28d9' }}>Family Medical History</h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {familyHistoryPresets.map((item) => {
                        const selected = profileData.familyHistory.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              const updated = selected
                                ? profileData.familyHistory.filter(f => f !== item)
                                : [...profileData.familyHistory, item];
                              setProfileData({ ...profileData, familyHistory: updated });
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', border: '1.5px solid',
                              borderColor: selected ? '#6d28d9' : '#c4b5fd',
                              backgroundColor: selected ? '#6d28d9' : '#ffffff',
                              color: selected ? '#ffffff' : '#6d28d9',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {selected ? '✓ ' : ''}{item}
                          </button>
                        );
                      })}
                      {profileData.familyHistory.filter(f => !familyHistoryPresets.includes(f)).map((item, idx) => (
                        <span key={idx} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: '#6d28d9', color: '#fff', border: '1.5px solid #6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item}
                          <button type="button" onClick={() => setProfileData({ ...profileData, familyHistory: profileData.familyHistory.filter(f => f !== item) })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                    {showCustomFamilyHistInput ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type family condition and press Enter…"
                          value={customFamilyHistInput}
                          onChange={e => setCustomFamilyHistInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customFamilyHistInput.trim()) {
                              setProfileData({ ...profileData, familyHistory: [...profileData.familyHistory, customFamilyHistInput.trim()] });
                              setCustomFamilyHistInput('');
                              setShowCustomFamilyHistInput(false);
                            } else if (e.key === 'Escape') {
                              setCustomFamilyHistInput(''); setShowCustomFamilyHistInput(false);
                            }
                          }}
                          style={{ flex: 1, padding: '7px 12px', borderRadius: '10px', border: '1.5px solid #c4b5fd', fontSize: '13px', outline: 'none', background: '#fff' }}
                        />
                        <button type="button" onClick={() => { if (customFamilyHistInput.trim()) { setProfileData({ ...profileData, familyHistory: [...profileData.familyHistory, customFamilyHistInput.trim()] }); setCustomFamilyHistInput(''); } setShowCustomFamilyHistInput(false); }} style={{ padding: '7px 14px', borderRadius: '10px', background: '#6d28d9', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Add</button>
                        <button type="button" onClick={() => { setCustomFamilyHistInput(''); setShowCustomFamilyHistInput(false); }} style={{ padding: '7px 10px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowCustomFamilyHistInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px dashed #c4b5fd', borderRadius: '10px', padding: '7px 14px', color: '#6d28d9', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>+ Add Family History</button>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Account & Security */}
              {profileSubTab === 'security' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title"> {t('passwordSecurity')} </h3>

                  <div style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="profile-field-group">
                      <label className="profile-label"> {t('currentPassword')} </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={securitySettings.currentPassword}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-label"> {t('newPassword')} </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={securitySettings.newPassword}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                        className="profile-input-control"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-label"> {t('confirmNewPassword')} </label>
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
                      onClick={() => alert(t('passwordUpdated'))}
                      className="profile-save-btn"
                      style={{ alignSelf: 'flex-start' }}
                    > {t('updatePassword')} </button>
                  </div>
                  <AccountDeletionDangerZone role="PATIENT" />
                </div>
              )}

              {/* Sub-Tab 4: Notifications */}
              {profileSubTab === 'notifications' && (
                <div className="profile-card-box">
                  <h3 className="profile-card-title"> {t('notifications')} </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { key: 'whatsappReminders', title: t('notifWhatsappTitle'), desc: t('notifWhatsappDesc') },
                      { key: 'emailPrescriptions', title: t('notifEmailTitle'), desc: t('notifEmailDesc') },
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
                  <p style={{ fontSize: '14px', color: '#64748b', padding: '20px 0' }}>Payment methods are not stored on this platform.</p></div>
              )}

            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="prescriptions-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="tab-section-header">
                <div>
                  <h2 className="tab-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}> {t('prescriptions')} </h2>
                  <p className="tab-subtitle" style={{ fontSize: '14px', color: '#64748b' }}> {t('viewPrescriptionsDesc')} </p>
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
                        <span className="rx-tag"> {t('prescriptionIssued')} </span>
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
                        > {t('viewDownloadPdf')} </button>
                      </div>
                    </div>
                  ))}
                  {prescriptionsList.length === 0 && <div className="appointments-empty-state"> {t('noPrescriptions')} </div>}
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
              <h2>{t('consultationDetails')} ({showDetailsModal.id})</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowDetailsModal(null)}>✕</button>
            </div>

            <div className="modal-body-content">
              <div className="doc-modal-summary">
                <img src={showDetailsModal.avatar} alt={showDetailsModal.doctorName} className="modal-doc-img" />
                <div>
                  <h3>{showDetailsModal.doctorName}</h3>
                  <p>{showDetailsModal.specialty}</p>
                  <span className="status-pill completed"> {t('completed')} </span>
                </div>
              </div>

              <div className="modal-info-list">
                <div className="info-item">
                  <span className="info-lbl"> {t('date')} </span>
                  <span className="info-val">{showDetailsModal.date}</span>
                </div>
                <div className="info-item">
                  <span className="info-lbl"> {t('time')} </span>
                  <span className="info-val">{showDetailsModal.time}</span>
                </div>
                <div className="info-item">
                  <span className="info-lbl"> {t('consultationMode')} </span>
                  <span className="info-val">{showDetailsModal.mode}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary-outline" onClick={() => setShowDetailsModal(null)}> {t('close')} </button>
              <button type="button" className="btn-join-consultation" onClick={() => alert(t('downloadingSummary'))}> {t('downloadSummary')} </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowEmergencyModal(false)}>
          <div className="modal-content-card emergency-style" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="text-red">🚨 {t('emergencyAssistance')}</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowEmergencyModal(false)}>✕</button>
            </div>

            <div className="modal-body-content">
              <p className="emergency-intro">{t('emergencyIntro')}</p>

              <div className="emergency-numbers-list">
                <a href="tel:108" className="emergency-num-btn red-bg">
                  📞 {t('callAmbulance')}
                </a>
                <a href="tel:1800112233" className="emergency-num-btn blue-bg">
                  🏥 {t('icuHelpline')}
                </a>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-secondary-outline" onClick={() => setShowEmergencyModal(false)}> {t('close')} </button>
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
                <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">✓ {t('verifiedOcrResult')}</span>
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block"> {t('aiExtractedData')} </span>
              <p className="text-xs font-mono text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                {selectedEhrModalData.extractedData}
              </p>
            </div>

            <div className="text-xs text-gray-500">
              <p>• {t('reportId')}: <span className="font-mono font-bold">{selectedEhrModalData.id}</span></p>
              <p>• {t('source')}: <span className="font-semibold">{selectedEhrModalData.source}</span></p>
              <p>• {t('uploadedDate')}: <span className="font-semibold">{selectedEhrModalData.date}</span></p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setSelectedEhrModalData(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
              > {t('closeEhr')} </button>
            </div>
          </div>
        </div>
      )}


      {/* Document Viewer Modal */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '900px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>📄</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                    {previewDoc.fileName}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Health Document Preview
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={previewDoc.url}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ⬇ Open / Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#525659', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <iframe
                src={previewDoc.url}
                title={previewDoc.fileName}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
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





