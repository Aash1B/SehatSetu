import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, SlidersHorizontal, Check } from 'lucide-react';

import DoctorSidebar from '../components/DoctorSidebar';
import DoctorNavbar from '../components/DoctorNavbar';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import ConsultationCard from '../components/ConsultationCard';
import { ConsultationStatus, Priority } from '../../types';
import { type DoctorProfile } from '../utils/doctorProfile';
import { fetchConsultationSummary } from '../../common/services/aiApi';
import { getToken, getUser } from '../../auth/authStorage';
import { LiquidLoader } from '../../common/components/LiquidLoader';

const getInitials = (name?: string) => {
  if (!name) return 'DR';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Dashboard = () => {
  const navigate = useNavigate();
  // Always derive the display name from the JWT auth user — never from localStorage
  // which may contain stale data from a previous session or a different account
  const signedInUser = getUser();
  const authName = signedInUser?.fullName
    ? (signedInUser.fullName.startsWith('Dr.') ? signedInUser.fullName : `Dr. ${signedInUser.fullName}`)
    : 'Doctor';

  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile>({
    id: signedInUser?.id || 'd-active',
    name: authName,
    specialization: '',
    initials: getInitials(authName),
    imageUrl: '',
  });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [summaryModalData, setSummaryModalData] = useState<{
    patientName: string;
    loading: boolean;
    summary: any;
  } | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const profileResponse = await fetch('/api/doctors/me', { headers });
        if (!profileResponse.ok) throw new Error('Unable to load signed-in doctor profile');
        const profile = await profileResponse.json();
        // Always use the authenticated user's fullName from JWT storage — the API profile
        // may have stale name data if a different doctor was previously active
        const doctorName = signedInUser?.fullName
          ? (signedInUser.fullName.startsWith('Dr.') ? signedInUser.fullName : `Dr. ${signedInUser.fullName}`)
          : (profile.user?.fullName || profile.name || 'Doctor');
        setActiveDoctor({
          id: profile.id,
          name: doctorName,
          initials: getInitials(doctorName),
          specialization: profile.specialty || 'General Physician',
          imageUrl: profile.imageUrl || '',
        });

        const res = await fetch('/api/appointments', { headers });
        if (res.ok) {
          const dbAppointments = await res.json();
          if (Array.isArray(dbAppointments)) {
            const formatted = dbAppointments.map((app: any) => {
              const patientName = app.patientName || app.patient?.user?.fullName || 'Unknown Patient';
              const patientAge = app.patientAge ? (parseInt(String(app.patientAge), 10) || 28) : 28;
              const patientGenderStr = app.patientGender || app.patient?.gender || 'Female';
              const genderChar = patientGenderStr.toUpperCase().startsWith('M') ? 'M' : (patientGenderStr.toUpperCase().startsWith('F') ? 'F' : 'O');

              let displayDate = app.date || '';
              if (app.scheduledAt) {
                const sDate = new Date(app.scheduledAt);
                if (!isNaN(sDate.getTime())) {
                  displayDate = sDate.toISOString().split('T')[0];
                }
              }
              if (!displayDate) {
                displayDate = new Date().toISOString().split('T')[0];
              }

              return {
                id: String(app.id || Math.random()),
                patient: {
                  id: String(app.patientId || app.id || 'p1'),
                  name: patientName,
                  initials: getInitials(patientName),
                  age: patientAge,
                  gender: genderChar,
                  avatarColorClass: 'bg-indigo-50 text-indigo-600',
                },
                tags: [
                  { label: 'Consultation', variant: 'default' as const },
                  { label: app.status === 'SCHEDULED' ? 'Scheduled' : (app.status === 'COMPLETED' ? 'Completed' : (app.status === 'CANCELLED' ? 'Cancelled' : (app.status || 'Scheduled'))), variant: (app.status === 'CANCELLED' ? 'cancelled' : app.status === 'COMPLETED' ? 'completed' : 'scheduled') as any },
                ],
                time: app.timeSlot || '10:00 AM',
                date: displayDate,
                chiefComplaint: app.healthConcern || (app.notes ? String(app.notes).split('\n')[0].replace(/^Concern:\s*/i, '') : 'General Medical Consultation'),
                status: (app.status === 'COMPLETED' ? ConsultationStatus.COMPLETED : (app.status === 'CANCELLED' ? ConsultationStatus.NO_SHOW : ConsultationStatus.WAITING)),
                priority: Priority.ROUTINE,
              };
            });

            setConsultations(formatted);
          } else {
            setConsultations([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch appointments', err);
        setConsultations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#F8FAFC]">
        <LiquidLoader text="Loading appointments" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-deadly-depths overflow-hidden">
      <DoctorSidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <DoctorNavbar doctor={activeDoctor} />

        <main className="flex-1 overflow-y-auto px-8 md:px-10 pt-2 pb-10 relative bg-[#F8FAFC]">
          <DashboardHeader
            doctor={{
              id: activeDoctor.id,
              name: activeDoctor.name,
              initials: activeDoctor.initials,
              specialization: activeDoctor.specialization as any,
              imageUrl: activeDoctor.imageUrl,
            }}
            date={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            notificationCount={3}
          />

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Today's Appointments"
              value={<span className="text-[#F98513]">{consultations.filter(c => c.status !== ConsultationStatus.COMPLETED && c.status !== ConsultationStatus.NO_SHOW).length}</span>}
              subtitle="Scheduled for Today"
              imageSrc="/Today.png"
            />
            <StatCard
              title="Completed"
              value={<span className="text-[#15803d]">{consultations.filter(c => c.status === ConsultationStatus.COMPLETED).length}</span>}
              subtitle="Total Appointments Attended"
              imageSrc="/Completed.png"
            />
          </div>

          {/* Main Area: Consultations */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Consultations</h2>
              </div>
              <div className="flex items-center gap-4">
                {/* Date Filter */}
                <div className="flex items-center gap-3 bg-[#9BACD8] px-5 md:px-6 py-3 md:py-3.5 rounded-2xl border border-[#9BACD8] shadow-2xs">
                  <span className="text-base md:text-lg font-bold text-slate-900">Date:</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-base md:text-lg font-bold text-slate-900 outline-none bg-transparent cursor-pointer"
                  />
                  {dateFilter && (
                    <button
                      type="button"
                      onClick={() => setDateFilter('')}
                      className="text-base text-slate-800 hover:text-slate-950 font-bold ml-1 cursor-pointer"
                      title="Clear date filter"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Icon + Popup */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setFilterOpen(o => !o)}
                    title="Filter by status"
                    className="flex items-center gap-2.5 px-5 md:px-6 py-3 md:py-3.5 rounded-2xl border border-[#9BACD8] bg-[#9BACD8] text-slate-900 text-base md:text-lg font-extrabold shadow-2xs transition-all duration-200 hover:bg-[#8ba0d2] cursor-pointer"
                  >
                    <SlidersHorizontal className="w-6 h-6 text-slate-900" />
                    <span>Filter{statusFilter !== 'ALL' ? `: ${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}` : ''}</span>
                  </button>

                  {filterOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter by Status</p>
                      </div>
                      <div className="py-1.5">
                        {([
                          { key: 'ALL', label: 'All Consultations', dot: 'bg-slate-400' },
                          { key: 'SCHEDULED', label: 'Scheduled', dot: 'bg-yellow-500' },
                          { key: 'COMPLETED', label: 'Completed', dot: 'bg-slate-500' },
                          { key: 'CANCELLED', label: 'Cancelled', dot: 'bg-red-500' },
                        ] as const).map(({ key, label, dot }) => {
                          const count = key === 'ALL'
                            ? consultations.length
                            : consultations.filter(c => c.tags?.[1]?.label?.toUpperCase() === key).length;
                          return (
                            <button
                              key={key}
                              onClick={() => { setStatusFilter(key); setFilterOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors cursor-pointer ${statusFilter === key
                                ? 'bg-slate-50 text-slate-900 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50 font-medium'
                                }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 rounded-full ${dot}`} />
                                {label}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400 font-medium">{count}</span>
                                {statusFilter === key && <Check className="w-3.5 h-3.5 text-[#223382]" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {consultations
                .filter(c => (statusFilter === 'ALL' || c.tags?.[1]?.label?.toUpperCase() === statusFilter) && (!dateFilter || c.date === dateFilter))
                .map((consultation) => (
                  <ConsultationCard
                    key={consultation.id}
                    consultation={consultation}
                    onViewPatient={() => navigate(`/doctor/patient/${consultation.patient.id}`)}
                    onViewSummary={async () => {
                      const text = `Patient ${consultation.patient.name}, ${consultation.patient.age}${consultation.patient.gender}, reports ${consultation.chiefComplaint}. No known drug allergies reported. Prior history includes routine wellness checkups.`;
                      setSummaryModalData({
                        patientName: consultation.patient.name,
                        loading: true,
                        summary: null,
                      });
                      try {
                        const res = await fetchConsultationSummary(text);
                        if (res && res.data) {
                          setSummaryModalData({
                            patientName: consultation.patient.name,
                            loading: false,
                            summary: res.data,
                          });
                        } else {
                          setSummaryModalData({
                            patientName: consultation.patient.name,
                            loading: false,
                            summary: {
                              chief_complaint: consultation.chiefComplaint,
                              symptoms: [consultation.chiefComplaint],
                              medical_history: ['No prior chronic conditions recorded'],
                              allergies: ['No known allergies'],
                              doctor_advice: 'Recommended rest, hydration, and follow-up if symptoms persist.',
                            },
                          });
                        }
                      } catch (e) {
                        setSummaryModalData({
                          patientName: consultation.patient.name,
                          loading: false,
                          summary: {
                            chief_complaint: consultation.chiefComplaint,
                            symptoms: [consultation.chiefComplaint],
                            medical_history: ['No prior chronic conditions recorded'],
                            allergies: ['No known allergies'],
                            doctor_advice: 'Recommended rest, hydration, and follow-up if symptoms persist.',
                          },
                        });
                      }
                    }}
                  />
                ))}
            </div>
          </div>

          {/* AI Consultation Summary Modal */}
          {summaryModalData && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                      ✨
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">AI Clinical Summary</h3>
                      <p className="text-xs text-slate-500">{summaryModalData.patientName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSummaryModalData(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {summaryModalData.loading ? (
                  <div className="py-12 flex justify-center">
                    <LiquidLoader text="Generating AI Consultation Summary" />
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                      <span className="font-bold text-purple-900 block text-xs uppercase tracking-wider mb-1">Chief Complaint</span>
                      <p className="text-slate-800 font-medium">{summaryModalData.summary?.chief_complaint || 'General Checkup'}</p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block text-xs uppercase tracking-wider mb-1.5">Key Symptoms Identified</span>
                      <div className="flex flex-wrap gap-1.5">
                        {summaryModalData.summary?.symptoms?.map((sym: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            • {sym}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-600 block text-[11px] uppercase mb-1">Medical History</span>
                        <p className="text-xs text-slate-700">{summaryModalData.summary?.medical_history?.join(', ') || 'None reported'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-600 block text-[11px] uppercase mb-1">Allergies</span>
                        <p className="text-xs text-slate-700">{summaryModalData.summary?.allergies?.join(', ') || 'No known allergies'}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                      <span className="font-bold text-black block text-xs uppercase tracking-wider mb-1">AI Doctor Guidance</span>
                      <p className="text-xs text-black leading-relaxed">{summaryModalData.summary?.doctor_advice || 'Review symptoms and prescribe targeted medication as needed.'}</p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setSummaryModalData(null)}
                        className="bg-slate-900 hover:bg-slate-800 text-black font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
                      >
                        Close Summary
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
