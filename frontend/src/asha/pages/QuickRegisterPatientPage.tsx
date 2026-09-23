import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, CalendarPlus, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import AshaSidebar from '../components/AshaSidebar';
import AshaNavbar from '../components/AshaNavbar';
import { quickRegisterPatient, type QuickRegisterPatientPayload } from '../services/ashaApi';
import { getUser } from '../../auth/authStorage';

export default function QuickRegisterPatientPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('asha');
  const storedUser = getUser();

  const [formData, setFormData] = useState<QuickRegisterPatientPayload>({
    fullName: '',
    gender: '',
    phone: '',
    village: storedUser?.ashaWorker?.village || '',
    assignedArea: storedUser?.ashaWorker?.assignedArea || '',
    age: '',
    dateOfBirth: '',
    bloodGroup: '',
    height: '',
    weight: '',
    emergencyContact: '',
    allergies: [],
    chronicConditions: [],
  });

  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingAlert, setExistingAlert] = useState<{ id: string; name: string } | null>(null);

  const handleSubmit = async (andBook = false) => {
    setError('');
    setExistingAlert(null);

    // Validation
    if (!formData.fullName.trim()) {
      setError(t('register.fullName') + ' is required');
      return;
    }
    if (!formData.gender) {
      setError(t('register.gender') + ' is required');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      setError('Please provide a valid 10-digit mobile number');
      return;
    }
    if (!formData.village.trim()) {
      setError(t('register.village') + ' is required');
      return;
    }

    setSubmitting(true);

    try {
      const payload: QuickRegisterPatientPayload = {
        ...formData,
        allergies: allergiesText
          ? allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        chronicConditions: conditionsText
          ? conditionsText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const res = await quickRegisterPatient(payload);

      if (res.isExisting) {
        setExistingAlert({ id: res.patient.id, name: res.patient.name });
        return;
      }

      if (andBook && res.patient?.id) {
        navigate(`/asha/book?patientId=${res.patient.id}`);
      } else {
        navigate('/asha/patients');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      <AshaSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AshaNavbar title={t('register.title')} />

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-2xl w-full mx-auto safe-area-pb">
          {/* Back button & title */}
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/asha/patients')}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition border-none bg-transparent cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Back to caseload"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('register.title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {t('register.subtitle')}
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {existingAlert && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs sm:text-sm font-semibold text-amber-900">
                  {t('register.existingAlert', { name: existingAlert.name })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/asha/book?patientId=${existingAlert.id}`)}
                    className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold border-none cursor-pointer"
                  >
                    Proceed with Existing Patient →
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/asha/patients/${existingAlert.id}`)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold border-none cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            )}

            {/* ─── Required Fields (One-Handed Mobile Optimized) ─────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('register.sectionRequired')}
              </h3>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('register.fullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={t('register.fullNamePlaceholder')}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                />
              </div>

              {/* Gender (Buttons for fast mobile tapping) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('register.gender')} *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Female', 'Male', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition min-h-[48px] border-none cursor-pointer ${
                        formData.gender === g
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {g === 'Female' ? t('register.genderFemale') : g === 'Male' ? t('register.genderMale') : t('register.genderOther')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('register.phone')} *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder={t('register.phonePlaceholder')}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                />
              </div>

              {/* Village & Age row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('register.village')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder={t('register.villagePlaceholder')}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('register.age')}
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder={t('register.agePlaceholder')}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                  />
                </div>
              </div>
            </div>

            {/* ─── Collapsible Optional Clinical Fields ────────────────── */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 border-none bg-transparent cursor-pointer min-h-[44px]"
              >
                <span>{t('register.sectionOptional')}</span>
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showOptional && (
                <div className="space-y-4 pt-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('register.bloodGroup')}
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px] bg-white"
                      >
                        <option value="">Select</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('register.emergencyContact')}
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        placeholder={t('register.emergencyContactPlaceholder')}
                        className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t('register.allergies')}
                    </label>
                    <input
                      type="text"
                      value={allergiesText}
                      onChange={(e) => setAllergiesText(e.target.value)}
                      placeholder={t('register.allergiesPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t('register.chronicConditions')}
                    </label>
                    <input
                      type="text"
                      value={conditionsText}
                      onChange={(e) => setConditionsText(e.target.value)}
                      placeholder={t('register.chronicConditionsPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── Submit Actions (Touch-Friendly Full Width) ──────────── */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className="w-full py-4 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-sm sm:text-base transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer border-none min-h-[50px] disabled:opacity-50"
              >
                <CalendarPlus className="w-5 h-5 shrink-0" />
                <span>{submitting ? t('register.submitting') : t('register.submitAndBook')}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="w-full py-3.5 px-4 rounded-xl text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-semibold text-sm transition border border-emerald-200 flex items-center justify-center gap-2 cursor-pointer min-h-[48px] disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>{t('register.submit')}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
