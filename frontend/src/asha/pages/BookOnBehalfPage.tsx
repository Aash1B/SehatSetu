import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Search,
  UserPlus,
  Video,
  Building,
  Check,
} from 'lucide-react';
import AshaSidebar from '../components/AshaSidebar';
import AshaNavbar from '../components/AshaNavbar';
import {
  fetchCaseloadPatients,
  createAshaAppointment,
  type CaseloadPatientItem,
  type AshaCreateAppointmentPayload,
} from '../services/ashaApi';
import { fetchDoctors } from '../../patient/services/doctorApi';
import type { Doctor } from '../../patient/data/doctorsData';

const DEFAULT_TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
];

const COMMON_SYMPTOMS = [
  'Fever',
  'Cough',
  'Headache',
  'Chest Pain',
  'Shortness of Breath',
  'Abdominal Pain',
  'Vomiting',
  'Fatigue',
  'Joint Pain',
  'Skin Rash',
  'High Blood Pressure',
  'Dizziness',
];

export default function BookOnBehalfPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('asha');

  const preselectedPatientId = searchParams.get('patientId') || '';

  // Wizard state (Steps 1 to 5)
  const [currentStep, setCurrentStep] = useState(preselectedPatientId ? 2 : 1);

  // Data states
  const [caseloadPatients, setCaseloadPatients] = useState<CaseloadPatientItem[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<CaseloadPatientItem | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:00 AM');

  const [consultMode, setConsultMode] = useState<'In-Person Visit' | 'Video Consultation'>('In-Person Visit');
  const [healthConcern, setHealthConcern] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Emergency'>('Mild');

  const [paymentStatus, setPaymentStatus] = useState<'CASH_PENDING' | 'WAIVED'>('CASH_PENDING');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [createdAppt, setCreatedAppt] = useState<any>(null);

  useEffect(() => {
    // Load caseload & doctors
    fetchCaseloadPatients().then((list) => {
      setCaseloadPatients(list);
      if (preselectedPatientId) {
        const found = list.find((p) => p.id === preselectedPatientId);
        if (found) {
          setSelectedPatient(found);
          setCurrentStep(2);
        }
      }
    });

    fetchDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, [preselectedPatientId]);

  const toggleSymptom = (sym: string) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter((s) => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  const filteredPatients = caseloadPatients.filter((p) => {
    if (!patientSearch) return true;
    const q = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.village.toLowerCase().includes(q);
  });

  const filteredDoctors = doctors.filter((doc) => {
    if (!doctorSearch) return true;
    const q = doctorSearch.toLowerCase();
    return doc.name.toLowerCase().includes(q) || doc.specialty.toLowerCase().includes(q);
  });

  const handleConfirmBooking = async () => {
    if (!selectedPatient || !selectedDoctor) {
      setError('Please select both a patient and a doctor');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: AshaCreateAppointmentPayload = {
        patientId: selectedPatient.id,
        doctorId: selectedDoctor.id,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        consultMode,
        healthConcern,
        symptoms,
        severity,
        paymentStatus,
      };

      const res = await createAshaAppointment(payload);
      setCreatedAppt(res.appointment);
      setBookingConfirmed(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      <AshaSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AshaNavbar title={t('book.title')} />

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-3xl w-full mx-auto safe-area-pb">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/asha/dashboard'))}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition border-none bg-transparent cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {t('book.title')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {t('book.subtitle')}
                </p>
              </div>
            </div>
          </div>

          {bookingConfirmed ? (
            /* ─── Booking Confirmation Screen ────────────────────────────── */
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-200 text-center space-y-5 shadow-sm animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Appointment Booked Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                {t('book.bookedSuccess', {
                  patientName: createdAppt?.patientName || selectedPatient?.name,
                  doctorName: createdAppt?.doctorName || selectedDoctor?.name,
                  date: createdAppt?.date || selectedDate,
                  timeSlot: createdAppt?.timeSlot || selectedTimeSlot,
                })}
              </p>

              <div className="p-4 bg-emerald-50 rounded-2xl text-xs sm:text-sm text-emerald-900 font-semibold max-w-md mx-auto border border-emerald-100">
                <span>Payment Status: </span>
                <span className="font-bold underline">{createdAppt?.paymentStatus || paymentStatus}</span>
                <p className="text-xs text-emerald-700 font-normal mt-1">
                  {t('book.paymentNote')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/asha/patients')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition border-none cursor-pointer shadow-xs min-h-[48px]"
                >
                  Return to Caseload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingConfirmed(false);
                    setSelectedPatient(null);
                    setCurrentStep(1);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition border-none cursor-pointer min-h-[48px]"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
              {/* Wizard Step Progress Bar */}
              <div className="grid grid-cols-5 gap-1.5 pb-2 border-b border-slate-100">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      s <= currentStep ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* ─── STEP 1: Patient Selection ────────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {t('book.step1Patient')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/asha/patients/new')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline border-none bg-transparent cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('book.orRegisterNew')}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder={t('book.searchPatientLabel')}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                    />
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setCurrentStep(2);
                          }}
                          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                            selectedPatient?.id === p.id ? 'bg-emerald-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                            <p className="text-xs text-slate-500">
                              {p.village} • {p.phone}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                        <p>No matching patient found in your caseload.</p>
                        <button
                          type="button"
                          onClick={() => navigate('/asha/patients/new')}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold border-none cursor-pointer"
                        >
                          + Register New Patient
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── STEP 2: Doctor Selection ─────────────────────────────── */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {selectedPatient && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-emerald-900">Patient: </span>
                        <span className="font-bold text-slate-900">{selectedPatient.name}</span>
                        <span className="text-slate-500"> ({selectedPatient.village})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-emerald-700 font-bold underline cursor-pointer border-none bg-transparent"
                      >
                        {t('book.changePatient')}
                      </button>
                    </div>
                  )}

                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {t('book.step2Doctor')}
                  </h3>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      placeholder="Search doctor or specialty..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                    />
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {filteredDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setCurrentStep(3);
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          selectedDoctor?.id === doc.id
                            ? 'border-emerald-600 bg-emerald-50'
                            : 'border-slate-200 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={doc.imageUrl || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100'}
                            alt={doc.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{doc.name}</p>
                            <p className="text-xs text-emerald-700 font-semibold">{doc.specialty}</p>
                            <p className="text-[11px] text-slate-400">{doc.hospital || 'SehatSetu Network'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900">{doc.fee || '₹500'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── STEP 3: Date & Slot Selection ────────────────────────── */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {t('book.step3Slot')}
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Available Time Slot
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {DEFAULT_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition min-h-[44px] border-none cursor-pointer ${
                            selectedTimeSlot === slot
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="w-full py-3.5 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-sm transition border-none cursor-pointer mt-4 min-h-[48px]"
                  >
                    Continue to Symptoms & Triage →
                  </button>
                </div>
              )}

              {/* ─── STEP 4: Symptoms & Triage ────────────────────────────── */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {t('book.step4Triage')}
                  </h3>

                  {/* Mode selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t('book.consultMode')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConsultMode('In-Person Visit')}
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition min-h-[48px] border-none cursor-pointer ${
                          consultMode === 'In-Person Visit'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Building className="w-4 h-4 shrink-0" />
                        <span>{t('book.inPerson')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConsultMode('Video Consultation')}
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition min-h-[48px] border-none cursor-pointer ${
                          consultMode === 'Video Consultation'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Video className="w-4 h-4 shrink-0" />
                        <span>{t('book.video')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Health Concern */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t('book.healthConcern')}
                    </label>
                    <input
                      type="text"
                      value={healthConcern}
                      onChange={(e) => setHealthConcern(e.target.value)}
                      placeholder={t('book.healthConcernPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                    />
                  </div>

                  {/* Symptoms Multi-Select Chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {t('book.symptoms')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_SYMPTOMS.map((sym) => {
                        const active = symptoms.includes(sym);
                        return (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => toggleSymptom(sym)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer min-h-[38px] ${
                              active
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {sym}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {t('book.severity')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Mild', 'Moderate', 'Severe', 'Emergency'] as const).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setSeverity(sev)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition min-h-[44px] border cursor-pointer ${
                            severity === sev
                              ? sev === 'Emergency'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="w-full py-3.5 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-sm transition border-none cursor-pointer mt-4 min-h-[48px]"
                  >
                    Review & Confirm →
                  </button>
                </div>
              )}

              {/* ─── STEP 5: Confirm & Cash / Waived Payment ─────────────── */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {t('book.step5Confirm')}
                  </h3>

                  {/* Summary Box */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Patient:</span>
                      <span className="font-bold text-slate-900">{selectedPatient?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Doctor:</span>
                      <span className="font-bold text-slate-900">{selectedDoctor?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Date & Slot:</span>
                      <span className="font-bold text-slate-900">{selectedDate} at {selectedTimeSlot}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Consultation:</span>
                      <span className="font-bold text-slate-900">{consultMode}</span>
                    </div>
                    {healthConcern && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Concern:</span>
                        <span className="font-bold text-slate-900">{healthConcern}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Mode options for ASHA field worker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Payment Handling (Sub-Center Quota)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('CASH_PENDING')}
                        className={`p-3 rounded-xl text-xs font-bold transition border min-h-[48px] cursor-pointer ${
                          paymentStatus === 'CASH_PENDING'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Cash at Sub-Center
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentStatus('WAIVED')}
                        className={`p-3 rounded-xl text-xs font-bold transition border min-h-[48px] cursor-pointer ${
                          paymentStatus === 'WAIVED'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Waived (NHM Free Care)
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {t('book.paymentNote')}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="w-full py-4 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-sm sm:text-base transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer border-none min-h-[50px] disabled:opacity-50 mt-4"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{submitting ? t('book.booking') : t('book.confirmButton')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
