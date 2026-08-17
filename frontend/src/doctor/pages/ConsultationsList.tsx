import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorNavbar from '../components/DoctorNavbar';
import PageHeader from '../components/PageHeader';
import ConsultationCard from '../components/ConsultationCard';
import type { ConsultationSummary } from '../../types';
import { ConsultationStatus, Priority } from '../../types';
import { getToken, getUser } from '../../auth/authStorage';
import { SlidersHorizontal, Check } from 'lucide-react';
import { LiquidLoader } from '../../common/components/LiquidLoader';

// Mock Data
const mockConsultations: ConsultationSummary[] = [
  {
    id: "1",
    patient: {
      id: "p2",
      name: "Sunita Devi",
      initials: "SD",
      age: 31,
      gender: "F",
      avatarColorClass: "bg-habanero text-white"
    },
    time: "11:30 AM",
    chiefComplaint: "Fever and body ache",
    status: ConsultationStatus.WAITING,
    priority: Priority.ROUTINE,
    tags: [
      { label: 'Follow up', variant: 'primary' },
      { label: 'Fever', variant: 'warning' }
    ]
  },
  {
    id: "2",
    patient: {
      id: "p3",
      name: "Ramesh Kumar",
      initials: "RK",
      age: 45,
      gender: "M",
      avatarColorClass: "bg-blue-600 text-white"
    },
    time: "02:15 PM",
    chiefComplaint: "Follow up for hypertension",
    status: ConsultationStatus.WAITING,
    priority: Priority.ROUTINE,
    tags: [
      { label: 'Routine', variant: 'default' },
      { label: 'BP Check', variant: 'secondary' }
    ]
  },
  {
    id: "3",
    patient: {
      id: "p4",
      name: "Aarti Sharma",
      initials: "AS",
      age: 28,
      gender: "F",
      avatarColorClass: "bg-green-600 text-white"
    },
    time: "04:00 PM",
    chiefComplaint: "Severe stomach pain",
    status: ConsultationStatus.WAITING,
    priority: Priority.URGENT,
    tags: [
      { label: 'Urgent', variant: 'danger' },
      { label: 'New Symptom', variant: 'warning' }
    ]
  }
];

import { getActiveDoctor, type DoctorProfile as ActiveDoc } from '../utils/doctorProfile';

const getInitials = (name?: string) => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ConsultationsList: React.FC = () => {
  const navigate = useNavigate();
  const signedInUser = getUser();
  const [activeDoctor, setActiveDoctor] = useState<ActiveDoc>({ ...getActiveDoctor(), name: signedInUser?.fullName || getActiveDoctor().name, initials: getInitials(signedInUser?.fullName || getActiveDoctor().name) });
  const [consultations, setConsultations] = useState<ConsultationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL');
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

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const profileResponse = await fetch('/api/doctors/me', { headers });
        if (!profileResponse.ok) throw new Error('Unable to load signed-in doctor profile');
        const profile = await profileResponse.json();
        const doctorName = profile.name || profile.user?.fullName || signedInUser?.fullName || 'Doctor';
        setActiveDoctor({ id: profile.id, name: doctorName, initials: getInitials(doctorName), specialization: profile.specialty || 'General Physician' });
        const res = await fetch('/api/appointments', { headers });
        if (res.ok) {
          const dbAppointments = await res.json();
          if (Array.isArray(dbAppointments) && dbAppointments.length > 0) {
            const formatted = dbAppointments.map((app: any) => {
              const patientName = app.patientName || app.patient?.user?.fullName || 'Unknown Patient';
              const patientAge = app.patientAge ? (parseInt(String(app.patientAge), 10) || 28) : 28;
              const patientGenderStr = app.patientGender || app.patient?.gender || 'Female';
              const genderChar: ConsultationSummary['patient']['gender'] = patientGenderStr.toUpperCase().startsWith('M')
                ? 'M'
                : (patientGenderStr.toUpperCase().startsWith('F') ? 'F' : 'Other');

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
                  { label: app.status === 'SCHEDULED' ? 'Scheduled' : (app.status === 'COMPLETED' ? 'Completed' : (app.status === 'CANCELLED' ? 'Cancelled' : (app.status || 'Scheduled'))), variant: (app.status === 'CANCELLED' ? 'cancelled' : app.status === 'COMPLETED' ? 'completed' : 'scheduled') as any }
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#F8FAFC]">
        <LiquidLoader text="Loading appointments" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-deep-space overflow-hidden">
      <DoctorSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <DoctorNavbar />
        <main className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6 md:px-10 pt-4 sm:pt-12 pb-10 bg-[#F8FAFC]">
        <PageHeader 
          title="Patient Appointments" 
          onBack={() => navigate('/doctor/dashboard')}
        />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full space-y-4 pb-12">
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-extrabold text-slate-900">Upcoming Appointments</h2>

                  {/* Filter Icon + Popup */}
                  <div className="relative" ref={filterRef}>
                    <button
                      onClick={() => setFilterOpen(o => !o)}
                      title="Filter by status"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#9BACD8] bg-[#9BACD8] text-slate-900 hover:bg-[#8ba0d2] text-base font-extrabold transition-all duration-200 cursor-pointer shadow-2xs"
                    >
                      <SlidersHorizontal className="w-5 h-5 text-slate-900" />
                      <span>Filter{statusFilter !== 'ALL' ? `: ${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}` : ''}</span>
                    </button>

                    {filterOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-4 py-2.5 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter by Status</p>
                        </div>
                        <div className="py-1.5">
                          {([
                            { key: 'ALL',       label: 'All Consultations', dot: 'bg-slate-400' },
                            { key: 'SCHEDULED', label: 'Scheduled',         dot: 'bg-yellow-500' },
                            { key: 'COMPLETED', label: 'Completed',         dot: 'bg-slate-500' },
                            { key: 'CANCELLED', label: 'Cancelled',         dot: 'bg-red-500' },
                          ] as const).map(({ key, label, dot }) => {
                            const count = key === 'ALL'
                              ? consultations.length
                              : consultations.filter(c => c.tags?.[1]?.label?.toUpperCase() === key).length;
                            return (
                              <button
                                key={key}
                                onClick={() => { setStatusFilter(key); setFilterOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                  statusFilter === key
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

                <div className="space-y-4">
                  {consultations.length > 0 ? (
                    consultations
                      .filter(c => statusFilter === 'ALL' || c.tags?.[1]?.label?.toUpperCase() === statusFilter)
                      .map((consultation) => (
                      <ConsultationCard 
                        key={consultation.id} 
                        consultation={consultation} 
                        onViewPatient={() => navigate(`/doctor/consultations/${consultation.id}`)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-jodhpur-tan/30">
                      <p className="text-gray-500">No upcoming appointments scheduled.</p>
                    </div>
                  )}
                </div>
              </>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

export default ConsultationsList;
