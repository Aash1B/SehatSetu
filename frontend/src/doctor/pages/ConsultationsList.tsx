import React from 'react';
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

const ConsultationsList: React.FC = () => {
  const navigate = useNavigate();

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
            
            {mockConsultations.map((consultation) => (
              <ConsultationCard 
                key={consultation.id} 
                consultation={consultation} 
                onViewPatient={() => navigate(`/doctor/consultations/${consultation.id}`)}
              />
            ))}

            {mockConsultations.length === 0 && (
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
