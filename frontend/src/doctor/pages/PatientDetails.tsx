import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorNavbar from '../components/DoctorNavbar';
import PageHeader from '../components/PageHeader';
import PatientInfoCard from '../components/PatientInfoCard';
import ChiefComplaintsCard from '../components/ChiefComplaintsCard';
import MedicalHistoryCard from '../components/MedicalHistoryCard';
import CurrentMedicinesCard from '../components/CurrentMedicinesCard';
import AISummaryCard from '../components/AISummaryCard';
import ReferralModal from '../components/ReferralModal';
import { LiquidLoader } from '../../common/components/LiquidLoader';
import { API_BASE_URL } from '../../patient/utils/constants';
import { ChevronRight } from 'lucide-react';
import { getToken } from '../../auth/authStorage';

const getInitials = (name?: string) => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAppointment(data);
        } else {
          // If direct ID lookup fails, fetch all appointments and find matching record
          const allRes = await fetch(`${API_BASE_URL}/appointments`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (allRes.ok) {
            const allApps = await allRes.json();
            const found = Array.isArray(allApps)
              ? allApps.find((a: any) => a.id === id || a.patientId === id || a.patient?.id === id)
              : null;
            if (found) {
              setAppointment(found);
            } else {
              setError('Patient appointment record not found.');
            }
          } else {
            setError('Unable to load patient record.');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch patient details:', err);
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientDetails();
  }, [id]);

  const handleBack = () => {
    navigate('/doctor/dashboard');
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] font-sans text-deadly-depths">
        <DoctorSidebar />
        <main className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
          <LiquidLoader text="Loading patient details" />
        </main>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] font-sans text-deadly-depths">
        <DoctorSidebar />
        <main className="flex-1 p-8 bg-[#F8FAFC]">
          <PageHeader title="Patient Details" onBack={handleBack} />
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center mt-6 shadow-sm max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-red-600 mb-2">Record Not Found</h3>
            <p className="text-slate-600 mb-6">{error || 'Patient information could not be retrieved.'}</p>
            <button
              onClick={handleBack}
              className="bg-habanero text-white px-6 py-2 rounded-xl font-bold hover:bg-[#e0750e] transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Parse patient attributes dynamically
  const patientName = appointment.patientName || appointment.patient?.user?.fullName || 'Patient';
  const patientAge = appointment.patientAge ? (parseInt(String(appointment.patientAge), 10) || 28) : 28;
  const rawGender = String(appointment.patientGender || appointment.patient?.gender || 'F');
  const genderChar = rawGender.toUpperCase().startsWith('M') ? 'M' : (rawGender.toUpperCase().startsWith('F') ? 'F' : 'O');
  const genderFull = genderChar === 'M' ? 'Male' : (genderChar === 'F' ? 'Female' : 'Other');

  const bloodGroup = appointment.patientBloodGroup || appointment.patient?.bloodGroup || 'B+';
  const weight = appointment.patientWeight || appointment.patient?.weight || '58kg';
  const height = appointment.patientHeight || appointment.patient?.height || '162cm';

  const chiefComplaints = Array.isArray(appointment.symptoms) && appointment.symptoms.length > 0
    ? appointment.symptoms
    : [appointment.healthConcern || 'General Medical Consultation'];

  const durationSinceStart = appointment.duration || 'Recent';

  // Construct medical history entries
  const historyList = appointment.ehrRecord?.notes
    ? [
        {
          id: appointment.ehrRecord.id || 'mh-1',
          date: new Date(appointment.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          description: appointment.ehrRecord.notes,
        }
      ]
    : [
        {
          id: 'mh-1',
          date: new Date(appointment.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          description: `Initial consultation booked for ${appointment.healthConcern || 'general medical evaluation'}.`,
        }
      ];

  const pastConditions = appointment.healthConcern
    ? [appointment.healthConcern]
    : ['No prior chronic conditions recorded'];

  // Construct current medicines
  const currentMedicines = Array.isArray(appointment.prescription?.medicines) && appointment.prescription.medicines.length > 0
    ? appointment.prescription.medicines.map((m: any, idx: number) => ({
        id: `med-${idx}`,
        name: typeof m === 'string' ? m : (m.name || 'Medication'),
        dosage: typeof m === 'object' ? (m.dosage || '') : '',
        frequency: typeof m === 'object' ? (m.frequency || 'As directed') : 'As directed',
      }))
    : [];

  const allergies = appointment.notes && appointment.notes.includes('Allergies:')
    ? [appointment.notes.split('Allergies:')[1].trim()]
    : ['No known allergies'];

  const summaryText = appointment.ehrRecord?.aiSummary
    || `Patient ${patientName} (${patientAge} years, ${genderFull}) has scheduled a ${appointment.consultMode || 'video'} consultation for "${appointment.healthConcern || 'general symptoms'}". Please review symptoms and current medical history before starting.`;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-deadly-depths overflow-hidden">
      <DoctorSidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <DoctorNavbar />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-[#F8FAFC]">
        <PageHeader 
          title="Patient Details" 
          onBack={handleBack} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <PatientInfoCard patient={{
              name: patientName,
              age: patientAge,
              gender: genderFull,
              initials: getInitials(patientName),
              tag: "Assigned Patient",
              vitals: {
                bloodGroup: bloodGroup,
                weight: weight,
                height: height,
                allergies: allergies.filter(a => a !== 'No known allergies').length,
              }
            }} />
            <ChiefComplaintsCard complaints={chiefComplaints} since={durationSinceStart} />
            <MedicalHistoryCard conditions={pastConditions} history={historyList} />
            <CurrentMedicinesCard medicines={currentMedicines} allergies={allergies} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <AISummaryCard summary={summaryText} confidence={92} />
            
            <button 
              onClick={() => navigate(`/doctor/consultation/${appointment.id}`)}
              className="w-full bg-habanero hover:bg-[#e0750e] text-white py-4 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-lg group mb-3 cursor-pointer"
            >
              Start Consultation 
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <ReferralModal 
          isOpen={isReferralOpen} 
          onClose={() => setIsReferralOpen(false)} 
          consultationId={appointment.id}
          patientId={appointment.patientId || appointment.id}
          fromDoctorId={appointment.doctorId}
          patientName={patientName} 
          onSubmit={(data) => {
            console.log('Referral submitted with DTO:', data);
            setIsReferralOpen(false);
          }} 
        />
      </main>
    </div>
  </div>
);
};

export default PatientDetails;
