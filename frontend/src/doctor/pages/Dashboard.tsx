import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, ChevronRight } from 'lucide-react';

import DoctorSidebar from '../components/DoctorSidebar';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import ConsultationCard from '../components/ConsultationCard';
import { ConsultationStatus, Priority } from '../../types';
import { type DoctorProfile } from '../utils/doctorProfile';
import { fetchConsultationSummary } from '../../common/services/aiApi';
import { getToken, getUser } from '../../auth/authStorage';

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
  });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
                  { label: app.status === 'SCHEDULED' ? 'Scheduled' : (app.status || 'Scheduled'), variant: 'primary' as const },
                ],
                time: app.timeSlot || '10:00 AM',
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

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deadly-depths">
      <DoctorSidebar />

      <main className="flex-1 overflow-y-auto p-8 relative">
        <DashboardHeader
          doctor={{
            id: activeDoctor.id,
            name: activeDoctor.name,
            initials: activeDoctor.initials,
            specialization: activeDoctor.specialization as any,
          }}
          date={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          notificationCount={3}
        />

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            title="Today's Appointments"
            value={<span className="text-black">{consultations.filter(c => c.status !== ConsultationStatus.COMPLETED && c.status !== ConsultationStatus.NO_SHOW).length}</span>}
            subtitle="Scheduled today"
            icon={CalendarCheck}
          />
          <StatCard
            title="Completed"
            value={<span className="text-black">{consultations.filter(c => c.status === ConsultationStatus.COMPLETED).length}</span>}
            subtitle="Done so far"
            icon={CheckCircle2}
            iconColorClass="text-green-500"
          />
        </div>

        {/* Main Area: Consultations */}
        <div className="w-full">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Schedule</p>
              <h2 className="text-2xl font-semibold text-slate-900">Today's Assigned Consultations</h2>
            </div>
            <button className="text-sm font-normal text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer">
              View schedule <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-black">Loading appointments...</div>
            ) : (
              consultations.map((consultation) => (
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
              ))
            )}
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
                <div className="py-12 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm font-semibold text-purple-900">Generating AI Consultation Summary...</p>
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
  );
};

export default Dashboard;
