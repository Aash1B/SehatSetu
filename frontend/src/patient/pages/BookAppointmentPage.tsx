import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Doctor } from '../data/doctorsData';
import { doctorsData } from '../data/doctorsData';
import { fetchDoctors, recommendDoctorsApi, type RecommendationResult } from '../services/doctorApi';
import Footer from '../components/Footer';
import { getPatientDashboard } from '../services/patientApi';
import { getToken } from '../../auth/authStorage';

interface BookingFormData {
  // Step 1
  healthConcern: string;
  symptoms: string[];
  duration: string;
  severity: 'Mild' | 'Moderate' | 'Uncomfortable' | 'Severe' | 'Emergency';
  consultMode: 'Video Consultation' | 'In-Person Visit' | 'Chat / Message';
  urgency: string;
  notes: string;
  isFollowUp: boolean;
  emailRemindersEnabled: boolean;
  // Step 2
  selectedDoctor: Doctor | null;
  // Step 3
  selectedDate: string;
  selectedTimeSlot: string;
  // Step 4
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientHeight: string;
  patientWeight: string;
  patientBloodGroup: string;
  patientPhone: string;
  patientEmail: string;
}

const ALL_SYMPTOMS = [
  'Fever', 'Cough', 'Headache', 'Fatigue', 'Sore Throat',
  'Chest Pain', 'Heart beating faster', 'Heart palpitations',
  'Shortness of Breath', 'Joint Pain', 'Skin Rash',
  'Anxiety', 'Back Pain', 'Nausea', 'Dizziness', 'Stomach Pain',
  'Vomiting', 'Chills', 'Loss of Appetite', 'Body Ache', 'Diarrhea',
  'Acid Reflux', 'Insomnia', 'Muscle Weakness', 'High Blood Pressure',
  'Swelling', 'Weight Loss', 'Weight Gain', 'Loss of Smell / Taste',
  'Eye Irritation', 'Ear Ache', 'Hair Loss', 'Allergies'
];

function doctorMatchesCategory(doctor: Doctor, category: string) {
  const specialty = doctor.specialty.toLowerCase().split(/[ (&/-]/)[0];
  const normalizedCategory = category.toLowerCase().split(/[ (&/-]/)[0];
  return specialty === normalizedCategory;
}

function parseTimeMinutes(timeStr: string) {
  const [time, modifier] = timeStr.trim().split(/\s+/);
  const [rawHours, minutes] = time.split(':').map(Number);
  let hours = rawHours;
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number) {
  let hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function formatConfirmationDateTime(dateStr: string, timeSlot: string) {
  if (!dateStr && !timeSlot) return 'TBD';
  try {
    const today = new Date();
    const selected = dateStr ? new Date(dateStr) : today;
    // Normalize to start of day for comparison
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const s0 = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
    const dayDiff = Math.round((s0.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
    const dayLabel = dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Tomorrow' : selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const timeLabel = timeSlot || '';
    return `${dayLabel}${timeLabel ? (dayLabel ? ', ' : '') + timeLabel : ''}`;
  } catch {
    return timeSlot || dateStr || 'TBD';
  }
}

function formatFeeDisplay(fee: any) {
  if (fee === undefined || fee === null || fee === '') return '₹800';
  const feeStr = String(fee).trim();
  // remove any currency symbols or spacing
  const numeric = feeStr.replace(/[^0-9.]/g, '');
  if (!numeric) return feeStr; // fallback to original
  return `₹${numeric}`;
}

interface DoctorAvailabilityData {
  status?: string;
  slotDurationMinutes?: number;
  slots?: Array<{ day?: string; isWorking?: boolean; workingHours?: string; breakTime?: string }>;
  bookedSlots?: Record<string, string[]>;
}

const DEFAULT_SLOTS = ['09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM', '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM', '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM'];

function getSlotsForDoctorAndDay(availability: DoctorAvailabilityData | null, dayFullName: string) {
  if (!availability) {
    return DEFAULT_SLOTS;
  }
  if (availability.status === 'On Leave') {
    return [];
  }
  const daySlot = availability.slots?.find((s) => s.day?.toLowerCase() === dayFullName.toLowerCase());
  // If the doctor has no schedule entry for this day, or it's marked as not working,
  // show default slots so users can still book (the backend will validate availability).
  if (!daySlot || !daySlot.isWorking || !daySlot.workingHours || daySlot.workingHours.toLowerCase().includes('closed')) {
    return DEFAULT_SLOTS;
  }

  try {
    const [startStr, endStr] = daySlot.workingHours.split('-').map((s: string) => s.trim());
    const startMins = parseTimeMinutes(startStr);
    const endMins = parseTimeMinutes(endStr);
    const duration = availability.slotDurationMinutes || 30;

    let breakStartMins = -1;
    let breakEndMins = -1;

    if (daySlot.breakTime && !daySlot.breakTime.toLowerCase().includes('none') && daySlot.breakTime.includes('-')) {
      const [bStartStr, bEndStr] = daySlot.breakTime.split('-').map((s: string) => s.trim());
      breakStartMins = parseTimeMinutes(bStartStr);
      breakEndMins = parseTimeMinutes(bEndStr);
    }

    const slots: string[] = [];
    for (let current = startMins; current + duration <= endMins; current += duration) {
      if (breakStartMins !== -1 && current >= breakStartMins && current < breakEndMins) {
        continue;
      }
      slots.push(formatMinutesToTime(current));
    }
    return slots.length > 0 ? slots : DEFAULT_SLOTS;
  } catch {
    return DEFAULT_SLOTS;
  }
}

const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');
  const hasPreselectedDoctor = Boolean(id && id !== 'new' && !rescheduleId);

  const [currentStep, setCurrentStep] = useState<number>(1);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const defaultDoctor = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    if (image.src === defaultDoctor) return;
    image.onerror = null;
    image.src = defaultDoctor;
  };

  const [symptomSearch, setSymptomSearch] = useState<string>('');
  const [showMoreSymptoms, setShowMoreSymptoms] = useState<boolean>(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState<boolean>(false);
  const [step2SearchTerm, setStep2SearchTerm] = useState<string>('');
  const [step2Specialty, setStep2Specialty] = useState<string>('All');
  const [showAllSpecialties, setShowAllSpecialties] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallets'>('upi');
  const [step4Error, setStep4Error] = useState<string>('');
  const [slotError, setSlotError] = useState<string>('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [, setIsSubmitting] = useState<boolean>(false);
  const [doctorAvailability, setDoctorAvailability] = useState<DoctorAvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<RecommendationResult | null>(null);
  const [, setLoadingRecommendation] = useState<boolean>(false);
  const [showAllDoctors, setShowAllDoctors] = useState<boolean>(false);
  const [allDoctorsList, setAllDoctorsList] = useState<Doctor[]>([]);

  // Load registered doctors from the backend.
  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchDoctors();
        if (fetched && fetched.length > 0) {
          setAllDoctorsList(fetched);
        }
      } catch (err) {
        console.error('BookAppointment: registered doctors could not be loaded:', err);
      }
    })();
  }, []);
  const [clockNow, setClockNow] = useState(() => new Date());

  const [formData, setFormData] = useState<BookingFormData>({
    healthConcern: '',
    symptoms: [],
    duration: '',
    severity: 'Mild',
    consultMode: 'Video Consultation',
    urgency: '',
    notes: '',
    isFollowUp: false,
    emailRemindersEnabled: true,
    selectedDoctor: null,
    selectedDate: '',
    selectedTimeSlot: '',
    patientName: '', patientAge: '', patientGender: '', patientHeight: '',
    patientWeight: '', patientBloodGroup: '', patientPhone: '', patientEmail: '',
  });

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    getPatientDashboard().then(({ profile }) => {
      setFormData((current) => ({
        ...current, patientName: profile.fullName || '', patientAge: profile.age || '',
        patientGender: profile.gender || '', patientHeight: profile.height || '',
        patientWeight: profile.weight || '', patientBloodGroup: profile.bloodGroup || '',
        patientPhone: profile.phone || '', patientEmail: profile.email || '',
      }));
      if (profile.height) {
        const cm = parseFloat(profile.height);
        if (!isNaN(cm) && cm > 0) {
          const totalInches = cm / 2.54;
          const ft = Math.floor(totalInches / 12);
          const inch = Math.round(totalInches % 12);
          setHeightFt(String(ft));
          setHeightIn(String(inch));
        }
      }
      if (profile.weight) {
        const kg = parseFloat(profile.weight);
        if (!isNaN(kg) && kg > 0) {
          const lbs = Math.round(kg * 2.20462);
          setWeightLbs(String(lbs));
        }
      }
    }).catch(() => navigate('/patient/signup'));
  }, [navigate]);

  const handleNameChange = (val: string) => {
    const cleanName = val.replace(/[^a-zA-Z\s.-]/g, '');
    setFormData(prev => ({ ...prev, patientName: cleanName }));
  };

  const handleAgeChange = (val: string) => {
    const cleanAge = val.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, patientAge: cleanAge }));
  };

  const handlePhoneChange = (val: string) => {
    const cleanPhone = val.replace(/[^0-9]/g, '').substring(0, 10);
    setFormData(prev => ({ ...prev, patientPhone: cleanPhone }));
  };

  const handleCmChange = (val: string) => {
    const cleanCm = val.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, patientHeight: cleanCm }));
  };

  const handleKgChange = (val: string) => {
    const cleanKg = val.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, patientWeight: cleanKg }));
  };

  const handleFtInChange = (ftVal: string, inVal: string) => {
    const cleanFt = ftVal.replace(/[^0-9]/g, '');
    const cleanIn = inVal.replace(/[^0-9]/g, '');
    setHeightFt(cleanFt);
    setHeightIn(cleanIn);

    const ft = parseInt(cleanFt, 10) || 0;
    const inch = parseInt(cleanIn, 10) || 0;
    if (ft > 0 || inch > 0) {
      const cm = Math.round((ft * 12 + inch) * 2.54);
      setFormData(prev => ({ ...prev, patientHeight: String(cm) }));
    } else {
      setFormData(prev => ({ ...prev, patientHeight: '' }));
    }
  };

  const handleLbsChange = (lbsVal: string) => {
    const cleanLbs = lbsVal.replace(/[^0-9.]/g, '');
    setWeightLbs(cleanLbs);
    const lbs = parseFloat(cleanLbs);
    if (!isNaN(lbs) && lbs > 0) {
      const kg = Math.round(lbs * 0.45359237);
      setFormData(prev => ({ ...prev, patientWeight: String(kg) }));
    } else {
      setFormData(prev => ({ ...prev, patientWeight: '' }));
    }
  };

  useEffect(() => {
    if (!rescheduleId) return;
    fetch(`/api/appointments/${encodeURIComponent(rescheduleId)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(async (response) => {
      if (!response.ok) throw new Error('Unable to load the appointment being rescheduled.');
      const appointment = await response.json();
      const availableDoctors = await fetchDoctors();
      const selectedDoctor = availableDoctors.find((doctor) => doctor.id === appointment.doctorId) || null;
      setFormData((current) => ({
        ...current,
        healthConcern: appointment.healthConcern || '', symptoms: appointment.symptoms || [],
        duration: appointment.duration || '', severity: appointment.severity || 'Mild',
        consultMode: appointment.consultMode === 'CHAT' ? 'Chat / Message' : appointment.consultMode === 'IN_PERSON' ? 'In-Person Visit' : 'Video Consultation',
        urgency: appointment.urgency || '', notes: appointment.notes || '', selectedDoctor,
      }));
      setCurrentStep(3);
    }).catch((error) => setSlotError(error instanceof Error ? error.message : 'Unable to reschedule appointment.'));
  }, [rescheduleId]);

  useEffect(() => {
    if (currentStep === 2) {
      const hasSymptomsOrConcern = formData.healthConcern.trim() !== '' || formData.symptoms.length > 0;
      if (!hasSymptomsOrConcern) {
        setAiRecommendation(null);
        setShowAllDoctors(true);
        setFormData(prev => {
          if (prev.selectedDoctor) return prev;
          const defaultDoc = allDoctorsList[0] || doctorsData[0] || null;
          return { ...prev, selectedDoctor: defaultDoc };
        });
        return;
      }

      Promise.resolve().then(() => setLoadingRecommendation(true));
      recommendDoctorsApi(formData.healthConcern, formData.symptoms)
        .then(rec => {
          setAiRecommendation(rec);
          const matchingSpecialists = rec.recommendedDoctors.filter((doctor) =>
            doctorMatchesCategory(doctor, rec.recommendedCategory),
          );
          const localSpecialists = allDoctorsList.filter((doctor) =>
            doctorMatchesCategory(doctor, rec.recommendedCategory),
          );
          const generalPhysicians = allDoctorsList.filter((doctor) =>
            doctorMatchesCategory(doctor, 'General Physician'),
          );
          const recommended = matchingSpecialists.length
            ? matchingSpecialists
            : localSpecialists.length
              ? localSpecialists
              : generalPhysicians;
          setAiRecommendation({ ...rec, recommendedDoctors: recommended });
          setShowAllDoctors(false);
          setFormData(prev => {
            const currentSelected = prev.selectedDoctor;
            const isAlreadyRecommended = currentSelected && recommended.some(d => d.id === currentSelected.id);
            return { ...prev, selectedDoctor: isAlreadyRecommended ? currentSelected : (recommended[0] || null) };
          });
        })
        .catch(() => setAiRecommendation(null))
        .finally(() => setLoadingRecommendation(false));
    }
  }, [currentStep, formData.symptoms, formData.healthConcern, allDoctorsList]);

  useEffect(() => {
    if (id && id !== 'new') {
      const match = allDoctorsList.find(d => d.id === id) || doctorsData.find(d => d.id === id);
      Promise.resolve().then(() => {
        if (match) {
          setFormData(prev => ({ ...prev, selectedDoctor: match }));
        } else if (allDoctorsList.length > 0) {
          setFormData(prev => ({ ...prev, selectedDoctor: allDoctorsList[0] }));
        } else {
          setFormData(prev => ({ ...prev, selectedDoctor: doctorsData[0] }));
        }
      });
    }
  }, [id, allDoctorsList]);

  useEffect(() => {
    const docId = formData.selectedDoctor?.id;
    if (docId) {
      Promise.resolve().then(() => setLoadingAvailability(true));
      fetch(`/api/doctor/${docId}/availability`)
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data && data.slots) {
            setDoctorAvailability(data);
          } else {
            setDoctorAvailability(null);
          }
        })
        .catch(() => setDoctorAvailability(null))
        .finally(() => setLoadingAvailability(false));
    }
  }, [formData.selectedDoctor?.id, formData.selectedDate]);

  const filteredStep2Doctors = allDoctorsList.filter(doc => {
    const matchesSearch =
      doc.name.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.location.toLowerCase().includes(step2SearchTerm.toLowerCase());

    const matchesSpecialty =
      step2Specialty === 'All' ||
      doc.specialty.toLowerCase().includes(step2Specialty.toLowerCase());

    return matchesSearch && matchesSpecialty;
  });

  const recommendedDoctorsForDisplay = aiRecommendation?.recommendedDoctors || [];

  const filteredSymptoms = ALL_SYMPTOMS.filter(s =>
    s.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const toggleSymptom = (symptom: string) => {
    setFormData(prev => {
      const exists = prev.symptoms.includes(symptom);
      const updated = exists
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom];
      return { ...prev, symptoms: updated };
    });
  };


  const handleNextStep = async () => {
    if (currentStep === 3 && (!formData.selectedDate || !formData.selectedTimeSlot)) {
      setSlotError('Please select an available date and time slot.');
      return;
    }
    if (currentStep === 4) {
      if (!formData.patientName.trim()) {
        setStep4Error('Please enter full name.');
        return;
      }
      if (!/^[a-zA-Z\s.]+$/.test(formData.patientName.trim())) {
        setStep4Error('Full Name should only contain letters, spaces, and dots.');
        return;
      }
      if (!formData.patientAge.trim()) {
        setStep4Error('Please enter age.');
        return;
      }
      const ageNum = parseInt(formData.patientAge, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setStep4Error('Please enter a valid age between 1 and 120.');
        return;
      }
      if (!formData.patientPhone.trim()) {
        setStep4Error('Please enter phone number.');
        return;
      }
      if (formData.patientPhone.trim().length !== 10 || !/^\d{10}$/.test(formData.patientPhone.trim())) {
        setStep4Error('Please enter a valid 10-digit phone number.');
        return;
      }
      if (formData.patientHeight.trim()) {
        const htNum = parseFloat(formData.patientHeight);
        if (isNaN(htNum) || htNum < 30 || htNum > 300) {
          setStep4Error('Please enter a valid height between 30 and 300 cm.');
          return;
        }
      }
      if (formData.patientWeight.trim()) {
        const wtNum = parseFloat(formData.patientWeight);
        if (isNaN(wtNum) || wtNum < 2 || wtNum > 500) {
          setStep4Error('Please enter a valid weight between 2 and 500 kg.');
          return;
        }
      }
      if (formData.patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.patientEmail.trim())) {
        setStep4Error('Please enter a valid email address.');
        return;
      }
    }

    setStep4Error('');
    setSlotError('');
    if (currentStep < 4) {
      setCurrentStep(currentStep === 1 && hasPreselectedDoctor && formData.selectedDoctor ? 3 : currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 4) {
      setIsSubmitting(true);
      try {
        const payload = {
          doctorId: formData.selectedDoctor?.id,
          patientName: formData.patientName,
          patientAge: formData.patientAge,
          patientGender: formData.patientGender,
          patientHeight: formData.patientHeight,
          patientWeight: formData.patientWeight,
          patientBloodGroup: formData.patientBloodGroup,
          patientPhone: formData.patientPhone,
          patientEmail: formData.patientEmail,
          healthConcern: formData.healthConcern,
          symptoms: formData.symptoms,
          duration: formData.duration,
          severity: formData.severity,
          consultMode: formData.consultMode,
          urgency: formData.urgency,
          notes: formData.notes,
          isFollowUp: formData.isFollowUp,
          emailRemindersEnabled: formData.emailRemindersEnabled,
          date: formData.selectedDate,
          timeSlot: formData.selectedTimeSlot,
        };

        const response = await fetch(rescheduleId ? `/api/appointments/${encodeURIComponent(rescheduleId)}/reschedule` : '/api/appointments', {
          method: rescheduleId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.message || `The appointment could not be ${rescheduleId ? 'rescheduled' : 'booked'}. Please try again.`);
        }

        setBookingConfirmed(true);
        setCurrentStep(5);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        setStep4Error(err instanceof Error ? err.message : 'The appointment could not be booked.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep === 3 && hasPreselectedDoctor ? 1 : currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="booking-page-layout">
      {/* Top Navbar */}
      <header className="booking-navbar">
        <div className="booking-navbar-container">
          <div className="booking-navbar-left">
            <button
              type="button"
              className="btn-nav-arrow-only"
              onClick={() => navigate('/')}
              title="Back to Home"
              aria-label="Back to Home"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              className="booking-brand-logo"
              onClick={() => navigate('/')}
            >
              <div className="logo-badge">
                <img src="/logo.svg" alt="SehatSetu" className="logo-icon" />
              </div>
              <span className="brand-title">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
            </button>
          </div>

          <nav className="booking-nav-links">
            <button type="button" className="booking-nav-link" onClick={() => navigate('/')}>
              How it works
            </button>
            <button type="button" className="booking-nav-link" onClick={() => navigate('/patient/search')}>
              Find a specialist
            </button>
            <button type="button" className="booking-nav-link" onClick={() => navigate('/')}>
              Health resources
            </button>
          </nav>

          <div className="booking-nav-actions">
            <button type="button" className="btn-booking-get-started" onClick={() => navigate('/')}>
              Home
            </button>
          </div>
        </div>
      </header>

      {/* Step Tracker Header */}
      <div className="booking-step-tracker-bar">
        <div className="step-tracker-container">
          <div className="step-track-line"></div>

          <div className={`step-node ${currentStep >= 1 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
            <span className="step-label">Health Concern</span>
          </div>

          <div className={`step-node ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
            <span className="step-label">Select Doctor</span>
          </div>

          <div className={`step-node ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
            <span className="step-label">Choose Slot</span>
          </div>

          <div className={`step-node ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 4 ? '✓' : '4'}</div>
            <span className="step-label">Patient Info</span>
          </div>

          <div className={`step-node ${currentStep >= 5 ? 'active' : ''}`}>
            <div className="step-number">{bookingConfirmed ? '✓' : '5'}</div>
            <span className="step-label">Confirm & Pay</span>
          </div>
        </div>
      </div>

      {/* Main Booking Content Body */}
      <main className="booking-main-container">
        {/* Top Back Action Bar - Easy navigation at the top */}
        {!bookingConfirmed && (
          <div className="booking-top-back-bar">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn-top-back"
                onClick={handlePrevStep}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back to Step {currentStep - 1}</span>
              </button>
            )}

            <div className="booking-top-breadcrumbs">
              <button type="button" className="crumb-btn" onClick={() => navigate('/')}>
                Home
              </button>
              <span className="crumb-slash">/</span>
              <span className="crumb-active">Book Appointment</span>
            </div>
          </div>
        )}
        {bookingConfirmed ? (
          /* Confirmation Ticket Screen */
          <div className="booking-confirmation-card">
            <div className="confirmation-success-icon">✓</div>
            <h2>Appointment Confirmed!</h2>
            <p className="confirmation-sub">Your appointment has been successfully scheduled with SehatSetu.</p>

            <div className="confirmation-ticket">
              <div className="ticket-header">
                <div>
                  <span className="ticket-id">Booking ID: #SS-BOOK-94281</span>
                  <h3 className="ticket-doctor-name">{formData.selectedDoctor?.name}</h3>
                  <span className="ticket-specialty">{formData.selectedDoctor?.specialty}</span>
                </div>
                <div className="ticket-badge">{formData.consultMode}</div>
              </div>

              <div className="ticket-details-grid">
                <div>
                  <span className="detail-label">Date & Time</span>
                  <span className="detail-val">{formatConfirmationDateTime(formData.selectedDate, formData.selectedTimeSlot)}</span>
                </div>
                <div>
                  <span className="detail-label">Patient Name</span>
                  <span className="detail-val">{formData.patientName || '-'}</span>
                </div>
                <div>
                  <span className="detail-label">Age & Gender</span>
                  <span className="detail-val">{(formData.patientAge ? `${formData.patientAge} Yrs` : '- Yrs') + (formData.patientGender ? `, ${formData.patientGender}` : '')}</span>
                </div>
                <div>
                  <span className="detail-label">Vitals (Height / Weight)</span>
                  <span className="detail-val">{(formData.patientHeight?.trim() ? `${formData.patientHeight} cm` : '- cm') + ', ' + (formData.patientWeight?.trim() ? `${formData.patientWeight} kg` : '- kg')}{formData.patientBloodGroup ? ` (${formData.patientBloodGroup})` : ''}</span>
                </div>
                <div>
                  <span className="detail-label">Consultation Mode</span>
                  <span className="detail-val">{formData.consultMode}</span>
                </div>
                <div>
                  <span className="detail-label">Fee Paid</span>
                  <span className="detail-val">{formatFeeDisplay(formData.selectedDoctor?.fee)}</span>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <button
                type="button"
                className="btn-primary-orange"
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="booking-grid-wrapper">
            {/* Left Column: Form Questionnaire Card */}
            <div className="booking-form-card">
              {currentStep === 1 && (
                <>
                  {/* Title Header with Date Badge */}
                  <div className="form-card-header-v2">
                    <div className="header-left-group">
                      <div className="header-icon-badge-pink">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EF4444" strokeWidth="2">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          <path d="M12 7v6m-3-3h6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="form-main-title">What brings you in today?</h1>
                        <p className="form-main-subtitle">Help us match you with the right specialist.</p>
                      </div>
                    </div>

                    <div className="header-date-badge">
                      <div className="date-icon-box">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div className="date-text-wrap">
                        <span className="date-sub-label">Date</span>
                        <span className="date-val-text">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Q1: What symptoms are you experiencing? */}
                  <div className="form-question-block">
                    <label className="question-label">What symptoms are you experiencing?</label>
                     <div className="symptom-search-bar-v2">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94A3B8" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search or type a symptom (e.g., fever, cough, headache)"
                        value={symptomSearch}
                        onChange={(e) => setSymptomSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = symptomSearch.trim();
                            if (val) {
                              if (!formData.symptoms.includes(val)) {
                                toggleSymptom(val);
                              }
                              setSymptomSearch('');
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Popular Symptoms */}
                    <div className="symptom-subsection">
                      <span className="subsection-label">Popular symptoms</span>
                      <div className="popular-symptoms-grid">
                        {[
                          { name: 'Fever', icon: '🌡️' },
                          { name: 'Cough', icon: '🫁' },
                          { name: 'Headache', icon: '🧠' },
                          { name: 'Fatigue', icon: '🔋' },
                          { name: 'Sore Throat', icon: '🗣️' },
                        ].map(item => {
                          const isSelected = formData.symptoms.includes(item.name);
                          return (
                            <button
                              key={item.name}
                              type="button"
                              className={`popular-symptom-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleSymptom(item.name)}
                            >
                              <span className="popular-icon">{item.icon}</span>
                              <span className="popular-name">{item.name}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="btn-more-symptoms-pill"
                          onClick={() => setShowMoreSymptoms(!showMoreSymptoms)}
                        >
                          {showMoreSymptoms ? '- Less' : '+ More'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Symptoms Pills Row */}
                    {(showMoreSymptoms || symptomSearch.trim()) && (
                      <div className="symptoms-pills-row" style={{ marginTop: '12px' }}>
                        {filteredSymptoms.map(symptom => {
                          const isSelected = formData.symptoms.includes(symptom);
                          return (
                            <button
                              key={symptom}
                              type="button"
                              className={`symptom-pill ${isSelected ? 'active' : ''}`}
                              onClick={() => toggleSymptom(symptom)}
                            >
                              {symptom}
                            </button>
                          );
                        })}
                        {symptomSearch.trim() && !filteredSymptoms.some(s => s.toLowerCase() === symptomSearch.trim().toLowerCase()) && (
                          <button
                            type="button"
                            className="symptom-pill custom-add-pill"
                            style={{ borderStyle: 'dashed', borderColor: '#3B82F6', color: '#2563EB', fontWeight: 'bold' }}
                            onClick={() => {
                              const val = symptomSearch.trim();
                              if (!formData.symptoms.includes(val)) {
                                toggleSymptom(val);
                              }
                              setSymptomSearch('');
                            }}
                          >
                            + Add custom: "{symptomSearch.trim()}"
                          </button>
                        )}
                      </div>
                    )}

                    {/* Selected Symptoms tags */}
                    {formData.symptoms.length > 0 && (
                      <div className="symptom-subsection" style={{ marginTop: '16px' }}>
                        <span className="subsection-label">Selected symptoms ({formData.symptoms.length})</span>
                        <div className="selected-symptoms-row">
                          {formData.symptoms.map(s => (
                            <span key={s} className="selected-symptom-tag">
                              {s}
                              <button
                                type="button"
                                className="btn-remove-symptom"
                                onClick={() => toggleSymptom(s)}
                                title={`Remove ${s}`}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Q2: How long have you been experiencing this? */}
                  <div className="form-question-block" style={{ position: 'relative' }}>
                    <label className="question-label">How long have you been experiencing this?</label>
                    <div className="custom-dropdown-container">
                      <button
                        type="button"
                        className={`custom-dropdown-trigger ${isDurationDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                      >
                        <div className="trigger-left">
                          <div className="trigger-icon-box">📅</div>
                          <span className="trigger-label-val">{formData.duration}</span>
                        </div>
                        <svg
                          className={`chevron-icon ${isDurationDropdownOpen ? 'rotate' : ''}`}
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="#64748B"
                          strokeWidth="2.5"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      {isDurationDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          {[
                            { label: 'Less than a day', sub: 'Just started', icon: '⚡' },
                            { label: '1-3 days', sub: 'Recent onset', icon: '🗓️' },
                            { label: '4-7 days', sub: 'About a week', icon: '⏱️' },
                            { label: '1-3 weeks', sub: 'Ongoing', icon: '📅' },
                            { label: 'More than a month', sub: 'Persistent / chronic', icon: '⏳' },
                          ].map(opt => {
                            const isSelected = formData.duration === opt.label;
                            return (
                              <div
                                key={opt.label}
                                className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData({ ...formData, duration: opt.label });
                                  setIsDurationDropdownOpen(false);
                                }}
                              >
                                <div className="item-icon-circle">{opt.icon}</div>
                                <div className="item-text-group">
                                  <span className="item-main-label">{opt.label}</span>
                                  <span className="item-sub-label">{opt.sub}</span>
                                </div>
                                {isSelected && <span className="item-check-mark">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Q3: When do you need to see a doctor? */}
                  <div className="form-question-block">
                    <label className="question-label">When do you need to see a doctor?</label>
                    <div className="urgency-radio-grid">
                      {['Today (ASAP)', 'Tomorrow', 'This Week', 'Flexible'].map(u => {
                        const isSelected = formData.urgency === u;
                        return (
                          <button
                            key={u}
                            type="button"
                            className={`urgency-radio-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, urgency: u })}
                          >
                            <span className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                            <span className="urgency-label">{u}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Q4: Additional Details */}
                  <div className="form-question-block">
                    <label className="question-label">Follow-up reminders</label>
                    <button
                      type="button"
                      className={`urgency-radio-card ${formData.isFollowUp ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, isFollowUp: !formData.isFollowUp, emailRemindersEnabled: true })}
                    >
                      <span className={`radio-dot ${formData.isFollowUp ? 'checked' : ''}`} />
                      <span className="urgency-label">This is a follow-up consultation</span>
                    </button>
                    {formData.isFollowUp && (
                      <p className="mt-2 text-xs text-blue-700">Email reminders will be sent automatically up to four times before the follow-up.</p>
                    )}
                  </div>

                  {/* Q4: Additional Details */}
                  <div className="form-question-block">
                    <label className="question-label">Any additional details for the doctor? (Optional)</label>
                    <div className="notes-textarea-card">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94A3B8" strokeWidth="2" className="notes-icon">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <textarea
                        rows={3}
                        maxLength={500}
                        placeholder="Share anything that might help your doctor prepare..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                      <span className="char-count-badge">{formData.notes.length}/500</span>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Select Doctor */}
              {currentStep === 2 && (
                <div className="step-2-wrapper">
                  <div className="step2-header-with-back">
                    <button
                      type="button"
                      className="btn-round-back-icon"
                      onClick={handlePrevStep}
                      title="Back"
                    >
                      ‹
                    </button>
                    <div>
                      <h1 className="form-main-title">Select Your Doctor</h1>
                      <p className="form-main-subtitle">Choose from top specialists matched to your symptoms.</p>
                    </div>
                  </div>

                  {/* Step 2 Search & Filter Row */}
                  <div className="step2-search-filter-block">
                    <div className="step2-search-row">
                      <div className="step2-search-input-wrap">
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" width="18" height="18">
                          <circle cx="11" cy="11" r="8" />
                          <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search by doctor name, specialty or keyword..."
                          value={step2SearchTerm}
                          onChange={(e) => setStep2SearchTerm(e.target.value)}
                          className="step2-search-input"
                        />
                      </div>
                    </div>

                    {/* Specialty Chips */}
                    <div className={`specialty-chips-row ${showAllSpecialties ? 'expanded' : ''}`}>
                      {(showAllSpecialties
                        ? ['All', 'General Physician', 'Dermatologist', 'Pediatrician', 'Gynecologist', 'Cardiologist', 'Neurologist', 'Orthopedic', 'Dentist', 'Psychiatrist', 'ENT Specialist', 'Ophthalmologist', 'Pulmonologist', 'Gastroenterologist', 'Urologist']
                        : ['All', 'General Physician', 'Dermatologist', 'Pediatrician', 'Gynecologist', 'Cardiologist']
                      ).map(spec => (
                        <button
                          key={spec}
                          type="button"
                          className={`specialty-chip ${step2Specialty === spec ? 'active' : ''}`}
                          onClick={() => setStep2Specialty(spec)}
                        >
                          {spec}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`specialty-chip more-chip ${showAllSpecialties ? 'active' : ''}`}
                        onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                      >
                        {showAllSpecialties ? 'Less' : 'More'}
                      </button>
                    </div>
                  </div>

                  {/* AI Recommendation Banner */}
                  {aiRecommendation && (
                    <div className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            ✨ AI Recommended Specialist
                          </span>
                          <span className="font-semibold text-blue-950 text-sm">
                            {aiRecommendation.recommendedCategory}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          {aiRecommendation.reason || `Top match based on symptoms: ${formData.symptoms.join(', ')}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Doctor Cards Horizontal Rows List */}
                  <div className="step2-doctors-list">
                    {(() => {
                      const docsToRender = showAllDoctors
                        ? filteredStep2Doctors
                        : recommendedDoctorsForDisplay.slice(0, 1);
                      return docsToRender.map(doc => {
                        const isSelected = formData.selectedDoctor?.id === doc.id;
                        return (
                          <div
                            key={doc.id}
                            className={`step2-doctor-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, selectedDoctor: doc })}
                          >
                            <div className="step2-doc-avatar-wrap">
                              <img src={doc.imageUrl} alt={doc.name} className="step2-doc-avatar" loading="lazy" onError={handleImageError} />
                            </div>

                            <div className="step2-doc-middle-info">
                              <div className="doc-name-badge-row">
                                <h3 className="doc-name">{doc.name}</h3>
                                <svg className="verified-blue-badge" viewBox="0 0 24 24" fill="#2563EB" width="16" height="16">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                              </div>
                              <p className="doc-spec-exp">{doc.specialty} • {doc.experience}</p>
                              <p className="doc-hosp-loc">{doc.hospital}, {doc.location}</p>
                              {doc.degrees && <p className="doc-degrees">{doc.degrees}</p>}

                            </div>

                            <div className="step2-doc-right-action">
                              <div className="doc-avail-status">
                                <span className={`status-dot ${doc.availableToday ? 'available' : 'tomorrow'}`}></span>
                                <span className="status-text">{doc.availableToday ? 'Available Today' : 'Available Tomorrow'}</span>
                              </div>
                              <span className="doc-consult-type">{formData.consultMode}</span>
                              <span className="doc-fee-price">₹{doc.fee.replace(/\D/g, '')} Consultation Fee</span>

                              <button
                                type="button"
                                className={`btn-step2-select ${isSelected ? 'selected' : ''}`}
                              >
                                {isSelected ? 'Selected ✓' : 'View Profile'}
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Toggle All Doctors / Other Specialists */}
                  {!showAllDoctors && filteredStep2Doctors.length > 1 && (
                    <div className="text-center mt-4 mb-2">
                      <button
                        type="button"
                        className="py-2.5 px-6 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
                        onClick={() => setShowAllDoctors(true)}
                      >
                        <span>🔍 View Other Available Specialists ({filteredStep2Doctors.length - 1} more)</span>
                      </button>
                    </div>
                  )}

                  {showAllDoctors && (
                    <div className="text-center mt-4 mb-2">
                      <button
                        type="button"
                        className="py-2 px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-xs rounded-lg transition-all"
                        onClick={() => setShowAllDoctors(false)}
                      >
                        ▲ Show Only AI Recommended Doctor
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Choose Slot */}
              {currentStep === 3 && (() => {
                const upcomingDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayFull = d.toLocaleDateString('en-US', { weekday: 'long' });
                  const dateNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                  const label = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayShort);
                  const dateKey = [
                    d.getFullYear(),
                    String(d.getMonth() + 1).padStart(2, '0'),
                    String(d.getDate()).padStart(2, '0'),
                  ].join('-');
                  return {
                    fullDate: `${label}, ${dayShort} ${dateNum}`,
                    dayShort,
                    dayFull,
                    dateNum,
                    label,
                    rawDate: d,
                    dateKey,
                  };
                });

                const upcomingDaysWithSlots = upcomingDays.map((d) => {
                  const scheduledSlots = getSlotsForDoctorAndDay(doctorAvailability, d.dayFull);

                  const matchingBookedList: string[] = [];
                  if (doctorAvailability?.bookedSlots) {
                    Object.entries(doctorAvailability.bookedSlots).forEach(([key, slots]) => {
                      if (
                        key === d.dateKey ||
                        key.includes(d.dateNum) ||
                        key.includes(`${d.rawDate.getFullYear()}-${String(d.rawDate.getMonth() + 1).padStart(2, '0')}-${String(d.rawDate.getDate()).padStart(2, '0')}`) ||
                        key.includes(`${d.rawDate.getFullYear()}-${d.rawDate.getMonth() + 1}-${d.rawDate.getDate()}`)
                      ) {
                        if (Array.isArray(slots)) {
                          matchingBookedList.push(...slots);
                        }
                      }
                    });
                  }

                  const dayBookedSet = new Set(matchingBookedList.map((s) => s.trim().toLowerCase().replace(/^0/, '')));

                  const minimumBookingMinutes = clockNow.getHours() * 60 + clockNow.getMinutes() + 30
                    + (clockNow.getSeconds() > 0 ? 1 : 0);

                  const availableSlots = scheduledSlots.filter((slot) => {
                    const norm = slot.trim().toLowerCase().replace(/^0/, '');
                    const isBooked = dayBookedSet.has(norm);
                    const isPast = d.label === 'Today' && parseTimeMinutes(slot) < minimumBookingMinutes;
                    return !isBooked && !isPast;
                  });

                  const isNoSlotsLeft = availableSlots.length === 0 || doctorAvailability?.status === 'On Leave';

                  return {
                    ...d,
                    scheduledSlots,
                    dayBookedSet,
                    availableSlotsCount: availableSlots.length,
                    isNoSlotsLeft,
                  };
                });

                // Auto-select first available date if selected date is empty or has no slots left
                const activeDayObj = upcomingDaysWithSlots.find(d => formData.selectedDate === d.dateKey && !d.isNoSlotsLeft)
                  || upcomingDaysWithSlots.find(d => !d.isNoSlotsLeft)
                  || upcomingDaysWithSlots[0];

                const scheduledSlots = activeDayObj.scheduledSlots;
                const bookedSlotsSet = activeDayObj.dayBookedSet;
                const minimumBookingMinutes = clockNow.getHours() * 60 + clockNow.getMinutes() + 30
                  + (clockNow.getSeconds() > 0 ? 1 : 0);
                const activeSlotsCount = activeDayObj.availableSlotsCount;
                const isDoctorOnLeave = doctorAvailability?.status === 'On Leave';

                return (
                  <div className="step-3-wrapper">
                    <h2 className="form-main-title">Choose Appointment Slot</h2>
                    <p className="form-main-subtitle">
                      Select a date and time slot for <span className="doc-highlight-name">{formData.selectedDoctor?.name || 'Dr. Sarah Jenkins'}</span>
                    </p>

                    {/* Section 1: Select Date Carousel */}
                    <div className="slot-section-block">
                      <div className="slot-section-header">
                        <span className="section-icon">📅</span>
                        <h3 className="section-title">Select Date</h3>
                      </div>

                      <div className="date-carousel-wrapper">
                        <div className="date-cards-row">
                          {upcomingDaysWithSlots.map((d) => {
                            const isSelected = activeDayObj.dateKey === d.dateKey;
                            const isNoSlots = d.isNoSlotsLeft;
                            return (
                              <button
                                key={d.fullDate}
                                type="button"
                                disabled={isNoSlots}
                                className={`date-card-box ${isSelected ? 'selected' : ''} ${isNoSlots ? 'no-slots-disabled' : ''}`}
                                onClick={() => {
                                  if (isNoSlots) return;
                                  setSlotError('');
                                  setFormData({ ...formData, selectedDate: d.dateKey, selectedTimeSlot: '' });
                                }}
                              >
                                <span className="date-card-tag">{isNoSlots ? 'No Slots' : d.label}</span>
                                <span className="date-card-day">{d.dayShort}</span>
                                <span className="date-card-num">{d.dateNum}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Available Time Slots Grid */}
                    <div className="slot-section-block" style={{ marginTop: '28px' }}>
                      <div className="slot-section-header">
                        <span className="section-icon">🕒</span>
                        <h3 className="section-title">
                          Available Time Slots ({activeDayObj.label}, {activeDayObj.dateNum})
                          {doctorAvailability?.slotDurationMinutes && (
                            <span className="text-xs text-gray-500 font-normal ml-2">({doctorAvailability.slotDurationMinutes}-min slots)</span>
                          )}
                        </h3>
                      </div>

                      {activeDayObj.label === 'Today' && activeSlotsCount > 0 && (
                        <p className="text-xs text-blue-700 mb-3">
                          Today's slots are shown only when they are at least 30 minutes from the current time.
                        </p>
                      )}
                      {slotError && <p role="alert" className="text-sm text-red-600 mb-3">{slotError}</p>}

                      {loadingAvailability ? (
                        <div className="py-8 text-center text-gray-500 font-medium">Checking doctor availability...</div>
                      ) : isDoctorOnLeave ? (
                        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center font-medium">
                          ⚠️ {formData.selectedDoctor?.name} is currently on leave. Please select another doctor or pick a later date.
                        </div>
                      ) : activeSlotsCount === 0 ? (
                        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-center font-medium">
                          🚫 {formData.selectedDoctor?.name} has no available slots left on {activeDayObj.dayFull}s ({activeDayObj.dateNum}). Please select an alternate day above.
                        </div>
                      ) : (
                        <div className="time-slots-6col-grid">
                          {scheduledSlots.map((slot) => {
                            const norm = slot.trim().toLowerCase().replace(/^0/, '');
                            const isBooked = bookedSlotsSet.has(norm);
                            const isPast = activeDayObj.label === 'Today' && parseTimeMinutes(slot) < minimumBookingMinutes;
                            const isUnavailable = isBooked || isPast;
                            const isSelected = formData.selectedTimeSlot === slot;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isUnavailable}
                                className={`time-slot-pill ${isSelected ? 'selected' : ''} ${isUnavailable ? 'booked-unavailable' : ''}`}
                                style={isUnavailable ? { display: 'flex', flexDirection: 'column', gap: '2px' } : undefined}
                                onClick={() => {
                                  if (isUnavailable) return;
                                  setSlotError('');
                                  setFormData({ ...formData, selectedDate: activeDayObj.dateKey, selectedTimeSlot: slot });
                                }}
                              >
                                <span>{slot}</span>
                                {isBooked && <span className="slot-booked-label">Booked</span>}
                                {isPast && !isBooked && <span className="slot-booked-label" style={{ color: '#94A3B8' }}>Past</span>}
                                {isSelected && !isUnavailable && <span className="slot-check-icon">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Timezone Info Alert Banner removed as per design request */}
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Patient Info */}
              {currentStep === 4 && (
                <div className="step-4-wrapper">
                  <h2 className="form-main-title">Patient Details</h2>
                  <p className="form-main-subtitle">Enter details for the consultation record. Height and Weight give your doctor vital context about your health.</p>

                  {step4Error && (
                    <div className="form-error-alert" style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      color: '#991B1B',
                      marginBottom: '16px',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>⚠️</span>
                      <span>{step4Error}</span>
                    </div>
                  )}

                  <div className="patient-form-grid">
                    <div className="input-field-group">
                      <label className="field-label">Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control-input"
                        placeholder="Enter your full name"
                        value={formData.patientName}
                        onChange={(e) => {
                          setStep4Error('');
                          handleNameChange(e.target.value);
                        }}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">Age (Years) <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control-input"
                        placeholder="e.g. 28"
                        value={formData.patientAge}
                        onChange={(e) => {
                          setStep4Error('');
                          handleAgeChange(e.target.value);
                        }}
                      />
                    </div>

                    <div className="input-field-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="field-label" style={{ margin: 0 }}>Height <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>(Optional)</span></label>
                        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setHeightUnit('cm')}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: heightUnit === 'cm' ? '#FFFFFF' : 'transparent',
                              color: heightUnit === 'cm' ? '#0F172A' : '#64748B',
                              boxShadow: heightUnit === 'cm' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >cm</button>
                          <button
                            type="button"
                            onClick={() => setHeightUnit('ft')}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: heightUnit === 'ft' ? '#FFFFFF' : 'transparent',
                              color: heightUnit === 'ft' ? '#0F172A' : '#64748B',
                              boxShadow: heightUnit === 'ft' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >ft/in</button>
                        </div>
                      </div>

                      {heightUnit === 'cm' ? (
                        <input
                          type="text"
                          className="form-control-input"
                          placeholder="e.g. 165"
                          value={formData.patientHeight}
                          onChange={(e) => {
                            setStep4Error('');
                            handleCmChange(e.target.value);
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="form-control-input"
                            style={{ flex: 1 }}
                            placeholder="ft"
                            value={heightFt}
                            onChange={(e) => {
                              setStep4Error('');
                              handleFtInChange(e.target.value, heightIn);
                            }}
                          />
                          <input
                            type="text"
                            className="form-control-input"
                            style={{ flex: 1 }}
                            placeholder="in"
                            value={heightIn}
                            onChange={(e) => {
                              setStep4Error('');
                              handleFtInChange(heightFt, e.target.value);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="input-field-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="field-label" style={{ margin: 0 }}>Weight <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>(Optional)</span></label>
                        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setWeightUnit('kg')}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: weightUnit === 'kg' ? '#FFFFFF' : 'transparent',
                              color: weightUnit === 'kg' ? '#0F172A' : '#64748B',
                              boxShadow: weightUnit === 'kg' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >kg</button>
                          <button
                            type="button"
                            onClick={() => setWeightUnit('lbs')}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: weightUnit === 'lbs' ? '#FFFFFF' : 'transparent',
                              color: weightUnit === 'lbs' ? '#0F172A' : '#64748B',
                              boxShadow: weightUnit === 'lbs' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >lbs</button>
                        </div>
                      </div>

                      {weightUnit === 'kg' ? (
                        <input
                          type="text"
                          className="form-control-input"
                          placeholder="e.g. 62"
                          value={formData.patientWeight}
                          onChange={(e) => {
                            setStep4Error('');
                            handleKgChange(e.target.value);
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-control-input"
                          placeholder="e.g. 137"
                          value={weightLbs}
                          onChange={(e) => {
                            setStep4Error('');
                            handleLbsChange(e.target.value);
                          }}
                        />
                      )}
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">Blood Group <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>(Optional)</span></label>
                      <select
                        className="form-control-input"
                        value={formData.patientBloodGroup}
                        onChange={(e) => setFormData({ ...formData, patientBloodGroup: e.target.value })}
                      >
                        <option value="">Select Blood Group (Optional)</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="Unknown">Don't know / Unknown</option>
                      </select>
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">Phone Number <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control-input"
                        placeholder="10-digit number"
                        value={formData.patientPhone}
                        onChange={(e) => {
                          setStep4Error('');
                          handlePhoneChange(e.target.value);
                        }}
                      />
                    </div>

                    <div className="input-field-group full-width-field">
                      <label className="field-label">Gender <span className="helper-note">(Provides physiological context for diagnosis)</span></label>
                      <div className="gender-selector-row">
                        {[
                          { id: 'Female', label: 'Female', icon: '👩' },
                          { id: 'Male', label: 'Male', icon: '👨' },
                          { id: 'Other', label: 'Other', icon: '🧑' },
                        ].map((g) => {
                          const isSelected = formData.patientGender === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              className={`gender-option-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setFormData({ ...formData, patientGender: g.id })}
                            >
                              <span className="gender-card-icon">{g.icon}</span>
                              <span className="gender-card-label">{g.label}</span>
                              {isSelected && <span className="gender-card-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="input-field-group full-width-field">
                      <label className="field-label">Email Address <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>(Optional)</span></label>
                      <input
                        type="email"
                        className="form-control-input"
                        placeholder="ananya@example.com (Optional)"
                        value={formData.patientEmail}
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Confirm & Pay */}
              {currentStep === 5 && (
                <div className="step-5-wrapper">
                  <div className="step5-header">
                    <h1 className="form-main-title">Confirm & Pay</h1>
                    <p className="form-main-subtitle">Please confirm your appointment details and proceed to payment.</p>
                  </div>

                  {/* Main Appointment Details Card */}
                  <div className="appointment-details-card">
                    <div className="app-details-header">
                      <h2 className="app-details-title">Appointment Details</h2>
                      <button
                        type="button"
                        className="btn-edit-appointment"
                        onClick={() => setCurrentStep(1)}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    </div>

                    <div className="app-details-list">
                      {/* Row 1: Health Concern */}
                      <div className="app-detail-item">
                        <div className="item-icon-box blue-box">🩺</div>
                        <div className="item-content">
                          <span className="item-label">Health Concern</span>
                          <span className="item-value">{formData.healthConcern === 'specific-symptoms' ? 'Specific Symptoms' : 'Other'}</span>
                          <span className="item-sub">
                            {formData.symptoms.length > 0 ? formData.symptoms.join(', ') : 'General health query'}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Doctor */}
                      <div className="app-detail-item">
                        <div className="item-icon-box green-box">👨‍⚕️</div>
                        <div className="item-content">
                          <span className="item-label">Doctor</span>
                          <span className="item-value">{formData.selectedDoctor?.name || 'No doctor selected'}</span>
                          <span className="item-sub">
                            {formData.selectedDoctor?.specialty || 'Dermatologist'} • {formData.selectedDoctor?.experience || '11+ Years Experience'}
                          </span>
                        </div>
                        {formData.selectedDoctor?.imageUrl && (
                          <img
                            src={formData.selectedDoctor.imageUrl}
                            alt={formData.selectedDoctor.name}
                            className="item-doc-avatar"
                            loading="lazy"
                            onError={handleImageError}
                          />
                        )}
                      </div>

                      {/* Row 3: Date & Time */}
                      <div className="app-detail-item">
                        <div className="item-icon-box purple-box">📅</div>
                        <div className="item-content">
                          <span className="item-label">Date & Time</span>
                          <span className="item-value">{formData.selectedDate ? new Date(formData.selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not selected'}</span>
                          <span className="item-sub time-bold">{formData.selectedTimeSlot || '07:30 PM'}</span>
                        </div>
                        <button type="button" className="btn-add-calendar">
                          📅 Add to Calendar
                        </button>
                      </div>

                      {/* Row 4: Consultation Type */}
                      <div className="app-detail-item">
                        <div className="item-icon-box orange-box">📹</div>
                        <div className="item-content">
                          <span className="item-label">Consultation Type</span>
                          <span className="item-value">{formData.consultMode}</span>
                          <span className="item-sub">Chat / Message</span>
                        </div>
                      </div>

                      {/* Row 5: Patient & Vitals */}
                      <div className="app-detail-item">
                        <div className="item-icon-box pink-box">👤</div>
                        <div className="item-content">
                          <span className="item-label">Patient & Vitals</span>
                          <span className="item-value">{formData.patientName}, {formData.patientAge} yrs, {formData.patientGender}</span>
                          <span className="item-sub">
                            Height: {formData.patientHeight || '--'} cm • Weight: {formData.patientWeight || '--'} kg
                            {formData.patientBloodGroup ? ` • Blood Group: ${formData.patientBloodGroup}` : ''}
                          </span>
                          <span className="item-sub">{formData.patientPhone}{formData.patientEmail ? ` • ${formData.patientEmail}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Security Blue Banner */}
                    <div className="security-blue-banner">
                      <svg viewBox="0 0 24 24" fill="#2563EB" width="18" height="18">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span>Your health information is private and secure with us.</span>
                    </div>
                  </div>

                  {/* Bottom Footer Row under Appointment Details Card */}
                  <div className="step5-bottom-bar">
                    <div className="secure-checkout-tag">
                      <span className="lock-icon">🔒</span>
                      <div>
                        <span className="secure-title">Secure Checkout</span>
                        <span className="secure-sub">256-bit SSL encrypted payment</span>
                      </div>
                    </div>

                    <div className="need-help-chat-box">
                      <span className="headset-icon">🎧</span>
                      <div>
                        <span className="help-title">Need Help?</span>
                        <span className="help-sub">Our support team is here to help you.</span>
                      </div>
                      <button
                        type="button"
                        className="btn-chat-with-us"
                        onClick={() => setShowHelpModal(true)}
                      >
                        Chat with us
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="form-card-footer">
                <button
                  type="button"
                  className="btn-form-back"
                  onClick={handlePrevStep}
                >
                  ← Back
                </button>

                <div className="privacy-badge">
                  🔒 Your health information is private and secure.
                </div>

                <button
                  type="button"
                  className="btn-form-next-orange"
                  onClick={handleNextStep}
                >
                  {currentStep === 1 && (hasPreselectedDoctor && formData.selectedDoctor ? 'Next: Choose Slot →' : 'Next: Select Doctor →')}
                  {currentStep === 2 && 'Next: Choose Slot →'}
                  {currentStep === 3 && 'Next: Patient Info →'}
                  {currentStep === 4 && 'Next: Confirm & Pay →'}
                  {currentStep === 5 && 'Confirm & Pay Now →'}
                </button>
              </div>

              {/* Collapsed Accordion for Next Step preview */}
              {currentStep === 1 && (
                <div className="collapsed-step-accordion">
                  <div className="accordion-header">
                    <span>🔒 Step 2 — Select Doctor</span>
                    <span className="accordion-sub">Complete Step 1 to continue</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Summary Card */}
            <div className="booking-summary-sidebar">
              {currentStep === 5 ? (
                <div className="payment-sidebar-card">
                  {/* Section 1: Payment Summary */}
                  <div className="payment-summary-section">
                    <h3 className="payment-section-title">Payment Summary</h3>

                    <div className="pay-row">
                      <span>Consultation Fee</span>
                      <strong className="pay-amt">₹{formData.selectedDoctor?.fee.replace(/\D/g, '') || '600'}</strong>
                    </div>

                    <div className="pay-row discount-row">
                      <span>Discount</span>
                      <span className="discount-amt">-₹0</span>
                    </div>

                    <div className="pay-divider"></div>

                    <div className="pay-row total-payable-row">
                      <span className="total-label">Total Payable</span>
                      <span className="total-amt">₹{formData.selectedDoctor?.fee.replace(/\D/g, '') || '600'}</span>
                    </div>

                    <div className="no-hidden-charges-badge">
                      <span className="check-icon-green">✓</span>
                      <div>
                        <span className="badge-title">No hidden charges</span>
                        <span className="badge-sub">All taxes included</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pay Securely (Payment Methods) */}
                  <div className="pay-methods-section">
                    <div className="pay-methods-header">
                      <h3 className="payment-section-title">Pay Securely</h3>
                      <div className="pay-logos-row">
                        <span className="pay-logo-badge visa">VISA</span>
                        <span className="pay-logo-badge mc">MC</span>
                        <span className="pay-logo-badge upi">UPI</span>
                        <span className="pay-logo-badge paytm">Paytm</span>
                      </div>
                    </div>

                    <div className="pay-options-group">
                      {/* Option 1: UPI */}
                      <label className={`pay-option-card ${paymentMethod === 'upi' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'upi'}
                          onChange={() => setPaymentMethod('upi')}
                        />
                        <div className="pay-option-content">
                          <div className="pay-option-top">
                            <span className="method-name">UPI</span>
                            <div className="upi-icons-row">
                              <span className="mini-pay-badge gpay">GPay</span>
                              <span className="mini-pay-badge phonepe">Pe</span>
                              <span className="mini-pay-badge paytm-m">Paytm</span>
                            </div>
                          </div>
                          <span className="method-sub">Pay using any UPI app</span>
                        </div>
                      </label>

                      {/* Option 2: Credit / Debit Card */}
                      <label className={`pay-option-card ${paymentMethod === 'card' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                        />
                        <div className="pay-option-content">
                          <span className="method-name">Credit / Debit Card</span>
                          <span className="method-sub">Visa, Mastercard, Rupay</span>
                        </div>
                      </label>

                      {/* Option 3: Net Banking */}
                      <label className={`pay-option-card ${paymentMethod === 'netbanking' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'netbanking'}
                          onChange={() => setPaymentMethod('netbanking')}
                        />
                        <div className="pay-option-content">
                          <span className="method-name">Net Banking</span>
                          <span className="method-sub">All major banks</span>
                        </div>
                      </label>

                      {/* Option 4: Wallets */}
                      <label className={`pay-option-card ${paymentMethod === 'wallets' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'wallets'}
                          onChange={() => setPaymentMethod('wallets')}
                        />
                        <div className="pay-option-content">
                          <span className="method-name">Wallets</span>
                          <span className="method-sub">Paytm, PhonePe, Amazon Pay</span>
                        </div>
                      </label>
                    </div>

                    {/* Pay Button */}
                    <button
                      type="button"
                      className="btn-pay-now-primary"
                      onClick={() => setBookingConfirmed(true)}
                    >
                      <span className="lock-icon">🔒</span>
                      <span>Pay ₹{formData.selectedDoctor?.fee.replace(/\D/g, '') || '600'} Securely</span>
                    </button>

                    <div className="secure-payments-note">
                      <span className="check-icon-blue">✓</span>
                      <span>100% Secure Payments</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>

                  {/* Card 2: Selected Doctor Card Preview */}
                  {formData.selectedDoctor && (
                    <div className="summary-card doc-preview-sidebar-card">
                      <div className="sidebar-doc-preview-content">
                        <img
                          src={formData.selectedDoctor.imageUrl}
                          alt={formData.selectedDoctor.name}
                          className="sidebar-doc-avatar"
                          loading="lazy"
                          onError={handleImageError}
                        />
                        <div className="sidebar-doc-info">
                          <div className="doc-name-badge-row">
                            <h4 className="sidebar-doc-name">{formData.selectedDoctor.name}</h4>
                            <svg className="verified-blue-badge" viewBox="0 0 24 24" fill="#2563EB" width="14" height="14">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </div>
                          <p className="sidebar-doc-spec">{formData.selectedDoctor.specialty}</p>
                          <p className="sidebar-doc-exp">{formData.selectedDoctor.experience}</p>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card 3: Need Help Box */}
                  <div className="summary-card help-sidebar-card">
                    <div className="help-sidebar-content" onClick={() => setShowHelpModal(true)}>
                      <span className="headset-icon">🎧</span>
                      <div>
                        <h5 className="help-sidebar-title">Need Help?</h5>
                        <p className="help-sidebar-sub">Our support team is here to help you.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="booking-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="booking-modal-card" onClick={e => e.stopPropagation()}>
            <h3>Need Help Booking?</h3>
            <p>Our medical assistants are online 24/7 to assist you in picking the right specialist.</p>
            <div className="help-contact-buttons">
              <a href="tel:108" className="btn-primary-orange">Call Support (108)</a>
              <button type="button" className="btn-secondary-outline" onClick={() => setShowHelpModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BookAppointmentPage;
