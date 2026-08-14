import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Doctor } from '../data/doctorsData';
import { doctorsData } from '../data/doctorsData';
import { fetchDoctors, recommendDoctorsApi, type RecommendationResult } from '../services/doctorApi';
import Footer from '../components/Footer';
import { getPatientDashboard } from '../services/patientApi';
import { getToken } from '../../auth/authStorage';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';
import PayButton from '../../payments/PayButton';
import type { PaymentReceipt } from '../../payments/api';

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
  'Chest Pain', 'Shortness of Breath', 'Joint Pain', 'Skin Rash',
  'Anxiety', 'Back Pain', 'Nausea', 'Dizziness', 'Stomach Pain',
  'Vomiting', 'Chills', 'Loss of Appetite', 'Body Ache', 'Diarrhea',
  'Acid Reflux', 'Insomnia', 'Muscle Weakness', 'High Blood Pressure',
  'Swelling', 'Weight Loss', 'Weight Gain', 'Loss of Smell / Taste',
  'Eye Irritation', 'Ear Ache', 'Hair Loss', 'Allergies'
];

function doctorMatchesCategory(doctor: Doctor, category: string) {
  if (!category) return true;
  const spec = doctor.specialty.toLowerCase();
  const cat = category.toLowerCase();
  const specKeyword = spec.split(/[ (&/-]/)[0];
  const catKeyword = cat.split(/[ (&/-]/)[0];
  return spec.includes(catKeyword) || cat.includes(specKeyword);
}

const CONSULT_MODE_LABEL: Record<string, string> = {
  'Video Consultation': 'forms:consultMode.video',
  'Chat / Message': 'forms:consultMode.chat',
};

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

interface DoctorAvailabilityData {
  status?: string;
  slotDurationMinutes?: number;
  slots?: Array<{ day?: string; isWorking?: boolean; workingHours?: string; breakTime?: string }>;
  bookedSlots?: Record<string, string[]>;
}

interface CreatedAppointment {
  id: string;
  scheduledAt?: string;
  date?: string;
  timeSlot?: string;
}

function formatBookingDate(appointment: CreatedAppointment | null, fallbackDate: string, fallbackTime: string) {
  if (appointment?.scheduledAt) {
    const date = new Date(appointment.scheduledAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
  }
  return [appointment?.date || fallbackDate, appointment?.timeSlot || fallbackTime].filter(Boolean).join(', ');
}

function formatFeeAmount(fee?: string) {
  const amount = Number.parseFloat((fee || '').replace(/,/g, '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
}

const BOOKING_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseBookingDateTime(dateLabel: string, timeSlot: string) {
  const dateMatch = dateLabel.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
  const timeMatch = timeSlot.match(/^(\d{1,2}):?(\d{2})\s*(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return null;

  const monthIndex = BOOKING_MONTHS.findIndex((month) => dateMatch[1].toLowerCase().startsWith(month));
  if (monthIndex < 0) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 12 || minutes > 59) return null;
  if (timeMatch[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;

  const hasExplicitYear = Boolean(dateMatch[3]);
  const year = Number(dateMatch[3] || new Date().getFullYear());
  const result = new Date(year, monthIndex, Number(dateMatch[2]), hours, minutes, 0, 0);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== monthIndex ||
    result.getDate() !== Number(dateMatch[2])
  ) {
    return null;
  }

  // The picker shows only month/day, so move a date into next year when the
  // seven-day picker crosses December/January.
  if (!hasExplicitYear && result.getTime() < Date.now()) {
    result.setFullYear(result.getFullYear() + 1);
  }
  return result;
}

function getSlotsForDoctorAndDay(availability: DoctorAvailabilityData | null, dayFullName: string) {
  if (!availability) {
    return ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM', '04:30 PM'];
  }
  if (availability.status === 'On Leave') {
    return [];
  }
  const daySlot = availability.slots?.find((s) => s.day?.toLowerCase() === dayFullName.toLowerCase());
  if (!daySlot || !daySlot.isWorking || !daySlot.workingHours || daySlot.workingHours.toLowerCase().includes('closed')) {
    return [];
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
    return slots;
  } catch {
    return ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
  }
}

const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');
  const hasPreselectedDoctor = Boolean(id && id !== 'new' && !rescheduleId);
  const { t } = useTranslation(['appointment', 'doctor', 'forms', 'common', 'buttons', 'validation', 'patient', 'errors']);
  const { t: tCommon } = useTranslation('common');

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
  const [createdAppointment, setCreatedAppointment] = useState<CreatedAppointment | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);
  const [step4Error, setStep4Error] = useState<string>('');
  const [slotError, setSlotError] = useState<string>('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const submittingRef = useRef(false);
  const [doctorAvailability, setDoctorAvailability] = useState<DoctorAvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<RecommendationResult | null>(null);
  const [, setLoadingRecommendation] = useState<boolean>(false);
  const [showAllDoctors, setShowAllDoctors] = useState<boolean>(true);
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
      if (!response.ok) throw new Error(t('errors:appointmentNotFound'));
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
    }).catch((error) => setSlotError(error instanceof Error ? error.message : t('errors:unableToReschedule')));
  }, [rescheduleId]);

  useEffect(() => {
    if (currentStep === 2) {
      if (formData.symptoms.length === 0 && !formData.healthConcern) {
        setAiRecommendation(null);
        setLoadingRecommendation(false);
        if (allDoctorsList.length > 0 && !formData.selectedDoctor) {
          setFormData(prev => ({ ...prev, selectedDoctor: allDoctorsList[0] }));
        }
        return;
      }
      Promise.resolve().then(() => setLoadingRecommendation(true));
      recommendDoctorsApi(formData.healthConcern, formData.symptoms)
        .then(rec => {
          setAiRecommendation(rec);
          const matchingSpecialists = allDoctorsList.filter((doctor) =>
            doctorMatchesCategory(doctor, rec.recommendedCategory),
          );
          const recommended = matchingSpecialists.length > 0 ? matchingSpecialists : allDoctorsList;
          setAiRecommendation({ ...rec, recommendedDoctors: recommended });
          if (recommended.length > 0) {
            setFormData(prev => ({ ...prev, selectedDoctor: recommended[0] }));
          }
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
          if (data) {
            setDoctorAvailability(data);
          } else {
            setDoctorAvailability(null);
          }
        })
        .catch(() => setDoctorAvailability(null))
        .finally(() => setLoadingAvailability(false));
    }
  }, [formData.selectedDoctor?.id, formData.selectedDate]);

  const hasSymptoms = formData.symptoms.length > 0 || Boolean(formData.healthConcern);

  const filteredStep2Doctors = allDoctorsList.filter(doc => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(step2SearchTerm.toLowerCase()) ||
      doc.location.toLowerCase().includes(step2SearchTerm.toLowerCase());

    let matchesSpecialty = true;
    if (step2Specialty !== 'All') {
      matchesSpecialty = doc.specialty.toLowerCase().includes(step2Specialty.toLowerCase());
    } else if (hasSymptoms && aiRecommendation?.recommendedCategory) {
      matchesSpecialty = doctorMatchesCategory(doc, aiRecommendation.recommendedCategory);
    }

    return matchesSearch && matchesSpecialty;
  });

  const recommendedDoctorsForDisplay = aiRecommendation?.recommendedDoctors || [];

  const filteredSymptoms = ALL_SYMPTOMS.filter(s =>
    s.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const toggleSymptom = (symptom: string) => {
    const isSelected = formData.symptoms.includes(symptom);
    const newSymptoms = isSelected
      ? formData.symptoms.filter((s) => s !== symptom)
      : [...formData.symptoms, symptom];
    setFormData({ ...formData, symptoms: newSymptoms });
  };
  const consultModeDisplay = (mode: string) => t(CONSULT_MODE_LABEL[mode] || 'forms:consultMode.chat', { defaultValue: mode });

  const handleNextStep = async () => {
    if (currentStep === 4 && submittingRef.current) return;

    if (currentStep === 3 && (!formData.selectedDate || !formData.selectedTimeSlot)) {
      setSlotError(t('appointment:selectSlot'));
      return;
    }
    if (currentStep === 4) {
      if (!formData.patientName.trim()) {
        setStep4Error(t('forms:enterFullName'));
        return;
      }
      if (!/^[a-zA-Z\s.]+$/.test(formData.patientName.trim())) {
        setStep4Error(t('validation:nameInvalid'));
        return;
      }
      if (!formData.patientAge.trim()) {
        setStep4Error(t('forms:enterAge'));
        return;
      }
      const ageNum = parseInt(formData.patientAge, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setStep4Error(t('validation:ageInvalid'));
        return;
      }
      if (!formData.patientPhone.trim()) {
        setStep4Error(t('forms:enterPhone'));
        return;
      }
      if (formData.patientPhone.trim().length !== 10 || !/^\d{10}$/.test(formData.patientPhone.trim())) {
        setStep4Error(t('validation:invalidPhone'));
        return;
      }
      if (formData.patientHeight.trim()) {
        const htNum = parseFloat(formData.patientHeight);
        if (isNaN(htNum) || htNum < 30 || htNum > 300) {
          setStep4Error(t('validation:heightInvalid'));
          return;
        }
      }
      if (formData.patientWeight.trim()) {
        const wtNum = parseFloat(formData.patientWeight);
        if (isNaN(wtNum) || wtNum < 2 || wtNum > 500) {
          setStep4Error(t('validation:weightInvalid'));
          return;
        }
      }
      if (formData.patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.patientEmail.trim())) {
        setStep4Error(t('validation:invalidEmail'));
        return;
      }
    }

    setStep4Error('');
    setSlotError('');
    if (currentStep < 4) {
      setCurrentStep(currentStep === 1 && hasPreselectedDoctor && formData.selectedDoctor ? 3 : currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 4) {
      if (submittingRef.current) return;
      submittingRef.current = true;
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
          throw new Error(body?.message || t('errors:unableToBook'));
        }

        const created = await response.json() as CreatedAppointment;
        setCreatedAppointment(created);
        // Rescheduling does not create a new payment. New appointments proceed to Razorpay.
        if (rescheduleId) {
          setBookingConfirmed(true);
        } else {
          setCurrentStep(5);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        setStep4Error(err instanceof Error ? err.message : t(rescheduleId ? 'errors:unableToReschedule' : 'errors:unableToBook'));
      } finally {
        submittingRef.current = false;
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

  const getCalendarUrl = () => {
    const serverStart = createdAppointment?.scheduledAt
      ? new Date(createdAppointment.scheduledAt)
      : null;
    const start = serverStart && !Number.isNaN(serverStart.getTime())
      ? serverStart
      : parseBookingDateTime(formData.selectedDate, formData.selectedTimeSlot);

    if (!start) return null;

    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const formatCalendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const doctorName = formData.selectedDoctor?.name || 'SehatSetu appointment';
    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: `SehatSetu consultation with ${doctorName}`,
      dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
      details: `Consultation type: ${formData.consultMode}${createdAppointment?.id ? `\nAppointment ID: ${createdAppointment.id}` : ''}`,
      location: 'SehatSetu online consultation',
    });
    return `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;
  };

  const handleAddToCalendar = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!getCalendarUrl()) {
      event.preventDefault();
      window.alert('Unable to prepare the calendar event. Please check the appointment date and time.');
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
                      title={tCommon('backToHome')}
                      aria-label={tCommon('backToHome')}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <button 
              type="button" 
              className="booking-brand-logo"
              onClick={() => navigate('/')}
            >
              <BrandLogo
                markWrapperClassName="landing-brand-mark rounded-xl bg-transparent flex items-center justify-center p-1.5 shadow-none transition group-hover:scale-105"
                wordmarkClassName="landing-brand-wordmark font-extrabold text-slate-900 tracking-tight"
                accentClassName="brand-title-accent-royal"
              />
            </button>
          </div>

          <nav className="booking-nav-links">
            <button type="button" className="booking-nav-link" onClick={() => navigate('/')}>
              {t('home:howItWorks')}
            </button>
            <button type="button" className="booking-nav-link" onClick={() => navigate('/patient/search')}>
              {t('navbar:findDoctors')}
            </button>
            <button type="button" className="booking-nav-link" onClick={() => navigate('/')}>
              {t('navbar:healthResources')}
            </button>
          </nav>

          <div className="booking-nav-actions">
            {currentStep === 5 && (
              <div className="checkout-header-security">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span>Secure &amp; Encrypted</span>
              </div>
            )}
            <button type="button" className="btn-booking-get-started" onClick={() => navigate('/')}>
              {t('common:home')}
            </button>
          </div>
        </div>
      </header>

      {/* Step Tracker Header */}
      <div className={`booking-step-tracker-bar ${currentStep === 5 ? 'checkout-step-tracker-hidden' : ''}`}>
        <div className="step-tracker-container">
          <div className="step-track-line"></div>
          
          <div className={`step-node ${currentStep >= 1 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
            <span className="step-label">{t('bookingFlow:stepHealthConcern')}</span>
          </div>

          <div className={`step-node ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
            <span className="step-label">{t('bookingFlow:stepSelectDoctor')}</span>
          </div>

          <div className={`step-node ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
            <span className="step-label">{t('bookingFlow:stepChooseSlot')}</span>
          </div>

          <div className={`step-node ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-number">{currentStep > 4 ? '✓' : '4'}</div>
            <span className="step-label">{t('patient:step4Title')}</span>
          </div>

          <div className={`step-node ${currentStep >= 5 ? 'active' : ''}`}>
            <div className="step-number">{bookingConfirmed ? '✓' : '5'}</div>
            <span className="step-label">{t('bookingFlow:stepConfirmPay')}</span>
          </div>
        </div>
      </div>

      {/* Main Booking Content Body */}
      <main className="booking-main-container">
        {/* Top Back Action Bar - Easy navigation at the top */}
        {!bookingConfirmed && currentStep !== 5 && (
          <div className="booking-top-back-bar">
            {currentStep > 1 && (
              <button 
                type="button" 
                className="btn-top-back"
                onClick={handlePrevStep}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>{t('bookingFlow:backToStep', { step: currentStep - 1 })}</span>
              </button>
            )}

            <div className="booking-top-breadcrumbs">
              <button type="button" className="crumb-btn" onClick={() => navigate('/')}>
                {t('common:home')}
              </button>
              <span className="crumb-slash">/</span>
              <span className="crumb-active">{t('bookingFlow:breadcrumbTitle')}</span>
            </div>
          </div>
        )}
        {bookingConfirmed ? (
          /* Confirmation Ticket Screen */
          <div className="booking-confirmation-card">
            <div className="confirmation-success-icon">✓</div>
            <h2>{t('bookingFlow:appointmentConfirmed')}</h2>
            <p className="confirmation-sub">{t('bookingFlow:appointmentScheduled')}</p>
            
            <div className="confirmation-ticket">
              <div className="ticket-header">
                <div>
                  <span className="ticket-id">{t('bookingFlow:ticketBookingId')}{createdAppointment?.id || '—'}</span>
                  <h3 className="ticket-doctor-name">{formData.selectedDoctor?.name}</h3>
                  <span className="ticket-specialty">{formData.selectedDoctor?.specialty}</span>
                </div>
                <div className="ticket-badge">{consultModeDisplay(formData.consultMode)}</div>
              </div>

              <div className="ticket-details-grid">
                <div>
                  <span className="detail-label">{t('appointment:date')}</span>
                  <span className="detail-val">{formatBookingDate(createdAppointment, formData.selectedDate, formData.selectedTimeSlot)}</span>
                </div>
                <div>
                  <span className="detail-label">{t('appointment:detailTicket.patientName')}</span>
                  <span className="detail-val">{formData.patientName}</span>
                </div>
                <div>
                  <span className="detail-label">{t('appointment:detailTicket.ageGender')}</span>
                  <span className="detail-val">{formData.patientAge} {t('appointment:detailTicket.yrs')}, {formData.patientGender}</span>
                </div>
                <div>
                  <span className="detail-label">{t('appointment:detailTicket.vitals')}</span>
                  <span className="detail-val">{formData.patientHeight} cm, {formData.patientWeight} kg{formData.patientBloodGroup ? ` (${formData.patientBloodGroup})` : ''}</span>
                </div>
                <div>
                  <span className="detail-label">{t('appointment:consultationType')}</span>
                  <span className="detail-val">{consultModeDisplay(formData.consultMode)}</span>
                </div>
                <div>
                  <span className="detail-label">{paymentReceipt ? t('appointment:detailTicket.feePaid') : 'Consultation fee'}</span>
                  <span className="detail-val">₹{paymentReceipt ? (paymentReceipt.amount / 100).toLocaleString('en-IN') : formData.selectedDoctor?.fee?.replace(/\D/g, '') || '0'}</span>
                </div>
              </div>
            </div>

            {paymentReceipt && (
              <div className="confirmation-ticket payment-receipt-card">
                <div className="ticket-header">
                  <div>
                    <span className="ticket-id">Payment receipt</span>
                    <h3 className="ticket-doctor-name">{paymentReceipt.receiptNumber}</h3>
                  </div>
                  <div className="ticket-badge">PAID</div>
                </div>
                <div className="ticket-details-grid">
                  <div>
                    <span className="detail-label">Amount paid</span>
                    <span className="detail-val">₹{(paymentReceipt.amount / 100).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="detail-label">Paid on</span>
                    <span className="detail-val">{new Date(paymentReceipt.paidAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="detail-label">Payment ID</span>
                    <span className="detail-val">{paymentReceipt.razorpayPaymentId}</span>
                  </div>
                  <div>
                    <span className="detail-label">Order ID</span>
                    <span className="detail-val">{paymentReceipt.razorpayOrderId}</span>
                  </div>
                </div>
                <button type="button" className="btn-secondary-outline" onClick={() => window.print()}>
                  Print receipt
                </button>
              </div>
            )}

            <div className="confirmation-actions">
              <button 
                type="button" 
                className="btn-primary-orange"
                onClick={() => navigate('/')}
              >
                {t('patient:returnToHome')}
              </button>
            </div>
          </div>
        ) : (
          <div className={`booking-grid-wrapper ${currentStep === 5 ? 'checkout-grid' : ''}`}>
            {/* Left Column: Form Questionnaire Card */}
            <div className={`booking-form-card ${currentStep === 5 ? 'checkout-form-card' : ''}`}>
              {currentStep === 1 && (
                <>
                  {/* Title Header with Date Badge */}
                  <div className="form-card-header-v2">
                    <div className="header-left-group">
                      <div>
                        <h1 className="form-main-title">{t('patient:whatBringsYou')}</h1>
                        <p className="form-main-subtitle">{t('patient:matchYouWith')}</p>
                      </div>
                    </div>

                    <div className="header-date-badge">
                      <div className="date-icon-box">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </div>
                      <div className="date-text-wrap">
                        <span className="date-sub-label">{t('appointment:date')}</span>
                        <span className="date-val-text">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Q1: What symptoms are you experiencing? */}
                  <div className="form-question-block">
                    <label className="question-label">{t('patient:symptoms')}</label>
                    <div className="symptom-search-bar-v2">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94A3B8" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                      </svg>
                      <input 
                        type="text" 
                        placeholder={t('patient:searchSymptoms')}
                        value={symptomSearch}
                        onChange={(e) => setSymptomSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (symptomSearch.trim()) {
                              const val = symptomSearch.trim();
                              const formatted = val.charAt(0).toUpperCase() + val.slice(1);
                              if (!formData.symptoms.includes(formatted)) {
                                setFormData(prev => ({ ...prev, symptoms: [...prev.symptoms, formatted] }));
                              }
                              setSymptomSearch('');
                            }
                          }
                        }}
                      />
                    </div>

                    {symptomSearch.trim() && !formData.symptoms.includes(symptomSearch.trim()) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          onClick={() => {
                            const val = symptomSearch.trim();
                            const formatted = val.charAt(0).toUpperCase() + val.slice(1);
                            if (!formData.symptoms.includes(formatted)) {
                              setFormData(prev => ({ ...prev, symptoms: [...prev.symptoms, formatted] }));
                            }
                            setSymptomSearch('');
                          }}
                        >
                          <span>➕ Add "{symptomSearch.trim()}"</span>
                        </button>
                      </div>
                    )}

                    {/* Popular Symptoms */}
                    <div className="symptom-subsection">
                      <span className="subsection-label">{t('patient:popularSymptoms')}</span>
                      <div className="popular-symptoms-grid">
                        {[
                          { name: 'Fever' },
                          { name: 'Cough' },
                          { name: 'Headache' },
                          { name: 'Fatigue' },
                          { name: 'Sore Throat' },
                        ].map(item => {
                          const isSelected = formData.symptoms.includes(item.name);
                          return (
                            <button
                              key={item.name}
                              type="button"
                              className={`popular-symptom-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleSymptom(item.name)}
                            >
                              <span className="popular-name">{item.name}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="btn-more-symptoms-pill"
                          onClick={() => setShowMoreSymptoms(!showMoreSymptoms)}
                        >
                          {showMoreSymptoms ? t('patient:showLess') : t('patient:showMore')}
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
                      </div>
                    )}

                    {/* Selected Symptoms tags */}
                    {formData.symptoms.length > 0 && (
                      <div className="symptom-subsection" style={{ marginTop: '16px' }}>
                        <span className="subsection-label">{t('patient:selectedSymptoms', { count: formData.symptoms.length })}</span>
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
                     <label className="question-label">{t('patient:howLong')}</label>
                    <div className="custom-dropdown-container">
                      <button
                        type="button"
                        className={`custom-dropdown-trigger ${isDurationDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                      >
                        <div className="trigger-left">
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
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {isDurationDropdownOpen && (
                        <div className="custom-dropdown-menu">
                           {[
                             { key: 'lessThanDay', labelKey: 'lessThanDay', subKey: 'recentOnset' },
                             { key: 'days1to3', labelKey: '1to3Days', subKey: 'aboutAWeek' },
                             { key: 'days4to7', labelKey: '4to7Days', subKey: 'aboutAWeek' },
                             { key: 'weeks1to3', labelKey: '1to3Weeks', subKey: 'ongoing' },
                             { key: 'moreThanMonth', labelKey: 'moreThanMonth', subKey: 'persistent' },
                           ].map(opt => {
                             const isSelected = formData.duration === opt.key;
                             return (
                               <div
                                 key={opt.key}
                                 className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                                 onClick={() => {
                                   setFormData({ ...formData, duration: opt.key });
                                   setIsDurationDropdownOpen(false);
                                 }}
                               >
                                 <div className="item-text-group">
                                   <span className="item-main-label">{t(`patient:durationOptions.${opt.labelKey}`)}</span>
                                   <span className="item-sub-label">{t(`patient:durationOptions.${opt.subKey}`)}</span>
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
                    <label className="question-label">{t('patient:whenSeeDoctor')}</label>
                    <div className="urgency-radio-grid">
                      {['today', 'tomorrow', 'week', 'flexible'].map(u => {
                        const isSelected = formData.urgency === u;
                        return (
                          <button
                            key={u}
                            type="button"
                            className={`urgency-radio-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, urgency: u })}
                          >
                            <span className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                            <span className="urgency-label">{t(`patient:urgencyOptions.${u === 'week' ? 'thisWeek' : u}`)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Q4: Additional Details */}
                  <div className="form-question-block">
                    <label className="question-label">{t('patient:followUpReminders')}</label>
                    <button
                      type="button"
                      className={`urgency-radio-card ${formData.isFollowUp ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, isFollowUp: !formData.isFollowUp, emailRemindersEnabled: true })}
                    >
                      <span className={`radio-dot ${formData.isFollowUp ? 'checked' : ''}`} />
                      <span className="urgency-label">{t('patient:isFollowUp')}</span>
                    </button>
                    {formData.isFollowUp && (
                      <p className="mt-2 text-xs text-blue-700">{t('patient:followUpEmail')}</p>
                    )}
                  </div>

                  {/* Q4: Additional Details */}
                  <div className="form-question-block">
                    <label className="question-label">{t('patient:additionalDetails')}</label>
                    <div className="relative w-full rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <div className="flex items-start gap-3 w-full">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94A3B8" strokeWidth="2" className="mt-1 shrink-0">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <textarea
                          rows={3}
                          maxLength={500}
                          className="w-full bg-transparent border-none outline-none text-slate-800 text-sm sm:text-base leading-relaxed placeholder:text-slate-400 p-0 resize-none"
                          placeholder={t('forms:notesPlaceholder')}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>
                      <span className="absolute bottom-2.5 right-3.5 text-xs text-slate-400 font-medium">{formData.notes.length}{t('patient:charCount')}</span>
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
                      title={t('common:back')}
                    >
                      ‹
                    </button>
                    <div>
                      <h1 className="form-main-title">{t('patient:selectDoctor')}</h1>
                      <p className="form-main-subtitle">{t('patient:chooseFrom')}</p>
                    </div>
                  </div>

                  {/* Step 2 Search & Filter Row */}
                  <div className="step2-search-filter-block">
                    <div className="step2-search-row">
                      <div className="step2-search-input-wrap">
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" width="18" height="18">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <input
                          type="text"
                          placeholder={t('patient:searchDoctor')}
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
                        {showAllSpecialties ? t('patient:showLess') : t('patient:showMore')}
                      </button>
                    </div>
                  </div>
                  
                  {/* AI Recommendation Banner */}
                  {aiRecommendation && (
                    <div className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            ✨ {t('patient:aiRecommended')}
                          </span>
                          <span className="font-semibold text-blue-950 text-sm">
                            {aiRecommendation.recommendedCategory}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          {aiRecommendation.reason || `${t('patient:topMatch')}: ${formData.symptoms.join(', ')}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Doctor Cards Horizontal Rows List */}
                  <div className="step2-doctors-list">
                    {(() => {
                      const docsToRender = (formData.symptoms.length === 0 || showAllDoctors || filteredStep2Doctors.length === 0)
                        ? (filteredStep2Doctors.length > 0 ? filteredStep2Doctors : allDoctorsList)
                        : filteredStep2Doctors;
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
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                              </div>
                              <p className="doc-spec-exp">{doc.specialty} • {doc.experience}</p>
                              <p className="doc-hosp-loc">{doc.hospital}, {doc.location}</p>
                              {doc.degrees && <p className="doc-degrees">{doc.degrees}</p>}

                            </div>

                            <div className="step2-doc-right-action">
                              <div className="doc-avail-status">
                                <span className={`status-dot ${doc.availableToday ? 'available' : 'tomorrow'}`}></span>
                                <span className="status-text">{doc.availableToday ? t('patient:availableToday') : t('patient:availableTomorrow')}</span>
                              </div>
                              <span className="doc-consult-type">{consultModeDisplay(formData.consultMode)}</span>
                              <span className="doc-fee-price">₹{doc.fee.replace(/\D/g, '')} {t('patient:consultationFee')}</span>

                              <button 
                                type="button" 
                                className={`btn-step2-select ${isSelected ? 'selected' : ''}`}
                              >
                                {isSelected ? `${t('patient:selected')} ✓` : t('buttons:viewProfile')}
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
                        <span>🔍 {t('patient:viewOther')} ({filteredStep2Doctors.length - 1} {t('patient:moreSpecialists')})</span>
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
                const activeDayObj = upcomingDaysWithSlots.find(d => formData.selectedDate.includes(d.dateNum) && !d.isNoSlotsLeft)
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
                    <h2 className="form-main-title">{t('appointment:selectSlot')}</h2>
                    <p className="form-main-subtitle">
                      Select a date and time slot for <span className="doc-highlight-name">{formData.selectedDoctor?.name || 'Dr. Sarah Jenkins'}</span>
                    </p>

                    {/* Section 1: Select Date Carousel */}
                    <div className="slot-section-block">
                      <div className="slot-section-header">
                        <h3 className="section-title">{t('patient:selectDate')}</h3>
                      </div>

                      <div className="date-carousel-wrapper">
                        <div className="date-cards-row">
                          {upcomingDaysWithSlots.map((d) => {
                            const isSelected = activeDayObj.fullDate === d.fullDate;
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
                                  setFormData({ ...formData, selectedDate: d.fullDate, selectedTimeSlot: '' });
                                }}
                              >
                                <span className="date-card-tag">{isNoSlots ? t('patient:noSlots') : d.label === 'Today' ? t('patient:relativeDate.today') : d.label === 'Tomorrow' ? t('patient:relativeDate.tomorrow') : d.label}</span>
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
                          {t('patient:availableTimeSlots', { day: activeDayObj.label, date: activeDayObj.dateNum })}
                          {doctorAvailability?.slotDurationMinutes && (
                            <span className="text-xs text-gray-500 font-normal ml-2">({doctorAvailability.slotDurationMinutes}-min slots)</span>
                          )}
                        </h3>
                      </div>

                      {activeDayObj.label === 'Today' && activeSlotsCount > 0 && (
                        <p className="text-xs text-blue-700 mb-3">
                          {t('patient:todaySlotsInfo')}
                        </p>
                      )}
                      {slotError && <p role="alert" className="text-sm text-red-600 mb-3">{slotError}</p>}

                      {loadingAvailability ? (
                        <div className="py-8 text-center text-gray-500 font-medium">{t('errors:loadingDoctorAvailability')}</div>
                      ) : isDoctorOnLeave ? (
                        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center font-medium">
                          ⚠️ {formData.selectedDoctor?.name} {t('patient:onLeave')}
                        </div>
                      ) : activeSlotsCount === 0 ? (
                        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-center font-medium">
                          🚫 {formData.selectedDoctor?.name} {t('patient:noSlotsLeft')} {activeDayObj.dayFull}s ({activeDayObj.dateNum}). {t('patient:pleaseSelectAlternate')}
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
                                  setFormData({ ...formData, selectedDate: activeDayObj.fullDate, selectedTimeSlot: slot });
                                }}
                              >
                                <span>{slot}</span>
          {isBooked && <span className="slot-booked-label">{t('patient:slotBooked')}</span>}
          {isPast && !isBooked && <span className="slot-booked-label" style={{ color: '#94A3B8' }}>{t('patient:slotPast')}</span>}
                                {isSelected && !isUnavailable && <span className="slot-check-icon">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Patient Info */}
              {currentStep === 4 && (
                <div className="step-4-wrapper">
                  <h2 className="form-main-title">{t('patient:patientDetails')}</h2>
                  <p className="form-main-subtitle">{t('patient:enterDetails')}</p>

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
                      <label className="field-label">{t('patient:fullName')} <span style={{ color: '#EF4444' }}>*</span></label>
                      <input 
                        type="text" 
                        className="form-control-input"
                        placeholder={t('forms:fullNamePlaceholder')}
                        value={formData.patientName} 
                        onChange={(e) => {
                          setStep4Error('');
                          handleNameChange(e.target.value);
                        }}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="field-label">{t('patient:age')} <span style={{ color: '#EF4444' }}>*</span></label>
                      <input 
                        type="text" 
                        className="form-control-input"
                        placeholder={t('patient:e.g.28')}
                        value={formData.patientAge} 
                        onChange={(e) => {
                          setStep4Error('');
                          handleAgeChange(e.target.value);
                        }}
                      />
                    </div>

                    <div className="input-field-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                        <label className="field-label" style={{ margin: 0, width: 'auto', textAlign: 'left' }}>{t('patient:height')} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>{t('forms:optional')}</span></label>
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
                          >{t('patient:ftIn')}</button>
                        </div>
                      </div>
                      
                      {heightUnit === 'cm' ? (
                        <input 
                          type="text" 
                          className="form-control-input"
                          placeholder=""
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
                            placeholder=""
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
                            placeholder=""
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                         <label className="field-label" style={{ margin: 0, width: 'auto', textAlign: 'left' }}>{t('forms:weight')} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>{t('forms:optional')}</span></label>
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
                                                     >{t('patient:kg')}</button>
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
                                                     >{t('patient:lbs')}</button>
                        </div>
                      </div>
                      
                      {weightUnit === 'kg' ? (
                        <input 
                          type="text" 
                          className="form-control-input"
                          placeholder=""
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
                          placeholder=""
                          value={weightLbs} 
                          onChange={(e) => {
                            setStep4Error('');
                            handleLbsChange(e.target.value);
                          }}
                        />
                      )}
                    </div>

                    <div className="input-field-group">
                       <label className="field-label">{t('forms:bloodGroup')} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.82rem' }}>{t('forms:optional')}</span></label>
                      <select 
                        className="form-control-input"
                        value={formData.patientBloodGroup}
                        onChange={(e) => setFormData({ ...formData, patientBloodGroup: e.target.value })}
                      >
                        <option value="">{t('forms:selectBloodGroup')}</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="Unknown">{t('forms:bloodGroupUnknown')}</option>
                      </select>
                    </div>

                    <div className="input-field-group">
                       <label className="field-label">{t('forms:phone')} <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                          type="text"
                          className="form-control-input"
                         placeholder={t('forms:phonePlaceholder')}
                        value={formData.patientPhone} 
                        onChange={(e) => {
                          setStep4Error('');
                          handlePhoneChange(e.target.value);
                        }}
                      />
                    </div>

                    <div className="input-field-group full-width-field">
                       <label className="field-label">{t('forms:gender')}</label>
                      <div className="gender-selector-row">
                           {[{ id: 'Female' }, { id: 'Male' }, { id: 'Other' }].map((g) => {
                           const isSelected = formData.patientGender === g.id;
                           return (
                             <button
                               key={g.id}
                               type="button"
                               className={`gender-option-card ${isSelected ? 'selected' : ''}`}
                               onClick={() => setFormData({ ...formData, patientGender: g.id })}
                             >
                               <span className="gender-card-label">{t(`patient:${g.id.toLowerCase()}`)}</span>
                               {isSelected && <span className="gender-card-check">✓</span>}
                             </button>
                           );
                         })}
                      </div>
                    </div>

                    <div className="input-field-group full-width-field">
                       <label className="field-label">{t('forms:emailOptional')}</label>
                        <input
                          type="email"
                          className="form-control-input"
                         placeholder={t('forms:emailOptionalPlaceholder')}
                        value={formData.patientEmail} 
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Confirm & Pay */}
              {currentStep === 5 && (
                <div className="step-5-wrapper checkout-content">
                  <div className="checkout-main-col">
                    <div className="checkout-heading">
                      <span className="checkout-eyebrow">{t('bookingFlow:breadcrumbTitle')}</span>
                      <h1>{t('bookingFlow:stepConfirmPay')}</h1>
                      <p>Please review the details below before proceeding to payment.</p>
                    </div>

                    <div className="checkout-section-heading">
                      <div>
                        <h2>{t('patient:appointmentDetails')}</h2>
                        <p>Make sure everything looks right before you continue.</p>
                      </div>
                      <button type="button" className="btn-edit-appointment" onClick={() => setCurrentStep(1)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {t('patient:edit')}
                      </button>
                    </div>

                    <div className="checkout-details-list">
                      <div className="checkout-detail-row">
                        <div className="checkout-detail-content">
                          <span className="checkout-detail-label">{t('patient:healthConcern')}</span>
                          <strong>{formData.healthConcern === 'specific-symptoms' ? t('patient:specificSymptoms') : t('patient:other')}</strong>
                          <span>{formData.symptoms.length > 0 ? formData.symptoms.join(', ') : t('patient:generalHealthQuery')}</span>
                        </div>
                      </div>

                      <div className="checkout-detail-row">
                        <div className="checkout-detail-content">
                          <span className="checkout-detail-label">{t('patient:doctor')}</span>
                          <strong>{formData.selectedDoctor?.name || t('patient:noDoctorSelected')}</strong>
                          <span>{formData.selectedDoctor?.specialty || t('patient:defaultSpecialty')} • {formData.selectedDoctor?.experience || t('patient:defaultExperience')}</span>
                        </div>
                        {formData.selectedDoctor?.imageUrl && (
                          <img
                            src={formData.selectedDoctor.imageUrl}
                            alt={formData.selectedDoctor.name}
                            className="checkout-doctor-avatar"
                            loading="lazy"
                            onError={handleImageError}
                          />
                        )}
                      </div>

                      <div className="checkout-detail-row checkout-date-row">
                        <div className="checkout-detail-content">
                          <span className="checkout-detail-label">{t('appointment:date')}</span>
                          <strong>{formatBookingDate(createdAppointment, formData.selectedDate, formData.selectedTimeSlot) || t('patient:defaultDate')}</strong>
                          <span className="checkout-time-value">{formData.selectedTimeSlot || t('patient:defaultTime')}</span>
                        </div>
                        <a
                          href={getCalendarUrl() || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-add-calendar"
                          onClick={handleAddToCalendar}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          {t('patient:addToCalendar')}
                        </a>
                      </div>

                      <div className="checkout-detail-row">
                        <div className="checkout-detail-content">
                          <span className="checkout-detail-label">{t('appointment:consultationType')}</span>
                          <strong>{consultModeDisplay(formData.consultMode)}</strong>
                          <span>{formData.consultMode === 'Video Consultation' ? 'Live video consultation' : formData.consultMode === 'In-Person Visit' ? 'In-person consultation' : 'Secure chat consultation'}</span>
                        </div>
                      </div>

                      <div className="checkout-detail-row">
                        <div className="checkout-detail-content">
                          <span className="checkout-detail-label">{t('patient:patientAndVitalsTitle')}</span>
                          <strong>{formData.patientName}, {formData.patientAge} {t('appointment:detailTicket.yrs')}, {formData.patientGender}</strong>
                          <span>{t('patient:height')}: {formData.patientHeight || '--'} cm • {t('patient:weight')}: {formData.patientWeight || '--'} kg{formData.patientBloodGroup ? ` • ${t('patient:bloodGroup')} ${formData.patientBloodGroup}` : ''}</span>
                          <span>{formData.patientPhone}{formData.patientEmail ? ` • ${formData.patientEmail}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="checkout-sidebar-col">
                    <div className="checkout-payment-summary">
                      <div className="checkout-payment-heading">
                        <div>
                          <span className="checkout-eyebrow">Secure checkout</span>
                          <h2>{t('patient:paymentSummary')}</h2>
                        </div>
                        <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <rect x="4" y="10" width="16" height="11" rx="2" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </div>
                      <div className="checkout-payment-row">
                        <span>{t('patient:consultationFeeLabel')}</span>
                        <strong>₹{formatFeeAmount(formData.selectedDoctor?.fee)}</strong>
                      </div>
                      <div className="checkout-payment-divider" />
                      <div className="checkout-payment-row checkout-total-row">
                        <strong>{t('patient:totalPayable')}</strong>
                        <strong>₹{formatFeeAmount(formData.selectedDoctor?.fee)}</strong>
                      </div>
                    </div>

                    <div className="checkout-legal-notice">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <p>By proceeding, you agree to our <a href="/about">Terms &amp; Conditions</a> and <a href="/about">Privacy Policy</a>.</p>
                    </div>

                    <div className="checkout-support-row">
                      <span>{t('patient:secureCheckout')} · {t('patient:sslEncrypted')}</span>
                      <button type="button" onClick={() => setShowHelpModal(true)}>{t('patient:chatWithUs')}</button>
                    </div>

                    <div className="checkout-action-row">
                      <button type="button" className="checkout-back-button" onClick={handlePrevStep}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        {t('common:back')}
                      </button>
                      <PayButton
                        appointmentId={createdAppointment?.id || ''}
                        patientName={formData.patientName}
                        patientEmail={formData.patientEmail}
                        amountLabel={formatFeeAmount(formData.selectedDoctor?.fee)}
                        buttonLabel={`Proceed to Pay ₹${formatFeeAmount(formData.selectedDoctor?.fee)}`}
                        buttonClassName="checkout-pay-button"
                        onSuccess={(receipt) => {
                          setPaymentReceipt(receipt);
                          setBookingConfirmed(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep !== 5 && (
                <>
                  {/* Card Footer Actions */}
                  <div className="form-card-footer">
                    <button 
                      type="button" 
                      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 font-bold text-base sm:text-lg flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
                      onClick={handlePrevStep}
                    >
                      ← {t('common:back')}
                    </button>

                    <button
                      type="button"
                      className="btn-form-next-orange"
                      onClick={handleNextStep}
                      disabled={isSubmitting}
                    >
                      {currentStep === 1 && (hasPreselectedDoctor && formData.selectedDoctor ? t('patient:nextStepChooseSlot') : t('patient:nextStep'))}
                      {currentStep === 2 && t('patient:nextStepChooseSlot')}
                      {currentStep === 3 && t('patient:nextStepPatientInfo')}
                      {currentStep === 4 && t('patient:nextStepConfirm')}
                    </button>
                  </div>
                </>
              )}


            </div>

            {currentStep !== 5 && (
              <div className="booking-summary-sidebar">
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
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                        <p className="sidebar-doc-spec">{formData.selectedDoctor.specialty}</p>
                        <p className="sidebar-doc-exp">{formData.selectedDoctor.experience}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card 3: Need Help Box with Chatbot Trigger (Updated Proportions & Image 2 Icon) */}
                <div className="w-full rounded-[24px] sm:rounded-[28px] border border-slate-200/90 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_12px_35px_rgba(0,0,0,0.06)] flex flex-col items-center gap-5 sm:gap-6 my-4 transition-all duration-300">
                  {/* Top: Larger Dashed Need Help Card */}
                  <div 
                    className="w-full rounded-[20px] border-2 border-dashed border-slate-300/90 bg-[#FAFBFD] p-5 sm:p-6 shadow-2xs transition-all duration-300 hover:border-orange-400 hover:bg-orange-50/40 cursor-pointer text-left"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-sehatsetu-chatbot'))}
                  >
                    <h5 className="text-lg sm:text-xl font-extrabold text-[#991B1B] mb-2 tracking-tight">
                      {t('patient:needHelp')}
                    </h5>
                    <p className="text-sm sm:text-[14.5px] leading-relaxed text-slate-600 font-medium">
                      {t('patient:supportOnline')}
                    </p>
                  </div>

                  {/* Bottom: Decreased / Sleeker Blue HELP Pill Button with Image 2 Icon */}
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-sehatsetu-chatbot'))}
                    className="w-full py-2.5 sm:py-3 px-6 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/25 transition-all duration-300 cursor-pointer border-none max-w-[85%] mx-auto"
                  >
                    <svg className="w-6.5 h-6.5 sm:w-7 sm:h-7 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M12 2.2L2.5 9.8C2.1 10.1 2.3 10.8 2.9 10.8H4.5V17.5C4.5 19.7 6.3 21.5 8.5 21.5H15.5C17.7 21.5 19.5 19.7 19.5 17.5V10.8H21.1C21.7 10.8 21.9 10.1 21.5 9.8L12 2.2Z" 
                        fill="white" 
                      />
                      <path 
                        d="M12 8.8V16.2M8.3 12.5H15.7" 
                        stroke="#2563EB" 
                        strokeWidth="3.2" 
                        strokeLinecap="round" 
                      />
                    </svg>
                    <span className="tracking-wide uppercase font-extrabold text-white">HELP</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="booking-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="booking-modal-card" onClick={e => e.stopPropagation()}>
            <h3>{t('patient:helpBooking')}</h3>
            <p>{t('patient:supportOnline')}</p>
            <div className="help-contact-buttons">
              <a href="tel:108" className="btn-primary-orange">{t('patient:callSupport')}</a>
              <button type="button" className="btn-secondary-outline" onClick={() => setShowHelpModal(false)}>
                {t('buttons:close')}
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
