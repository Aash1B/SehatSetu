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
import ReferralStepperCard from '../../components/ReferralStepperCard';
import { fetchPatientReferrals, updateReferralStatus, type ReferralRecord } from '../../services/referralsApi';
import DiagnosticsOrderTab from '../components/DiagnosticsOrderTab';
import { fetchPatientDiagnosticOrders, type DiagnosticOrderRecord } from '../../services/diagnosticsApi';
import { LiquidLoader } from '../../common/components/LiquidLoader';
import { API_BASE_URL } from '../../patient/utils/constants';
import { ChevronRight, CheckCircle2, Share2, TestTube2 } from 'lucide-react';
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
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [diagnosticOrders, setDiagnosticOrders] = useState<DiagnosticOrderRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'clinical' | 'diagnostics'>('clinical');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatientReferrals = async (patientId: string) => {
    try {
      const data = await fetchPatientReferrals(patientId);
      setReferrals(data);
    } catch (e) {
      console.warn('Could not load patient referrals', e);
    }
  };

  const loadPatientDiagnostics = async (patientId: string) => {
    try {
      const data = await fetchPatientDiagnosticOrders(patientId);
      setDiagnosticOrders(data);
    } catch (e) {
      console.warn('Could not load patient diagnostic orders', e);
    }
  };

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
          const pId = data.patientId || data.patient?.id;
          if (pId) {
            loadPatientReferrals(pId);
            loadPatientDiagnostics(pId);
          }
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
              const pId = found.patientId || found.patient?.id;
              if (pId) {
                loadPatientReferrals(pId);
                loadPatientDiagnostics(pId);
              }
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

  const handleReferralStatusUpdate = async (refId: string, newStatus: string, notes?: string, scheduledDate?: string) => {
    try {
      const updated = await updateReferralStatus(refId, {
        status: newStatus,
        followUpNotes: notes,
        scheduledDate,
      });
      setReferrals((prev) => prev.map((r) => (r.id === refId ? updated : r)));
    } catch (e) {
      console.error('Failed to update referral', e);
    }
  };

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
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
            {error || 'Patient not found'}
          </div>
        </main>
      </div>
    );
  }

  // Formatting helpers
  const patientName = appointment.patientName 
    || appointment.patient?.name 
    || appointment.patient?.user?.fullName 
    || appointment.patient?.fullName 
    || appointment.user?.fullName 
    || 'Patient';
  const patientAge = appointment.patientAge || appointment.patient?.age || '28';
  const genderRaw = appointment.patientGender || appointment.patient?.gender || 'FEMALE';
  const genderFull = genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase();
  
  const chiefComplaints = appointment.symptoms && appointment.symptoms.length > 0 
    ? appointment.symptoms 
    : [appointment.healthConcern || 'General Consultation'];
    
  const durationSinceStart = appointment.duration ? `Since ${appointment.duration}` : 'Recently started';
  
  const bloodGroup = appointment.patientBloodGroup || appointment.patient?.bloodGroup || 'O+';
  const height = appointment.patientHeight || appointment.patient?.height || '170 cm';
  const weight = appointment.patientWeight || appointment.patient?.weight || '68 kg';

  const pastConditions = appointment.patient?.chronicConditions && appointment.patient.chronicConditions.length > 0
    ? appointment.patient.chronicConditions
    : ['None reported'];

  const historyList = appointment.notes && appointment.notes.includes('History:')
    ? [appointment.notes.split('History:')[1].split('\n')[0].trim()]
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

          <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('clinical')}
              className={`pb-3 px-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'clinical'
                  ? 'border-habanero text-habanero'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Clinical Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('diagnostics')}
              className={`pb-3 px-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'border-habanero text-habanero'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TestTube2 className="w-4 h-4" />
              <span>Diagnostics & Labs</span>
              {diagnosticOrders.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-bold">
                  {diagnosticOrders.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'diagnostics' ? (
            <DiagnosticsOrderTab
              patientId={appointment.patientId || appointment.patient?.id || appointment.id}
              patientName={patientName}
              doctorId={appointment.doctorId}
              appointmentId={appointment.id}
              orders={diagnosticOrders}
              onOrderCreated={(order) => setDiagnosticOrders((prev) => [order, ...prev])}
              onOrderReviewed={(order) =>
                setDiagnosticOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2">
                {appointment.verifiedByAsha && (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-xs">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="text-xs">
                      <p className="font-bold text-emerald-950">
                        Verified In-Person by ASHA Worker
                        {appointment.bookedByAsha?.user?.fullName ? ` (${appointment.bookedByAsha.user.fullName})` : appointment.bookedByAsha?.workerCode ? ` (${appointment.bookedByAsha.workerCode})` : ''}
                      </p>
                      <p className="text-emerald-700 text-[11px] mt-0.5">
                        Community health worker on the ground has confirmed symptoms and patient vitals.
                        {appointment.verifiedByAshaAt && ` Verified on ${new Date(appointment.verifiedByAshaAt).toLocaleDateString()}.`}
                      </p>
                    </div>
                  </div>
                )}
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

                {/* Referrals Section */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Referral Tracking ({referrals.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsReferralOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Refer to Facility</span>
                    </button>
                  </div>

                  {referrals.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                      No active facility referrals for this patient. Click "Refer to Facility" to create one.
                    </div>
                  ) : (
                    referrals.map((ref) => (
                      <ReferralStepperCard
                        key={ref.id}
                        referral={ref}
                        canUpdate={true}
                        onStatusUpdate={handleReferralStatusUpdate}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-1">
                <AISummaryCard summary={summaryText} confidence={92} />

                <button
                  type="button"
                  onClick={() => setActiveTab('diagnostics')}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl font-bold transition shadow-2xs flex items-center justify-center gap-2 text-sm mb-3 cursor-pointer"
                >
                  <TestTube2 className="w-4 h-4 text-blue-600" />
                  <span>Diagnostics & Lab Orders ({diagnosticOrders.length})</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setIsReferralOpen(true)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-3 rounded-xl font-bold transition shadow-2xs flex items-center justify-center gap-2 text-sm mb-3 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-amber-600" />
                  Refer Patient to Facility
                </button>
                
                <button 
                  onClick={() => navigate(`/doctor/consultation/${appointment.id}`)}
                  className="w-full bg-habanero hover:bg-[#e0750e] text-white py-4 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-lg group mb-3 cursor-pointer"
                >
                  Start Consultation 
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          <ReferralModal 
            isOpen={isReferralOpen} 
            onClose={() => setIsReferralOpen(false)} 
            consultationId={appointment.id}
            patientId={appointment.patientId || appointment.patient?.id || appointment.id}
            fromDoctorId={appointment.doctorId}
            patientName={patientName} 
            onSubmit={(data) => {
              setReferrals((prev) => [data, ...prev]);
              setIsReferralOpen(false);
            }} 
          />
        </main>
      </div>
    </div>
  );
};

export default PatientDetails;
