import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Stethoscope, ChevronRight, Activity, CalendarPlus, Phone, FileText, ActivityIcon } from 'lucide-react';

import DoctorSidebar from '../components/DoctorSidebar';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import AIBanner from '../components/AIBanner';
import ConsultationCard from '../components/ConsultationCard';
import QuickActionButton from '../components/QuickActionButton';
import ActivityItem from '../components/ActivityItem';
import { Specialization, ConsultationStatus, Priority } from '../../types';
import type { DashboardResponse } from '../../types';

// Mock Data
const dashboardData: DashboardResponse = {
  doctor: {
    id: "d1",
    name: "Dr. Sarah Jenkins",
    initials: "SJ",
    specialization: Specialization.CARDIOLOGIST
  },
  stats: {
    todayAppointments: 8,
    completedAppointments: 3,
    aiInsightsReady: true
  },
  todayConsultations: [
    {
      id: "c1",
      patient: { id: "p1", name: "Ramesh Kumar", initials: "RK", age: 42, gender: "M", avatarColorClass: "bg-blue-50 text-blue-600" },
      tags: [
        { label: "Chest Pain", variant: "default" },
        { label: "Scheduled", variant: "primary" }
      ],
      time: "10:00 AM",
      chiefComplaint: "Chest Pain",
      status: ConsultationStatus.WAITING,
      priority: Priority.ROUTINE
    },
    {
      id: "c2",
      patient: { id: "p2", name: "Sunita Devi", initials: "SD", age: 31, gender: "F", avatarColorClass: "bg-orange-50 text-orange-600" },
      tags: [
        { label: "Fever", variant: "default" },
        { label: "Urgent", variant: "warning" }
      ],
      time: "11:30 AM",
      chiefComplaint: "Fever",
      status: ConsultationStatus.WAITING,
      priority: Priority.URGENT
    },
    {
      id: "c3",
      patient: { id: "p3", name: "Arjun Singh", initials: "AS", age: 58, gender: "M", avatarColorClass: "bg-green-50 text-green-600" },
      tags: [
        { label: "Diabetes Follow-up", variant: "default" },
        { label: "Follow-up", variant: "success" }
      ],
      time: "2:00 PM",
      chiefComplaint: "Diabetes Follow-up",
      status: ConsultationStatus.WAITING,
      priority: Priority.ROUTINE
    }
  ],
  recentActivities: [
    {
      id: "a1",
      message: "Prescription sent to Meena Patel",
      timeAgo: "12 min ago",
      iconName: "FileText",
      colorScheme: "blue"
    },
    {
      id: "a2",
      message: "Follow-up scheduled for Ravi Singh",
      timeAgo: "34 min ago",
      iconName: "CalendarCheck",
      colorScheme: "purple"
    },
    {
      id: "a3",
      message: "AI flagged drug interaction for Sunita Devi",
      timeAgo: "1 hr ago",
      iconName: "ActivityIcon",
      colorScheme: "red"
    }
  ]
};

import { getActiveDoctor, type DoctorProfile } from '../utils/doctorProfile';

const getInitials = (name?: string) => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

import { fetchConsultationSummary } from '../../common/services/aiApi';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile>(getActiveDoctor());
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryModalData, setSummaryModalData] = useState<{
    patientName: string;
    loading: boolean;
    summary: any;
  } | null>(null);

  useEffect(() => {
    const handleDoctorChange = () => {
      setActiveDoctor(getActiveDoctor());
    };
    window.addEventListener('sehat_doctor_changed', handleDoctorChange);
    return () => window.removeEventListener('sehat_doctor_changed', handleDoctorChange);
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/appointments/doctor/${activeDoctor.id}`);
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
                  avatarColorClass: "bg-indigo-50 text-indigo-600"
                },
                tags: [
                  { label: 'Consultation', variant: "default" as const },
                  { label: app.status === 'SCHEDULED' ? 'Scheduled' : (app.status || 'Scheduled'), variant: "primary" as const }
                ],
                time: app.timeSlot || '10:00 AM',
                chiefComplaint: app.healthConcern || (app.notes ? String(app.notes).split('\n')[0].replace(/^Concern:\s*/i, '') : 'General Medical Consultation'),
                status: (app.status === 'COMPLETED' ? ConsultationStatus.COMPLETED : (app.status === 'CANCELLED' ? ConsultationStatus.NO_SHOW : ConsultationStatus.WAITING)),
                priority: Priority.ROUTINE
              };
            });

            setConsultations(formatted);
          } else {
            setConsultations([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch appointments", err);
        setConsultations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [activeDoctor.id]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Today's Appointments"
            value={<span className="text-habanero">{consultations.length}</span>}
            subtitle="Scheduled today"
            icon={CalendarCheck}
          />
          <StatCard
            title="Completed"
            value={<span className="text-green-500">{consultations.filter(c => c.status === ConsultationStatus.COMPLETED).length}</span>}
            subtitle="Done so far"
            icon={CheckCircle2}
            iconColorClass="text-green-500"
          />
          <StatCard
            title="AI Insights Ready"
            value={
              <div className="flex items-center gap-2 mt-3 mb-4 bg-gray-50 w-fit px-3 py-1 rounded-full border border-gray-200 h-10">
                <span className="w-2 h-2 rounded-full bg-habanero animate-pulse"></span>
                <span className="text-sm font-bold text-deep-space">Active & Listening</span>
              </div>
            }
            subtitle="Your clinical co-pilot is on"
            icon={Stethoscope}
            iconColorClass="text-habanero"
          />
        </div>

        <AIBanner
          message="AI Assistant is ready. It will auto-summarize patient records and suggest diagnoses during consultations."
          className="mb-8"
        />

        {/* Main Area: Consultations */}
        <div className="w-full">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-1">Your Schedule</p>
              <h2 className="text-xl font-bold text-deep-space">Today's Assigned Consultations</h2>
            </div>
            <button className="text-sm font-medium text-habanero hover:underline flex items-center gap-1">
              View schedule <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading appointments...</div>
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
                    <span className="font-bold text-blue-900 block text-xs uppercase tracking-wider mb-1">AI Doctor Guidance</span>
                    <p className="text-xs text-blue-950 leading-relaxed">{summaryModalData.summary?.doctor_advice || 'Review symptoms and prescribe targeted medication as needed.'}</p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setSummaryModalData(null)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
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
