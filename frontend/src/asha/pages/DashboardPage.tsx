import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  UserPlus,
  CalendarPlus,
  RefreshCw,
  PhoneCall,
  ChevronRight,
} from 'lucide-react';
import AshaSidebar from '../components/AshaSidebar';
import AshaNavbar from '../components/AshaNavbar';
import EmergencyFlagCard from '../components/EmergencyFlagCard';
import OverdueFollowUpCard from '../components/OverdueFollowUpCard';
import {
  fetchAshaDashboard,
  fetchEmergencies,
  fetchOverdueFollowups,
  type AshaDashboardData,
  type EmergencyItem,
  type OverdueFollowupItem,
} from '../services/ashaApi';
import { getUser } from '../../auth/authStorage';
import { LiquidLoader } from '../../common/components/LiquidLoader';

export default function AshaDashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('asha');
  const storedUser = getUser();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AshaDashboardData | null>(null);
  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [overdueList, setOverdueList] = useState<OverdueFollowupItem[]>([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, ems, ovs] = await Promise.all([
        fetchAshaDashboard(),
        fetchEmergencies().catch(() => []),
        fetchOverdueFollowups().catch(() => []),
      ]);
      setDashboardData(dash);
      setEmergencies(ems);
      setOverdueList(ovs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ASHA dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = dashboardData?.counts || {
    assignedPatients: 0,
    todayAppointments: 0,
    overdueFollowups: 0,
    openEmergencies: 0,
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      <AshaSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AshaNavbar title={t('dashboard.title')} />

        <main className="flex-1 p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto safe-area-pb">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                {t('dashboard.welcome', { name: storedUser?.fullName || 'Health Worker' })}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-emerald-100 font-medium">
                <span>📍 {dashboardData?.worker.assignedArea || 'Community Health Sub-Center'}</span>
                <span>•</span>
                <span>ID: {dashboardData?.worker.workerCode || 'ASHA-FIELD'}</span>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-48 h-48 rounded-full bg-emerald-500/10 pointer-events-none" />
          </div>

          {loading ? (
            <LiquidLoader fullScreen={false} text="Loading Asha dashboard..." />
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadData}
                className="px-3 py-1 bg-rose-200 hover:bg-rose-300 rounded-lg text-xs font-bold cursor-pointer border-none"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* ─── 4 KPI Stat Cards ────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Caseload */}
                <div
                  onClick={() => navigate('/asha/patients')}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2 cursor-pointer hover:border-emerald-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {t('dashboard.stats.caseload')}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {counts.assignedPatients}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t('dashboard.stats.caseloadSubtitle')}
                  </p>
                </div>

                {/* 2. Today's Visits */}
                <div
                  onClick={() => navigate('/asha/patients')}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2 cursor-pointer hover:border-blue-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {t('dashboard.stats.todayVisits')}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {counts.todayAppointments}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t('dashboard.stats.todayVisitsSubtitle')}
                  </p>
                </div>

                {/* 3. Overdue Follow-ups */}
                <div
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {t('dashboard.stats.overdueFollowups')}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700">
                    {counts.overdueFollowups}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t('dashboard.stats.overdueSubtitle')}
                  </p>
                </div>

                {/* 4. Emergency Flags */}
                <div
                  className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs space-y-2 ${
                    counts.openEmergencies > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {t('dashboard.stats.emergencyFlags')}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-600">
                    {counts.openEmergencies}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t('dashboard.stats.emergencySubtitle')}
                  </p>
                </div>
              </div>

              {/* ─── Quick Actions ────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/asha/patients/new')}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200 shadow-2xs flex items-center justify-between hover:bg-blue-50/50 transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                        {t('nav.quickRegister')}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {t('dashboard.registerPatientDesc')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/asha/book')}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200 shadow-2xs flex items-center justify-between hover:bg-blue-50/50 transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CalendarPlus className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                        {t('nav.bookOnBehalf')}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {t('dashboard.bookOnBehalfDesc')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </button>
              </div>

              {/* ─── Active Emergency Flags ──────────────────────────────── */}
              {emergencies.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                      <span>{t('dashboard.activeEmergencies')}</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emergencies.map((em) => (
                      <EmergencyFlagCard
                        key={em.id}
                        emergency={em}
                        onVerified={loadData}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Overdue Follow-ups ──────────────────────────────────── */}
              {overdueList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span>{t('dashboard.overdueSection')}</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {overdueList.map((ov) => (
                      <OverdueFollowUpCard key={ov.id} followup={ov} />
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Today & Recent Caseload Visits ──────────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {t('dashboard.recentAppointments')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate('/asha/patients')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 border-none bg-transparent cursor-pointer transition-colors"
                  >
                    View Caseload →
                  </button>
                </div>

                {dashboardData?.recentAppointments && dashboardData.recentAppointments.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {dashboardData.recentAppointments.map((appt) => (
                      <div key={appt.id} className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {appt.patientName}
                          </p>
                          <p className="text-slate-500 text-xs truncate">
                            With {appt.doctorName} ({appt.doctorSpecialty || 'General'}) • {appt.date} at {appt.timeSlot}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            appt.status?.toUpperCase() === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-orange-50 text-habanero border border-orange-200/80'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-500 py-3 text-center">
                    {t('dashboard.noAppointmentsToday')}
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
