import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUser, clearAuth } from '../../auth/authStorage';
import {
  User,
  Stethoscope,
  Award,
  Building2,
  MapPin,
  DollarSign,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Clock,
  Globe,
  Camera,
  Check,
  Briefcase,
  Plus,
  Trash2,
  Copy,
  X,
  Settings,
  Edit3
} from 'lucide-react';
import { getDoctorProfileData, setActiveDoctorId } from '../utils/doctorProfile';
import { getToken } from '../../auth/authStorage';
import { DoctorProfileData } from '../types/profile.types';
import BrandLogo from '../../common/components/BrandLogo';

// Resolve the backend base URL the same way auth/api.ts does:
// - In production (Vercel), VITE_API_BASE_URL is set to the Render backend URL.
// - In local dev, it is empty so the Vite dev-server proxy handles /api/* requests.
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl !== 'http://localhost:8000') {
    return envUrl.replace(/\/+$/, '');
  }
  return '';
};
const API_BASE = getApiBase();

const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Gynecologist',
  'Neurologist',
  'Orthopedic Doctor',
  'Psychiatrist',
  'Oncologist',
  'ENT Specialist',
  'Ophthalmologist',
  'Endocrinologist',
  'Urologist',
  'Gastroenterologist'
];

const AVAILABLE_LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali',
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi'
];

// No default avatar — show initials placeholder when no photo is uploaded
const DEFAULT_DOCTOR_AVATAR = '';

interface TimeSlot {
  start: string;
  end: string;
}

type WeeklySchedule = Record<string, TimeSlot[]>;

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};

const TIME_OPTIONS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'
];

function convertTo24Hour(timeStr: string): string {
  if (!timeStr) return '09:00';
  const parts = timeStr.split(' ');
  if (parts.length < 2) return timeStr;
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);
  if (modifier === 'PM' && h < 12) h += 12;
  if (modifier === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minutes}`;
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  Monday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Tuesday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Wednesday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Thursday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Friday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Saturday: [{ start: '09:00 AM', end: '01:00 PM' }],
  Sunday: []
};

interface InteractiveScheduleSelectorProps {
  slotDurationMinutes: number;
  onSlotDurationChange: (duration: number) => void;
  onScheduleChange: (summary: string, jsonStr: string, scheduleObj: WeeklySchedule) => void;
}

const InteractiveScheduleSelector: React.FC<InteractiveScheduleSelectorProps> = ({
  slotDurationMinutes,
  onSlotDurationChange,
  onScheduleChange
}) => {
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');

  // Sync to parent whenever schedule changes
  useEffect(() => {
    // 1. Build human readable summary string
    const activeDays = ALL_DAYS.filter(d => (schedule[d] || []).length > 0);
    let summaryStr = '';
    if (activeDays.length === 0) {
      summaryStr = 'No availability configured (All Days Off)';
    } else {
      summaryStr = activeDays.map(day => {
        const slots = schedule[day];
        const slotText = slots.map(s => `${s.start} - ${s.end}`).join(', ');
        return `${DAY_SHORT[day]}: ${slotText}`;
      }).join(' | ');
    }

    setCurrentSummary(summaryStr);

    // 2. Build 24-hour serialized JSON object for backend compatibility
    const serialized: Record<string, { start: string; end: string }[]> = {};
    ALL_DAYS.forEach(day => {
      serialized[day] = (schedule[day] || []).map(s => ({
        start: convertTo24Hour(s.start),
        end: convertTo24Hour(s.end)
      }));
    });

    onScheduleChange(summaryStr, JSON.stringify(serialized, null, 2), schedule);
  }, [schedule]);

  const toggleDay = (day: string) => {
    setSchedule(prev => {
      const currentSlots = prev[day] || [];
      if (currentSlots.length > 0) {
        return { ...prev, [day]: [] }; // Day Off
      } else {
        return { ...prev, [day]: [{ start: '09:00 AM', end: '05:00 PM' }] };
      }
    });
  };

  const addSlot = (day: string) => {
    setSchedule(prev => {
      const currentSlots = prev[day] || [];
      const newSlot: TimeSlot = currentSlots.length > 0
        ? { start: '02:00 PM', end: '06:00 PM' }
        : { start: '09:00 AM', end: '05:00 PM' };
      return { ...prev, [day]: [...currentSlots, newSlot] };
    });
  };

  const removeSlot = (day: string, slotIndex: number) => {
    setSchedule(prev => {
      const currentSlots = prev[day] || [];
      const updated = currentSlots.filter((_, idx) => idx !== slotIndex);
      return { ...prev, [day]: updated };
    });
  };

  const updateSlotTime = (day: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => {
      const currentSlots = [...(prev[day] || [])];
      if (currentSlots[slotIndex]) {
        currentSlots[slotIndex] = { ...currentSlots[slotIndex], [field]: value };
      }
      return { ...prev, [day]: currentSlots };
    });
  };

  const applyPreset = (preset: 'weekdays' | 'mon-sat' | 'all') => {
    setSchedule(prev => {
      const updated: WeeklySchedule = { ...prev };
      ALL_DAYS.forEach(day => {
        if (preset === 'weekdays') {
          if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day)) {
            updated[day] = [{ start: '09:00 AM', end: '05:00 PM' }];
          } else {
            updated[day] = [];
          }
        } else if (preset === 'mon-sat') {
          if (day !== 'Sunday') {
            updated[day] = [{ start: '09:00 AM', end: '05:00 PM' }];
          } else {
            updated[day] = [];
          }
        } else if (preset === 'all') {
          updated[day] = [{ start: '09:00 AM', end: '05:00 PM' }];
        }
      });
      return updated;
    });
  };

  const copyMondayToAllActive = () => {
    const mondaySlots = schedule['Monday'] || [{ start: '09:00 AM', end: '05:00 PM' }];
    setSchedule(prev => {
      const updated: WeeklySchedule = { ...prev };
      ALL_DAYS.forEach(day => {
        if ((prev[day] || []).length > 0) {
          updated[day] = mondaySlots.map(s => ({ ...s }));
        }
      });
      return updated;
    });
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div>
      {/* 1. Compact Preview Card on Onboarding Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#F98513] shrink-0" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Working Schedule & Availability</h3>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {slotDurationMinutes} Mins / Slot
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-semibold mt-1">
            Click configure to set your weekly practicing days, split shift hours, and slot duration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold text-white bg-[#F98513] hover:bg-[#e0730b] px-5 py-3 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Settings className="w-4.5 h-4.5" /> Configure Schedule & Shifts
        </button>
      </div>

      {/* 2. Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-6 relative animate-scale-up">

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#F98513]" /> Configure Weekly Schedule & Shifts
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold mt-1">
                  Select active practicing days, add split shifts, and set consultation slot duration.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slot Duration Selector */}
            <div className="flex items-center justify-between bg-orange-50/70 border border-orange-200/80 p-3.5 rounded-2xl">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Consultation Slot Duration:</span>
              <select
                value={slotDurationMinutes}
                onChange={(e) => onSlotDurationChange(Number(e.target.value))}
                className="text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#F98513] outline-none cursor-pointer"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            {/* 1. Day Selector Chips */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Practicing Days</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-600 font-semibold hidden sm:inline">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('weekdays')}
                    className="text-xs font-bold text-[#F98513] bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    Mon - Fri
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('mon-sat')}
                    className="text-xs font-bold text-[#F98513] bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    Mon - Sat
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className="text-xs font-bold text-[#F98513] bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    All Days
                  </button>
                </div>
              </div>

              {/* 7 Day Chips Row */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {ALL_DAYS.map(day => {
                  const isAvailable = (schedule[day] || []).length > 0;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`py-3 px-1 rounded-xl text-xs sm:text-sm font-extrabold text-center transition-all cursor-pointer border ${
                        isAvailable
                          ? 'bg-[#223362] text-white border-[#223362] shadow-md transform scale-[1.02]'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{DAY_SHORT[day]}</span>
                    </button>
                  );
                })}
              </div>
            </div>



            {/* 3. Day-by-Day Shift Editor List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {ALL_DAYS.map(day => {
                const slots = schedule[day] || [];
                const isAvailable = slots.length > 0;

                return (
                  <div
                    key={day}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isAvailable ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center justify-between sm:justify-start gap-3 shrink-0">
                        <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-900 text-sm sm:text-base">
                          <input
                            type="checkbox"
                            checked={isAvailable}
                            onChange={() => toggleDay(day)}
                            className="w-4.5 h-4.5 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span className="w-24">{day}</span>
                        </label>

                        {!isAvailable && (
                          <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-md">
                            Day Off
                          </span>
                        )}
                      </div>

                      {isAvailable && (
                        <div className="flex-1 flex flex-col gap-2.5 sm:items-end">
                          {slots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2 flex-wrap bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-none border-slate-200">
                              <span className="text-xs font-bold text-slate-700">From:</span>
                              <select
                                value={slot.start}
                                onChange={(e) => updateSlotTime(day, idx, 'start', e.target.value)}
                                className="text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#F98513] outline-none cursor-pointer"
                              >
                                {TIME_OPTIONS.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>

                              <span className="text-xs font-bold text-slate-700">To:</span>
                              <select
                                value={slot.end}
                                onChange={(e) => updateSlotTime(day, idx, 'end', e.target.value)}
                                className="text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#F98513] outline-none cursor-pointer"
                              >
                                {TIME_OPTIONS.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>

                              {slots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSlot(day, idx)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove shift"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addSlot(day)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#F98513] hover:text-[#e0730b] hover:underline cursor-pointer mt-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Time Slot (Split Shift)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-extrabold text-white bg-[#F98513] hover:bg-[#e0730b] px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save & Apply Schedule
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const DoctorOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    photoUrl: '',
    email: '',
    phoneNumber: '',
    gender: 'Female',

    specialization: 'General Physician',
    qualification: '',
    yearsOfExperience: '',
    medicalLicenseNumber: '',

    clinicName: '',
    address: '',
    consultationFee: '',
    aboutMe: '',
    languagesSpoken: [] as string[],

    // Verification Docs & Schedule Defaults
    slotDurationMinutes: 30,
    availableDays: 'Monday - Saturday (09:00 AM - 05:00 PM)'
  });

  useEffect(() => {
    const user = getUser();
    if (user) {
      // Pre-fill from auth user data immediately
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || '',
        email: prev.email || user.email || '',
      }));

      // Also try to fetch existing profile from backend (in case of re-login)
      const token = getToken();
      fetch(`${API_BASE}/api/doctor/${user.id}/profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setFormData(prev => ({
              ...prev,
              fullName: prev.fullName || data.name || data.user?.fullName || user.fullName || '',
              email: prev.email || data.user?.email || user.email || '',
              specialization: prev.specialization || data.specialty || 'General Physician',
              qualification: prev.qualification || data.degrees || '',
              yearsOfExperience: prev.yearsOfExperience || (data.experience ? data.experience.replace(/[^0-9]/g, '') : '') || '',
              clinicName: prev.clinicName || data.hospital || '',
              address: prev.address || data.location || '',
              consultationFee: prev.consultationFee || (data.consultationFee ? String(data.consultationFee) : '') || '',
              photoUrl: prev.photoUrl || data.imageUrl || '',
            }));
          }
        })
        .catch(() => {/* silently ignore */ });
    }
  }, []);

  const handleTextChange = (field: string, value: any) => {
    let cleanVal = value;
    if (field === 'phoneNumber') {
      cleanVal = value.replace(/[^0-9]/g, '').substring(0, 10);
    } else if (field === 'yearsOfExperience' || field === 'consultationFee') {
      cleanVal = value.replace(/[^0-9]/g, '');
    } else if (field === 'fullName') {
      cleanVal = value.replace(/[^a-zA-Z\s.-]/g, '');
    }
    setFormData(prev => ({ ...prev, [field]: cleanVal }));
    // Clear errors when user starts filling
    if (stepErrors.length > 0) setStepErrors([]);
  };

  // Returns array of error messages for the given step
  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    if (step === 1) {
      if (!formData.fullName.trim()) {
        errors.push('Full name is required.');
      } else if (!/^[a-zA-Z\s.]+$/.test(formData.fullName.trim())) {
        errors.push('Full Name should only contain letters, spaces, and dots.');
      }
      if (!formData.email.trim()) {
        errors.push('Email address is required.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.push('Please enter a valid email address.');
      }
      if (!formData.phoneNumber.trim()) {
        errors.push('Phone number is required.');
      } else if (formData.phoneNumber.trim().length !== 10) {
        errors.push('Phone number must be exactly 10 digits.');
      }
      if (formData.languagesSpoken.length === 0) errors.push('Select at least one language spoken.');
    } else if (step === 2) {
      if (!formData.specialization.trim()) errors.push('Specialization is required.');
      if (!formData.qualification.trim()) errors.push('Qualification / degrees are required.');

      const expNum = parseInt(formData.yearsOfExperience, 10);
      if (isNaN(expNum) || expNum < 0 || expNum > 60) {
        errors.push('Please enter a valid years of experience between 0 and 60.');
      }

      if (!formData.medicalLicenseNumber.trim()) errors.push('Medical registration / license number is required.');
      if (!formData.aboutMe.trim()) errors.push('Doctor bio / profile summary is required.');
    } else if (step === 3) {
      if (!formData.clinicName.trim()) errors.push('Hospital / clinic name is required.');
      if (!formData.address.trim()) errors.push('Clinic address is required.');

      const feeNum = parseInt(formData.consultationFee, 10);
      if (isNaN(feeNum) || feeNum <= 0) {
        errors.push('Consultation fee must be a valid number greater than 0.');
      }
    } else if (step === 4) {
      if (!documentFiles['medical-license']) errors.push('Medical Registration License document is required.');
      if (!documentFiles['degree-certificate']) errors.push('Medical Degree Certificate document is required.');
      if (!documentFiles['id-proof']) errors.push('Government Photo ID document is required.');
    }
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setCurrentStep(prev => prev + 1);
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => {
      const exists = prev.languagesSpoken.includes(lang);
      if (exists) {
        return { ...prev, languagesSpoken: prev.languagesSpoken.filter(l => l !== lang) };
      } else {
        return { ...prev, languagesSpoken: [...prev.languagesSpoken, lang] };
      }
    });
  };

  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({
    'medical-license': null,
    'degree-certificate': null,
    'id-proof': null,
  });
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [uploadedDocsInfo, setUploadedDocsInfo] = useState<any[]>([]);

  const uploadDocToSupabase = async (docType: string, fileObj?: File) => {
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      const activeDocId = getUser()?.id;
      if (!activeDocId || !fileObj) throw new Error('Sign in and choose a document file');
      const formDataUpload = new FormData();
      formDataUpload.append('documentType', docType);
      if (fileObj) {
        formDataUpload.append('file', fileObj);
      }

      const res = await fetch(`${API_BASE}/api/doctor/${activeDocId}/documents/upload`, {
        method: 'POST',
        body: formDataUpload,
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok) {
        const docResult = await res.json();
        setUploadedDocsInfo(prev => {
          const filtered = prev.filter(d => d.name !== docType && d.name !== docResult.name);
          return [...filtered, docResult];
        });
      }
    } catch (err) {
      console.warn('Document upload error:', err);
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      handleTextChange('photoUrl', previewUrl);

      setIsUploadingPhoto(true);
      try {
        const activeDocId = getUser()?.id;
        if (!activeDocId) throw new Error('Sign in before uploading a profile photo');
        const formDataUpload = new FormData();
        formDataUpload.append('documentType', 'profile-photo');
        formDataUpload.append('file', file);

        const res = await fetch(`${API_BASE}/api/doctor/${activeDocId}/documents/upload`, {
          method: 'POST',
          body: formDataUpload,
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (res.ok) {
          const uploadResult = await res.json();
          if (uploadResult.publicUrl) {
            handleTextChange('photoUrl', uploadResult.publicUrl);
          }
        }
      } catch (err) {
        console.warn('Profile photo upload error:', err);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleFileInputChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setDocumentFiles(prev => ({ ...prev, [docType]: selectedFile }));
      await uploadDocToSupabase(docType, selectedFile);
    }
  };

  const handleCompleteSetup = async () => {
    // Validate step 4 before submitting
    const errors = validateStep(4);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setIsSaving(true);

    const user = getUser();
    const activeDocId = user?.id || 'd-active';
    const token = getToken();

    // Ensure all 3 required verification documents are uploaded
    const requiredDocTypes = ['medical-license', 'degree-certificate', 'id-proof'];
    let finalUploadedDocs = [...uploadedDocsInfo];

    for (const docType of requiredDocTypes) {
      const fileObj = documentFiles[docType];
      const alreadyUploaded = finalUploadedDocs.some(d => d.documentType === docType || d.name?.includes(docType));

      if (fileObj && !alreadyUploaded) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('documentType', docType);
          formDataUpload.append('file', fileObj);

          const res = await fetch(`${API_BASE}/api/doctor/${activeDocId}/documents/upload`, {
            method: 'POST',
            body: formDataUpload,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (res.ok) {
            const docResult = await res.json();
            finalUploadedDocs.push({ ...docResult, documentType: docType });
          }
        } catch (err) {
          console.warn(`Error auto-uploading document [${docType}]:`, err);
        }
      }
    }

    setUploadedDocsInfo(finalUploadedDocs);

    // Create updated profile payload
    const updatedProfile: DoctorProfileData = {
      id: activeDocId,
      fullName: formData.fullName.startsWith('Dr.') ? formData.fullName : `Dr. ${formData.fullName}`,
      photoUrl: formData.photoUrl || '',
      specialization: formData.specialization,
      qualification: formData.qualification,
      yearsOfExperience: Number(formData.yearsOfExperience),
      medicalLicenseNumber: formData.medicalLicenseNumber,
      isVerified: false,
      languagesSpoken: formData.languagesSpoken,
      aboutMe: formData.aboutMe,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      clinicName: formData.clinicName,
      address: formData.address,
      stats: {
        totalConsultations: 0,
        patientsTreated: 0,
        todaysAppointments: 0,
        completedConsultations: 0
      },
      availability: {
        slots: [
          { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Saturday', isWorking: true, workingHours: '10:00 AM - 02:00 PM', breakTime: 'None' },
          { day: 'Sunday', isWorking: false, workingHours: 'Off', breakTime: 'None' }
        ],
        slotDurationMinutes: formData.slotDurationMinutes,
        status: 'Available'
      },
      documents: finalUploadedDocs
    };

    // Save doctor onboarding data to PostgreSQL Database via NestJS API
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/doctor/${activeDocId}/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updatedProfile)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Unable to save doctor profile');
      }
    } catch (apiErr) {
      setStepErrors([apiErr instanceof Error ? apiErr.message : 'Unable to save doctor profile']);
      setIsSaving(false);
      return;
    }

    // Save onboarding details in local storage keyed by user ID for personalized access
    localStorage.setItem('sehat_doctor_onboarding_data', JSON.stringify(updatedProfile));
    localStorage.setItem(`sehat_doctor_profile_${activeDocId}`, JSON.stringify(updatedProfile));
    localStorage.setItem(`sehat_doctor_verification_${activeDocId}`, 'PENDING_VERIFICATION');
    localStorage.setItem(`sehat_doctor_pending_email_${activeDocId}`, formData.email);
    localStorage.setItem('sehat_active_doctor_id', activeDocId);
    window.dispatchEvent(new Event('sehat_doctor_changed'));

    setIsSubmitted(true);
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-deadly-depths flex flex-col">
      {/* Top Bar Header */}
      <header className="bg-deep-space text-white border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <BrandLogo
            showWordmark={false}
            markWrapperClassName="w-9 h-9 rounded-lg bg-transparent flex items-center justify-center p-1.5"
            markClassName="w-full h-full object-contain"
            alt=""
          />
          <div>
            <BrandLogo
              showMark={false}
              wordmarkClassName="font-bold text-lg leading-tight tracking-tight text-white"
              accentClassName="text-orange-400"
            />
            <p className="text-xs text-white/60">Doctor Partner Onboarding & Profile Setup</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> All fields are mandatory
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

        {/* Form & Stepper Container */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Stepper Progress */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Step {currentStep} of 4: {
                  currentStep === 1 ? 'Personal Information' :
                    currentStep === 2 ? 'Professional Credentials' :
                      currentStep === 3 ? 'Clinic & Fees' : 'Verification Documents'
                }
              </span>
              <span className="text-xs text-slate-900 font-bold">{currentStep * 25}% Completed</span>
            </div>

            {/* Step Bar - can only go back to completed steps */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(step => (
                <div
                  key={step}
                  onClick={() => {
                    if (step < currentStep) {
                      setStepErrors([]);
                      setCurrentStep(step);
                    }
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${step < currentStep
                    ? 'bg-slate-900 cursor-pointer hover:bg-slate-800 shadow-xs'
                    : step === currentStep
                      ? 'bg-slate-900 cursor-default shadow-xs'
                      : 'bg-slate-200 cursor-not-allowed'
                    }`}
                  title={step < currentStep ? `Go back to Step ${step}` : step === currentStep ? `Current step` : `Complete current step first`}
                />
              ))}
            </div>

            {/* Stepper Titles */}
            <div className="hidden sm:grid grid-cols-4 text-[11px] font-semibold text-slate-600 mt-3 text-center">
              <span className={currentStep >= 1 ? 'text-slate-900 font-black' : ''}>1. Basic Info</span>
              <span className={currentStep >= 2 ? 'text-slate-900 font-black' : ''}>2. Credentials</span>
              <span className={currentStep >= 3 ? 'text-slate-900 font-black' : ''}>3. Clinic & Fee</span>
              <span className={currentStep >= 4 ? 'text-slate-900 font-black' : ''}>4. Verify & Submit</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[#9BACD8] p-6 sm:p-8 rounded-2xl border border-slate-300/40 shadow-md flex-1 flex flex-col justify-between min-h-[500px]">

            {/* STEP 1: Basic Information */}
            {currentStep === 1 && (
              <div className="flex-1 flex flex-col justify-between space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-6 h-6 text-slate-900" /> Personal & Contact Details
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-1">Provide your basic identity details to display on your verified doctor profile.</p>
                </div>

                {/* Profile Photo Banner Box */}
                <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer shrink-0">
                      <input
                        type="file"
                        id="profile-photo-upload"
                        accept="image/*"
                        onChange={handlePhotoFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="profile-photo-upload" className="cursor-pointer block relative">
                        {formData.photoUrl ? (
                          <>
                            <img
                              src={formData.photoUrl}
                              alt="Doctor Profile Preview"
                              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border-4 border-[#F98513]/20 shadow-md bg-white group-hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#F98513] hover:bg-[#e0730b] text-white flex items-center justify-center border-2 border-white shadow-lg transition-transform group-hover:scale-110">
                              {isUploadingPhoto ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                              ) : (
                                <span className="text-base font-extrabold leading-none">+</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-dashed border-[#F98513]/60 shadow-xs bg-slate-50 flex items-center justify-center group-hover:border-[#F98513] transition-all">
                            {isUploadingPhoto ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#F98513] border-t-transparent" />
                            ) : (
                              <span className="text-3xl font-extrabold text-[#F98513] leading-none">+</span>
                            )}
                          </div>
                        )}
                      </label>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">Doctor Profile Photo</h3>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">Upload a clear photo to help patients identify you during consultations.</p>
                    </div>
                  </div>
                  <label htmlFor="profile-photo-upload" className="cursor-pointer shrink-0 text-xs font-bold text-[#F98513] bg-white border border-[#F98513]/40 hover:bg-[#F98513] hover:text-white px-4 py-2 rounded-xl transition-all shadow-xs">
                    {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </label>
                </div>

                {/* Full Name & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Full Name (with Dr. Title) *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => handleTextChange('fullName', e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleTextChange('gender', e.target.value)}
                      className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Professional Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleTextChange('email', e.target.value)}
                        placeholder="doctor@example.com"
                        className="w-full text-sm p-3.5 pl-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Mobile Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      <input
                        type="text"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => handleTextChange('phoneNumber', e.target.value)}
                        placeholder="10-digit number"
                        className="w-full text-sm p-3.5 pl-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Languages Spoken */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-900">Languages Spoken with Patients</label>
                    <span className="text-xs text-slate-900 font-semibold">Select all that apply</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    {AVAILABLE_LANGUAGES.map(lang => {
                      const isSelected = formData.languagesSpoken.includes(lang);
                      return (
                        <button
                          type="button"
                          key={lang}
                          onClick={() => toggleLanguage(lang)}
                          className={`text-xs px-3.5 py-2 rounded-xl border transition-all cursor-pointer font-medium ${isSelected
                            ? 'bg-[#F98513] text-white border-[#F98513] shadow-xs font-bold'
                            : 'bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-200'
                            }`}
                        >
                          {isSelected ? `✓ ${lang}` : `+ ${lang}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Professional Credentials */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-slate-900" /> Professional Credentials & License
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-1">Specify your medical qualifications, primary domain, and license details.</p>
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Primary Specialization *</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => handleTextChange('specialization', e.target.value)}
                    className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Qualifications & Degrees */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Qualifications / Degrees *</label>
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => handleTextChange('qualification', e.target.value)}
                    placeholder="e.g. MBBS, MD (Cardiology), DM"
                    className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                  />
                  <p className="text-xs text-slate-900 font-semibold mt-1">Commas separated degrees (e.g., MBBS, MD, DNB)</p>
                </div>

                {/* Experience & License Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Years of Clinical Experience *</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      <input
                        type="text"
                        required
                        value={formData.yearsOfExperience}
                        onChange={(e) => handleTextChange('yearsOfExperience', e.target.value)}
                        className="w-full text-sm p-3.5 pl-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Medical Registration / License No. *</label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      <input
                        type="text"
                        required
                        value={formData.medicalLicenseNumber}
                        onChange={(e) => handleTextChange('medicalLicenseNumber', e.target.value)}
                        placeholder="e.g. MCI/2024/98712"
                        className="w-full text-sm p-3.5 pl-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none uppercase tracking-wide font-mono bg-white font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* About Me Bio */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Doctor Bio / Profile Summary</label>
                  <textarea
                    rows={4}
                    value={formData.aboutMe}
                    onChange={(e) => handleTextChange('aboutMe', e.target.value)}
                    placeholder="Describe your medical background, expertise, key clinical achievements..."
                    className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none resize-none bg-white font-medium text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Clinic & Fees */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-slate-900" /> Hospital/Clinic & Consultation Fee
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-1">Specify your practice location and consultation pricing.</p>
                </div>

                {/* Clinic / Hospital Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Primary Hospital / Clinic Name *</label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 text-slate-400 absolute left-4 top-4.5" />
                    <input
                      type="text"
                      required
                      value={formData.clinicName}
                      onChange={(e) => handleTextChange('clinicName', e.target.value)}
                      placeholder="e.g. Apollo Medical Center / Heart Care Clinic"
                      className="w-full text-base p-4 pl-12 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Clinic / Practice Address *</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 text-slate-400 absolute left-4 top-4.5" />
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => handleTextChange('address', e.target.value)}
                      placeholder="Street, District, City, Pincode"
                      className="w-full text-base p-4 pl-12 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Consultation Fee */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Consultation Fee (₹) *</label>
                  <div className="relative">
                    <span className="text-slate-400 font-bold text-base absolute left-4 top-4">₹</span>
                    <input
                      type="text"
                      required
                      value={formData.consultationFee}
                      onChange={(e) => handleTextChange('consultationFee', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 500"
                      className="w-full text-base p-4 pl-12 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-[#F98513] outline-none bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Interactive Weekly Schedule Component */}
                <InteractiveScheduleSelector
                  slotDurationMinutes={formData.slotDurationMinutes}
                  onSlotDurationChange={(duration) => handleTextChange('slotDurationMinutes', duration)}
                  onScheduleChange={(summaryStr, jsonStr) => {
                    setFormData(prev => ({
                      ...prev,
                      availableDays: summaryStr,
                      weeklyScheduleJson: jsonStr
                    }));
                  }}
                />
              </div>
            )}

            {/* STEP 4: Verification & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-slate-900" /> Verification Documents Upload
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-1">
                    Select and upload your official medical verification files for verification.
                  </p>
                </div>

                {/* Interactive File Upload Cards */}
                <div className="space-y-5">

                  {/* 1. Medical License */}
                  <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#F98513]/50 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-[#F98513]/10 text-[#F98513] flex items-center justify-center font-bold shrink-0">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base sm:text-lg font-extrabold text-slate-900">Medical Registration License *</p>
                          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
                            {documentFiles['medical-license'] ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                {documentFiles['medical-license']?.name} ({(documentFiles['medical-license']!.size / 1024).toFixed(1)} KB)
                              </span>
                            ) : (
                              'Upload MCI / State Medical Council Registration (PDF or Image, 50 KB – 5000 KB allowed)'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <input
                          type="file"
                          id="upload-medical-license"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileInputChange('medical-license', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-medical-license"
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#F98513] bg-white hover:bg-[#F98513] hover:text-white border-2 border-[#F98513]/40 px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingDocs['medical-license'] ? 'Uploading...' : documentFiles['medical-license'] ? 'Change File' : 'Select File'}
                        </label>
                        {uploadedDocsInfo.some(d => d.name === 'medical-license' || d.storagePath?.includes('medical-license')) && (
                          <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Degree Certificate */}
                  <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#F98513]/50 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-[#F98513]/10 text-[#F98513] flex items-center justify-center font-bold shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base sm:text-lg font-extrabold text-slate-900">Medical Degree Certificate (MBBS / MD) *</p>
                          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
                            {documentFiles['degree-certificate'] ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                {documentFiles['degree-certificate']?.name} ({(documentFiles['degree-certificate']!.size / 1024).toFixed(1)} KB)
                              </span>
                            ) : (
                              'Upload Degree or Specialization Certificate (PDF or Image, 50 KB – 5000 KB allowed)'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <input
                          type="file"
                          id="upload-degree-certificate"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileInputChange('degree-certificate', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-degree-certificate"
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#F98513] bg-white hover:bg-[#F98513] hover:text-white border-2 border-[#F98513]/40 px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingDocs['degree-certificate'] ? 'Uploading...' : documentFiles['degree-certificate'] ? 'Change File' : 'Select File'}
                        </label>
                        {uploadedDocsInfo.some(d => d.name === 'degree-certificate' || d.storagePath?.includes('degree-certificate')) && (
                          <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Government Photo ID */}
                  <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#F98513]/50 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-[#F98513]/10 text-[#F98513] flex items-center justify-center font-bold shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base sm:text-lg font-extrabold text-slate-900">Government Photo ID (Aadhaar / Passport) *</p>
                          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
                            {documentFiles['id-proof'] ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                {documentFiles['id-proof']?.name} ({(documentFiles['id-proof']!.size / 1024).toFixed(1)} KB)
                              </span>
                            ) : (
                              'Upload Aadhaar Card, Passport, or Govt ID (PDF or Image, 50 KB – 5000 KB allowed)'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <input
                          type="file"
                          id="upload-id-proof"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileInputChange('id-proof', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-id-proof"
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#F98513] bg-white hover:bg-[#F98513] hover:text-white border-2 border-[#F98513]/40 px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingDocs['id-proof'] ? 'Uploading...' : documentFiles['id-proof'] ? 'Change File' : 'Select File'}
                        </label>
                        {uploadedDocsInfo.some(d => d.name === 'id-proof' || d.storagePath?.includes('id-proof')) && (
                          <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Consent Terms Box */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-sm sm:text-base text-slate-900 flex items-start gap-3.5 shadow-sm font-semibold">
                  <input type="checkbox" defaultChecked className="mt-1 accent-[#F98513] cursor-pointer w-4.5 h-4.5" />
                  <p className="leading-relaxed">
                    I certify that all medical license and qualification information submitted above is accurate and authentic under applicable Telemedicine Practice Guidelines.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-slate-400/30">
              {/* Validation Errors */}
              {stepErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-1.5">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Please complete the following required fields:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {stepErrors.map((err, i) => (
                      <li key={i} className="text-[11px] text-red-600">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => { setStepErrors([]); setCurrentStep(prev => prev - 1); }}
                    className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-300 shadow-xs cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-[#F98513] hover:bg-[#e0730b] px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleCompleteSetup}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-habanero hover:bg-habanero/90 disabled:opacity-75 px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Complete Profile Setup
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Verification Pending Modal */}
      {isSubmitted && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-slate-100 relative space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-9 h-9 text-amber-600" />
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Registration Submitted for Verification!</h3>
              <p className="text-sm sm:text-base text-slate-700 font-semibold mt-2.5 leading-relaxed">
                Thank you for registering with <strong className="text-[#223362]">SehatSetu</strong>! We are currently reviewing your medical registration credentials and uploaded verification documents.
              </p>
            </div>

            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4.5 text-left text-sm sm:text-base space-y-2.5">
              <div className="flex items-center gap-2.5 font-extrabold text-amber-950 text-base sm:text-lg">
                <ShieldCheck className="w-5.5 h-5.5 text-amber-600 shrink-0" />
                <span>Verification in Progress</span>
              </div>
              <p className="text-slate-700 font-medium text-sm sm:text-base leading-relaxed">
                Our medical verification board is currently reviewing your medical license and uploaded documents. Verification status will be emailed directly to <strong className="text-slate-900 font-extrabold">{formData.email}</strong>.
              </p>
            </div>

            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4.5 text-sm sm:text-base text-amber-950 font-bold flex items-center gap-3 text-left shadow-xs">
              <span className="text-xl sm:text-2xl shrink-0">🔒</span>
              <span className="leading-relaxed">Dashboard login is currently restricted. Upon email approval, you can log in using your registered email and password.</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  clearAuth();
                  navigate('/');
                }}
                className="w-full bg-[#223362] hover:bg-[#1a284e] text-white font-extrabold text-sm sm:text-base py-4 px-5 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Return to SehatSetu Home <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorOnboarding;
