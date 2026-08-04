import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import DoctorSidebar from '../components/DoctorSidebar';
import PageHeader from '../components/PageHeader';
import PatientInfoCard from '../components/PatientInfoCard';
import ChiefComplaintsCard from '../components/ChiefComplaintsCard';
import MedicalHistoryCard from '../components/MedicalHistoryCard';
import CurrentMedicinesCard from '../components/CurrentMedicinesCard';
import AISummaryCard from '../components/AISummaryCard';
import ReferralModal from '../components/ReferralModal';
import { getToken } from '../../auth/authStorage';

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normaliseMedicines = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((medicine: any, index) => {
    if (typeof medicine === 'string') {
      return { id: `medicine-${index}`, name: medicine, dosage: '', frequency: '' };
    }
    return {
      id: String(medicine?.id || `medicine-${index}`),
      name: String(medicine?.name || medicine?.medicine || 'Medicine'),
      dosage: String(medicine?.dosage || medicine?.dose || ''),
      frequency: String(medicine?.frequency || medicine?.instructions || ''),
    };
  });
};

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id: patientId } = useParams<{ id: string }>();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  useEffect(() => {
    const loadPatient = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/appointments', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!response.ok) throw new Error('Unable to load patient details');
        const result = await response.json();
        const matches = (Array.isArray(result) ? result : []).filter(
          (appointment: any) => String(appointment.patient?.id || appointment.patientId || '') === patientId,
        );
        if (matches.length === 0) throw new Error('Patient not found or is not assigned to this doctor');
        setAppointments(matches);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load patient details');
      } finally {
        setLoading(false);
      }
    };
    void loadPatient();
  }, [patientId]);

  const details = useMemo(() => {
    if (appointments.length === 0) return null;
    const appointment = appointments[0];
    const patient = appointment.patient || {};
    const name = appointment.patientName || patient.user?.fullName || 'Unknown Patient';
    const age = Number.parseInt(String(appointment.patientAge || patient.age || '0'), 10) || 0;
    const genderValue = String(appointment.patientGender || patient.gender || 'Other');
    const gender = genderValue.toUpperCase().startsWith('F')
      ? 'Female'
      : genderValue.toUpperCase().startsWith('M') ? 'Male' : 'Other';
    const complaints = Array.isArray(appointment.symptoms) && appointment.symptoms.length > 0
      ? appointment.symptoms
      : [appointment.healthConcern || 'General consultation'];
    const history = appointments
      .filter((item) => item.ehrRecord)
      .map((item) => ({
        id: String(item.ehrRecord.id),
        date: formatDate(item.ehrRecord.createdAt),
        description: item.ehrRecord.notes || item.ehrRecord.diagnosis || 'Consultation record',
      }));
    const conditions = [...new Set(
      appointments.map((item) => item.ehrRecord?.diagnosis).filter(Boolean) as string[],
    )];
    const prescription = appointments.find((item) => item.prescription)?.prescription;
    const aiSummary = appointments.find((item) => item.ehrRecord?.aiSummary)?.ehrRecord?.aiSummary;

    return {
      appointment,
      patient: {
        id: String(patient.id || appointment.patientId),
        name,
        initials: getInitials(name),
        age,
        gender,
        bloodGroup: appointment.patientBloodGroup || patient.bloodGroup || '-',
        weight: appointment.patientWeight || patient.weight || '-',
        height: appointment.patientHeight || patient.height || '-',
      },
      complaints,
      duration: appointment.duration || 'not specified',
      history,
      conditions,
      medicines: normaliseMedicines(prescription?.medicines),
      allergies: [] as string[],
      summary: aiSummary || `No AI summary is available yet for ${name}.`,
    };
  }, [appointments]);

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deadly-depths">
      <DoctorSidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <PageHeader title="Patient Details" onBack={() => navigate('/doctor/dashboard')} onOptionsClick={() => undefined} />

        {loading && <div className="rounded-2xl bg-white p-12 text-center text-gray-500">Loading patient details...</div>}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
        )}
        {!loading && details && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PatientInfoCard patient={{
                name: details.patient.name,
                age: details.patient.age,
                gender: details.patient.gender,
                initials: details.patient.initials,
                tag: 'Assigned Patient',
                vitals: {
                  bloodGroup: details.patient.bloodGroup,
                  weight: details.patient.weight,
                  height: details.patient.height,
                  allergies: details.allergies.length,
                },
              }} />
              <ChiefComplaintsCard complaints={details.complaints} since={details.duration} />
              <MedicalHistoryCard conditions={details.conditions} history={details.history} />
              <CurrentMedicinesCard medicines={details.medicines} allergies={details.allergies} />
            </div>

            <div className="lg:col-span-1">
              <AISummaryCard summary={details.summary} confidence={details.summary.startsWith('No AI summary') ? 0 : 87} />
              <button
                onClick={() => navigate(`/doctor/consultation/${details.appointment.id}`)}
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
        )}

        {details && (
          <ReferralModal
            isOpen={isReferralOpen}
            onClose={() => setIsReferralOpen(false)}
            consultationId={details.appointment.id}
            patientId={details.patient.id}
            fromDoctorId={details.appointment.doctorId}
            patientName={details.patient.name}
            onSubmit={() => setIsReferralOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default PatientDetails;
