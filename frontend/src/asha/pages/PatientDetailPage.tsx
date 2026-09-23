import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CalendarPlus,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  FileText,
  Pill,
  User,
  ShieldCheck,
} from 'lucide-react';
import AshaSidebar from '../components/AshaSidebar';
import AshaNavbar from '../components/AshaNavbar';
import { fetchPatientDetail, type PatientDetailData } from '../services/ashaApi';
import { LiquidLoader } from '../../common/components/LiquidLoader';
import ReferralStepperCard from '../../components/ReferralStepperCard';
import { fetchPatientReferrals, updateReferralStatus, type ReferralRecord } from '../../services/referralsApi';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('asha');

  const [patient, setPatient] = useState<PatientDetailData | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'history' | 'prescriptions'>('overview');

  const loadReferrals = (patientId: string) => {
    fetchPatientReferrals(patientId)
      .then(setReferrals)
      .catch((err) => console.warn('Failed loading referrals in ASHA portal', err));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPatientDetail(id)
      .then((p) => {
        setPatient(p);
        if (p?.id) loadReferrals(p.id);
      })
      .catch((err) => setError(err?.message || 'Failed to load patient profile'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReferralUpdate = async (refId: string, newStatus: string, notes?: string, scheduledDate?: string) => {
    try {
      const updated = await updateReferralStatus(refId, {
        status: newStatus,
        followUpNotes: notes,
        scheduledDate,
      });
      setReferrals((prev) => prev.map((r) => (r.id === refId ? updated : r)));
    } catch (e) {
      console.error('Failed to update referral in ASHA portal', e);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      <AshaSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AshaNavbar title={patient?.name || t('patientDetail.title')} />

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-4xl w-full mx-auto space-y-5 safe-area-pb">
          {/* Back button & Action Row */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/asha/patients')}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition border-none bg-transparent cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Back to Caseload"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {patient && (
              <button
                type="button"
                onClick={() => navigate(`/asha/book?patientId=${patient.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition border-none cursor-pointer shadow-xs min-h-[44px]"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>{t('patientDetail.bookVisitButton')}</span>
              </button>
            )}
          </div>

          {loading ? (
            <LiquidLoader fullScreen={false} text="Loading patient record..." />
          ) : error || !patient ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium">
              {error || 'Patient not found'}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Patient Profile Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center shrink-0">
                      {patient.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-snug">
                        {patient.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        {patient.gender && <span>{patient.gender}</span>}
                        {patient.age && <span>• {patient.age} years</span>}
                        {patient.bloodGroup && (
                          <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            {patient.bloodGroup}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {patient.isAshaRegistered && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Field Registered</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Village: <strong>{patient.village || 'Local Area'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Contact: <a href={`tel:${patient.phone}`} className="text-emerald-700 font-bold no-underline">{patient.phone}</a></span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 text-xs sm:text-sm font-bold">
                {(['overview', 'history', 'prescriptions'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-4 border-b-2 font-bold transition border-none bg-transparent cursor-pointer min-h-[44px] ${
                      activeTab === tab
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t(`patientDetail.tabs.${tab}`)}
                  </button>
                ))}
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Known Allergies
                    </h3>
                    {patient.allergies?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {patient.allergies.map((a, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No known allergies recorded.</p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Chronic Conditions
                    </h3>
                    {patient.chronicConditions?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {patient.chronicConditions.map((c, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No chronic conditions recorded.</p>
                    )}
                  </div>

                  {patient.emergencyContact && (
                    <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs text-xs">
                      <span className="font-bold text-slate-700">Emergency Contact: </span>
                      <span className="text-slate-900">{patient.emergencyContact}</span>
                    </div>
                  )}

                  {referrals.length > 0 && (
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Facility Referrals ({referrals.length})</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('referrals')}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                        >
                          View Pipeline
                        </button>
                      </div>
                      <div className="space-y-3">
                        {referrals.slice(0, 2).map((ref) => (
                          <ReferralStepperCard
                            key={ref.id}
                            referral={ref}
                            canUpdate={true}
                            onStatusUpdate={handleReferralUpdate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Referrals */}
              {activeTab === 'referrals' && (
                <div className="space-y-4">
                  {referrals.length > 0 ? (
                    referrals.map((ref) => (
                      <ReferralStepperCard
                        key={ref.id}
                        referral={ref}
                        canUpdate={true}
                        onStatusUpdate={handleReferralUpdate}
                      />
                    ))
                  ) : (
                    <p className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                      No facility referrals recorded for this patient.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 2: Consultation History */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {patient.appointments?.length > 0 ? (
                    patient.appointments.map((appt) => (
                      <div key={appt.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-bold text-slate-900">
                            Dr. {appt.doctorName || 'Consultation'} ({appt.specialty || 'General'})
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {appt.date} at {appt.timeSlot} • Mode: {appt.consultMode || 'In-Person'}
                        </p>
                        {appt.healthConcern && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl">
                            <strong>Concern:</strong> {appt.healthConcern}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                      {t('patientDetail.noHistory')}
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Prescriptions */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-3">
                  {patient.prescriptions?.length > 0 ? (
                    patient.prescriptions.map((pr) => (
                      <div key={pr.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-bold text-slate-900">By {pr.doctorName}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(pr.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {pr.diagnosis && (
                          <p className="text-xs font-semibold text-emerald-800">
                            Diagnosis: {pr.diagnosis}
                          </p>
                        )}
                        {pr.dietAdvice && (
                          <p className="text-xs text-slate-600">
                            Advice: {pr.dietAdvice}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                      {t('patientDetail.noPrescriptions')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
