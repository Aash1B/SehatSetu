import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorSidebar from '../components/DoctorSidebar';
import PageHeader from '../components/PageHeader';
import ConsultationCard from '../components/ConsultationCard';
import type { ConsultationSummary } from '../../types';
import { ConsultationStatus, Priority } from '../../types';

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
  const [activeDoctor, setActiveDoctor] = useState<ActiveDoc>(getActiveDoctor());
  const [consultations, setConsultations] = useState<ConsultationSummary[]>(mockConsultations);
  const [loading, setLoading] = useState(true);

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
          if (Array.isArray(dbAppointments) && dbAppointments.length > 0) {
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
    <div className="flex h-screen bg-luster-white font-sans text-deep-space">
      <DoctorSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-8">
        <PageHeader 
          title="Patient Appointments" 
          onBack={() => navigate('/doctor/dashboard')}
        />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-4 pb-12">
            <h2 className="text-lg font-bold mb-4 text-deep-space/80">Upcoming Appointments</h2>
            
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading appointments...</div>
            ) : consultations.length > 0 ? (
              consultations.map((consultation) => (
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
        </div>
      </main>
    </div>
  );
};

export default ConsultationsList;
