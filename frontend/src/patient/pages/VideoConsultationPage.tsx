import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveKitRoom, VideoConference, useRemoteParticipants } from '@livekit/components-react';
import '@livekit/components-styles';
import { ArrowLeft, Briefcase, Check, Globe, Shield, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConsultationTimer from '../../doctor/components/ConsultationTimer';

import PrescriptionViewModal from '../../common/components/PrescriptionViewModal';
import { getToken } from '../../auth/authStorage';
import LowBandwidthMode from '../../common/components/LowBandwidthMode';

interface ConsultationPrescription {
  id: string;
  createdAt: string;
  medicines?: unknown[];
  dietAdvice?: string;
}

interface ConsultationAppointment {
  prescription?: ConsultationPrescription | null;
  doctor?: { name?: string; specialty?: string; hospital?: string; experience?: string; imageUrl?: string; photoUrl?: string; user?: { fullName?: string } };
  patient?: { age?: string | number; gender?: string; user?: { fullName?: string } };
  ehrRecord?: { diagnosis?: string; notes?: string };
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  healthConcern?: string;
  symptoms?: string[];
}

const DoctorPresenceWatcher: React.FC<{ onPresenceChange: (isPresent: boolean) => void }> = ({ onPresenceChange }) => {
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    const doctorPresent = remoteParticipants.some((participant) => participant.identity.startsWith('doctor_'));
    onPresenceChange(doctorPresent);
  }, [onPresenceChange, remoteParticipants]);

  return null;
};

const VideoConsultationPage: React.FC = () => {
  const { id = '1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t: tPatient } = useTranslation('patient');
  const { t: tErrors } = useTranslation('errors');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState<boolean>(false);
  const [patientPrescription, setPatientPrescription] = useState<Record<string, unknown> | null>(null);
  const [appointment, setAppointment] = useState<ConsultationAppointment | null>(null);

  // Call duration timer
  const [secondsElapsed, setSecondsElapsed] = useState<number>(872);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Call states
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [isDoctorPresent, setIsDoctorPresent] = useState(false);
  const consultationId = id;

  useEffect(() => {
    (async () => {
      try {
        const rawToken = getToken();
        const authHeaders: Record<string, string> = rawToken ? { Authorization: `Bearer ${rawToken}` } : {};
        
        try {
          const appointmentResponse = await fetch(`/api/appointments/${encodeURIComponent(consultationId)}`, { headers: authHeaders });
          if (appointmentResponse.ok) {
            const appointmentData = await appointmentResponse.json() as ConsultationAppointment;
            setAppointment(appointmentData);
            const prescription = appointmentData.prescription;
            if (prescription) {
              setPatientPrescription({
                id: prescription.id,
                doctorName: appointmentData.doctor?.name || appointmentData.doctor?.user?.fullName || tPatient('doctor'),
                doctorSpecialty: appointmentData.doctor?.specialty || '',
                doctorHospital: appointmentData.doctor?.hospital || 'SehatSetu Digital Health Clinic',
                patientName: appointmentData.patientName || appointmentData.patient?.user?.fullName || 'Patient',
                patientAge: appointmentData.patientAge || appointmentData.patient?.age || '',
                patientGender: appointmentData.patientGender || appointmentData.patient?.gender || '',
                date: new Date(prescription.createdAt).toLocaleDateString(),
                diagnosis: appointmentData.ehrRecord?.diagnosis || appointmentData.healthConcern || '',
                symptoms: appointmentData.symptoms || [],
                medications: Array.isArray(prescription.medicines) ? prescription.medicines : [],
                dietAdvice: prescription.dietAdvice || '',
                notes: appointmentData.ehrRecord?.notes || '',
              });
            }
          }
        } catch (appErr) {
          console.warn('[Consultation] Could not load appointment details:', appErr);
        }

        const resp = await fetch(`/api/livekit/token?appointmentId=${encodeURIComponent(consultationId)}`, {
          headers: authHeaders,
        });
        if (!resp.ok) throw new Error(`${tErrors('videoRoomToken')} (${resp.status})`);
        const data = await resp.json();
        if (!data.token || !data.serverUrl) throw new Error(tErrors('videoRoomConfig'));
        setToken(data.token);
        setServerUrl(data.serverUrl);
        setConnectionError('');
      } catch (e) {
        console.error(e);
        setConnectionError(e instanceof Error ? e.message : tErrors('videoRoomConnect'));
      }
    })();
  }, [consultationId, tErrors]);

  // Timer interval effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  const handleEndCall = async () => {
    setIsTimerRunning(false);
    try {
      await fetch('/api/livekit/end-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          appointmentId: id || '1',
          durationSeconds: secondsElapsed,
          notes: tErrors('consultationEnded'),
        }),
      });
    } catch (err) {
      console.warn('Could not post end-consultation queue job:', err);
    }

    // Poll up to 3 times (1.5s apart) for the prescription — the doctor may have
    // confirmed it just moments before the patient disconnected.
    const MAX_ATTEMPTS = 3;
    const POLL_INTERVAL_MS = 1500;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      try {
        const response = await fetch(`/api/appointments/${encodeURIComponent(consultationId)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const latest = response.ok ? await response.json() as ConsultationAppointment : null;
        if (latest?.prescription) {
          const rx = latest.prescription;
          setPatientPrescription({
            id: rx.id,
            doctorName: latest.doctor?.name || latest.doctor?.user?.fullName || tPatient('doctor'),
            doctorSpecialty: latest.doctor?.specialty || '',
            doctorHospital: latest.doctor?.hospital || 'SehatSetu Digital Health Clinic',
            patientName: latest.patientName || latest.patient?.user?.fullName || 'Patient',
            patientAge: latest.patientAge || latest.patient?.age || '',
            patientGender: latest.patientGender || latest.patient?.gender || '',
            date: new Date(rx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            diagnosis: latest.ehrRecord?.diagnosis || latest.healthConcern || '',
            symptoms: latest.symptoms || [],
            medications: Array.isArray(rx.medicines) ? rx.medicines : [],
            dietAdvice: rx.dietAdvice || '',
            notes: latest.ehrRecord?.notes || '',
          });
          setShowPrescriptionModal(true);
          return;
        }
      } catch (error) {
        console.warn(`[Prescription] Poll attempt ${attempt + 1} failed:`, error);
      }
    }
    navigate('/patient/dashboard');
  };

  const handleEndCallTrigger = async () => {
    await handleEndCall();
  };

  const doctorName = appointment?.doctor?.name || appointment?.doctor?.user?.fullName || tPatient('doctor');
  const doctorImageUrl = appointment?.doctor?.imageUrl || appointment?.doctor?.photoUrl;
  const doctorInitials = doctorName.split(/\s+/).filter(Boolean).slice(-2).map((part: string) => part[0]).join('').toUpperCase();

  return (
    <div className="consultation-page flex h-dvh bg-[#F8FAFC] font-sans text-deep-space">
      <main className="consultation-page-main flex-1 flex flex-col h-full min-h-0">
        {/* Header Area */}
        <div className="consultation-page-header shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/patient/dashboard')}
              className="consultation-back-button text-gray-500 hover:text-deep-space transition-colors"
            >
              <ArrowLeft className="consultation-back-icon" aria-hidden="true" />
              <span>{tPatient('videoConsultation.backToDashboard')}</span>
            </button>
          </div>
          <ConsultationTimer />
        </div>

        {/* Main Consultation Area */}
        <div className="consultation-content flex-1 min-h-0 p-6">
          <div className="consultation-layout">
            
            {/* Left Column: Video & Controls */}
            <div className="consultation-video-column flex flex-col h-full gap-4">
              <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-deep-space shadow-sm border border-gray-200">
                {token && serverUrl ? (
                  <LiveKitRoom
                    connect={Boolean(token && serverUrl)}
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    data-lk-theme="default"
                    style={{ height: '100%', minHeight: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}
                    onDisconnected={handleEndCallTrigger}
                    onError={(error) => setConnectionError(error.message)}
                  >
                    <DoctorPresenceWatcher onPresenceChange={setIsDoctorPresent} />
                    <LowBandwidthMode />
                    <VideoConference />
                  </LiveKitRoom>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-white/40 flex flex-col items-center gap-3">
                      <User className="w-20 h-20" />
                      <p className="font-medium text-lg">{connectionError || `${appointment?.doctor?.name || appointment?.doctor?.user?.fullName || tPatient('doctor')} (${tPatient('videoConsultation.connecting')})`}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: Doctor Details & Chat */}
            <aside className="consultation-side-panel">
              <section className="consultation-doctor-card">
                <div className="consultation-doctor-topline">
                  <span className={`consultation-live-dot${isDoctorPresent ? '' : ' waiting'}`}>
                    {isDoctorPresent ? (
                      <i />
                    ) : (
                      <span className="consultation-waiting-indicator" aria-hidden="true">
                        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
                      </span>
                    )}
                    {tPatient(isDoctorPresent ? 'videoConsultation.doctorOnline' : 'videoConsultation.waitingForDoctor')}
                  </span>
                  <span className="consultation-secure-chip"><Shield /> {tPatient('videoConsultation.secure')}</span>
                </div>
                <div className="consultation-doctor-identity">
                  <div className="consultation-doctor-avatar">
                    {doctorImageUrl && (
                      <img
                        src={doctorImageUrl}
                        alt={doctorName}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span aria-hidden="true">{doctorInitials}</span>
                    <span className="consultation-doctor-check" aria-label="Verified doctor">
                      <Check />
                    </span>
                  </div>
                  <div>
                    <h3>{appointment?.doctor?.name || appointment?.doctor?.user?.fullName || tPatient('doctor')}</h3>
                    <p>{appointment?.doctor?.specialty || ''}</p>
                    <span className="consultation-clinic-label">{appointment?.doctor?.hospital || tPatient('videoConsultation.clinic')}</span>
                  </div>
                </div>
                <div className="consultation-doctor-facts">
                  <div className="consultation-doctor-fact">
                    <Briefcase className="consultation-doctor-fact-icon" aria-hidden="true" />
                    <strong>{appointment?.doctor?.experience || tPatient('videoConsultation.notProvided')}</strong>
                  </div>
                  <div className="consultation-doctor-fact">
                    <Globe className="consultation-doctor-fact-icon" aria-hidden="true" />
                    <strong>{tPatient('videoConsultation.engHindi')}</strong>
                  </div>
                </div>
                <div className="consultation-session-strip">
                  <span>
                    <span className="consultation-progress-indicator" aria-hidden="true">
                      {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
                    </span>
                    {tPatient('videoConsultation.consultationInProgress')}
                  </span>
                </div>
              </section>
            </aside>

          </div>
        </div>

      </main>

      {/* Real-time Prescription View Modal when Consultation Ends */}
      <PrescriptionViewModal 
        isOpen={showPrescriptionModal}
        isModal={true}
        onClose={() => {
          setShowPrescriptionModal(false);
          navigate('/patient/dashboard');
        }}
        data={patientPrescription || undefined}
      />
    </div>
  );
};

export default VideoConsultationPage;
