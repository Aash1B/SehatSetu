import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorSidebar from '../components/DoctorSidebar';
import PageHeader from '../components/PageHeader';
import PatientInfoCard from '../components/PatientInfoCard';
import ChiefComplaintsCard from '../components/ChiefComplaintsCard';
import MedicalHistoryCard from '../components/MedicalHistoryCard';
import CurrentMedicinesCard from '../components/CurrentMedicinesCard';
import AISummaryCard from '../components/AISummaryCard';
import ReferralModal from '../components/ReferralModal';
import { ChevronRight } from 'lucide-react';

import { ConsultationStatus } from '../../types';
import type { ConsultationDetails } from '../../types';

// Unified Mock Data DTO
const mockConsultation: ConsultationDetails = {
  consultationId: "c1",
  patient: {
    id: "p2",
    name: "Sunita Devi",
    initials: "SD",
    age: 31,
    gender: "F",
    bloodGroup: "B+",
    weight: "58kg",
    height: "162cm"
  },
  appointmentTime: "11:30 AM",
  chiefComplaints: ["Persistent Fever", "Headache", "Body Ache"],
  durationSinceStart: "4 days",
  medicalHistory: [
    {
      id: "mh1",
      date: "12 Feb 2024",
      description: "Fever and fatigue; possible viral infection."
    },
    {
      id: "mh2",
      date: "18 Nov 2023",
      description: "Blood pressure review; medication continued."
    },
    {
      id: "mh3",
      date: "06 Aug 2023",
      description: "Routine diabetes check-up and lab review."
    }
  ],
  pastConditions: ["Type 2 Diabetes (2019)", "Hypertension (2021)"],
  currentMedicines: [
    {
      id: "med1",
      name: "Metformin 500mg",
      dosage: "",
      frequency: "Twice daily"
    },
    {
      id: "med2",
      name: "Amlodipine 5mg",
      dosage: "",
      frequency: "Once daily"
    }
  ],
  allergies: ["Penicillin", "Peanuts"],
  aiSummary: {
    summaryText: "Patient has recurring fever episodes. Previous consultation showed possible viral infection. Consider CBC and dengue test before prescribing.",
    confidenceScore: 87
  },
  status: ConsultationStatus.WAITING
};

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  
  const handleBack = () => {
    navigate('/doctor/dashboard');
  };
  
  const handleOptions = () => console.log('Options clicked');

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deadly-depths">
      <DoctorSidebar />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <PageHeader 
          title="Patient Details" 
          onBack={handleBack} 
          onOptionsClick={handleOptions} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Note: PatientInfoCard could be updated to accept PatientProfile DTO directly in the future */}
            <PatientInfoCard patient={{
              name: mockConsultation.patient.name,
              age: mockConsultation.patient.age,
              gender: mockConsultation.patient.gender === 'F' ? 'Female' : mockConsultation.patient.gender === 'M' ? 'Male' : 'Other',
              initials: mockConsultation.patient.initials,
              tag: "Assigned Patient",
              vitals: {
                bloodGroup: mockConsultation.patient.bloodGroup || "-",
                weight: mockConsultation.patient.weight || "-",
                height: mockConsultation.patient.height || "-",
                allergies: mockConsultation.allergies.length
              }
            }} />
            <ChiefComplaintsCard complaints={mockConsultation.chiefComplaints} since={mockConsultation.durationSinceStart} />
            <MedicalHistoryCard conditions={mockConsultation.pastConditions} history={mockConsultation.medicalHistory} />
            <CurrentMedicinesCard medicines={mockConsultation.currentMedicines} allergies={mockConsultation.allergies} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <AISummaryCard summary={mockConsultation.aiSummary.summaryText} confidence={mockConsultation.aiSummary.confidenceScore} />
            
            <button 
              onClick={() => navigate(`/doctor/consultation/${mockConsultation.consultationId}`)}
              className="w-full bg-habanero hover:bg-[#e0750e] text-white py-4 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-lg group mb-3"
            >
              Start Consultation 
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setIsReferralOpen(true)}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-deep-space py-3 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-base"
            >
              Refer to Specialist
            </button>
          </div>
        </div>

        <ReferralModal 
          isOpen={isReferralOpen} 
          onClose={() => setIsReferralOpen(false)} 
          consultationId={mockConsultation.consultationId}
          patientId={mockConsultation.patient.id}
          fromDoctorId="d1" // Mock Doctor ID
          patientName={mockConsultation.patient.name} 
          onSubmit={(data) => {
            console.log('Referral submitted with DTO:', data);
            setIsReferralOpen(false);
          }} 
        />
      </main>
    </div>
  );
};

export default PatientDetails;
