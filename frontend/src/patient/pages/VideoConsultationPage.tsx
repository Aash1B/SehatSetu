import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { Shield, User, MessageSquare, BadgeCheck, Clock3, Send } from 'lucide-react';
import ConsultationTimer from '../../doctor/components/ConsultationTimer';
import { getConsultationRoomId } from '../../config/consultationTestMode';

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
  doctor?: { name?: string; specialty?: string; hospital?: string; experience?: string; user?: { fullName?: string } };
  patient?: { age?: string | number; gender?: string; user?: { fullName?: string } };
  ehrRecord?: { diagnosis?: string; notes?: string };
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  healthConcern?: string;
  symptoms?: string[];
}

const VideoConsultationPage: React.FC = () => {
  const { id = '1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const consultationId = id;
  const roomId = getConsultationRoomId(consultationId);

  useEffect(() => {
    (async () => {
      try {
        const authHeaders = { Authorization: `Bearer ${getToken()}` };
        const appointmentResponse = await fetch(`/api/appointments/${encodeURIComponent(consultationId)}`, { headers: authHeaders });
        if (!appointmentResponse.ok) throw new Error('Unable to load consultation details');
        const appointmentData = await appointmentResponse.json() as ConsultationAppointment;
        setAppointment(appointmentData);
        const prescription = appointmentData.prescription;
        if (prescription) {
          setPatientPrescription({
            id: prescription.id,
            doctorName: appointmentData.doctor?.name || appointmentData.doctor?.user?.fullName || 'Doctor',
            doctorSpecialty: appointmentData.doctor?.specialty || '',
            doctorHospital: appointmentData.doctor?.hospital || 'SehatSetu Digital Health Clinic',
            patientName: appointmentData.patient?.user?.fullName || appointmentData.patientName || 'Patient',
            patientAge: appointmentData.patient?.age || appointmentData.patientAge || '',
            patientGender: appointmentData.patient?.gender || appointmentData.patientGender || '',
            date: new Date(prescription.createdAt).toLocaleDateString(),
            diagnosis: appointmentData.ehrRecord?.diagnosis || appointmentData.healthConcern || '',
            symptoms: appointmentData.symptoms || [],
            medications: Array.isArray(prescription.medicines) ? prescription.medicines : [],
            dietAdvice: prescription.dietAdvice || '',
            notes: appointmentData.ehrRecord?.notes || '',
          });
        }
        const participantName = appointmentData.patient?.user?.fullName || 'Patient';
        const resp = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(participantName)}`);
        if (!resp.ok) throw new Error(`Unable to create video-room token (${resp.status})`);
        const data = await resp.json();
        if (!data.token || !data.serverUrl) throw new Error('Video-room configuration is incomplete');
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (e) {
        console.error(e);
        setConnectionError(e instanceof Error ? e.message : 'Unable to connect to the video room');
      }
    })();
  }, [roomId, consultationId]);

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
          notes: 'Consultation ended by patient.',
        }),
      });
    } catch (err) {
      console.warn('Could not post end-consultation queue job:', err);
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
          doctorName: latest.doctor?.name || latest.doctor?.user?.fullName || 'Doctor',
          doctorSpecialty: latest.doctor?.specialty || '',
          doctorHospital: latest.doctor?.hospital || 'SehatSetu Digital Health Clinic',
          patientName: latest.patient?.user?.fullName || latest.patientName || 'Patient',
          patientAge: latest.patient?.age || latest.patientAge || '',
          patientGender: latest.patient?.gender || latest.patientGender || '',
          date: new Date(rx.createdAt).toLocaleDateString(),
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
      console.warn('Could not refresh the issued prescription:', error);
    }
    navigate('/patient/dashboard');
  };

  const handleEndCallTrigger = async () => {
    await handleEndCall();
  };

  return (
    <div className="consultation-page flex h-dvh bg-luster-white font-sans text-deep-space">
      <main className="consultation-page-main flex-1 flex flex-col h-full min-h-0">
        {/* Header Area */}
        <div className="consultation-page-header shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/patient/dashboard')}
              className="text-gray-500 hover:text-deep-space font-medium text-sm transition-colors"
            >
              ← Back to Dashboard
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
              <Shield className="w-4 h-4" />
              End-to-End Encrypted
            </div>
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
                    <LowBandwidthMode />
                    <VideoConference />
                  </LiveKitRoom>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-white/40 flex flex-col items-center gap-3">
                      <User className="w-20 h-20" />
                      <p className="font-medium text-lg">{connectionError || `${appointment?.doctor?.name || appointment?.doctor?.user?.fullName || 'Doctor'} (Connecting...)`}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: Doctor Details & Chat */}
            <aside className="consultation-side-panel">
              <section className="consultation-doctor-card">
                <div className="consultation-doctor-topline">
                  <span className="consultation-live-dot"><i /> Doctor online</span>
                  <span className="consultation-secure-chip"><Shield /> Secure</span>
                </div>
                <div className="consultation-doctor-identity">
                  <div className="consultation-doctor-avatar">
                    {(appointment?.doctor?.name || appointment?.doctor?.user?.fullName || 'Doctor').split(/\s+/).filter(Boolean).slice(-2).map((part: string) => part[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <span className="consultation-verified-label"><BadgeCheck /> Verified doctor</span>
                    <h3>{appointment?.doctor?.name || appointment?.doctor?.user?.fullName || 'Doctor'}</h3>
                    <p>{appointment?.doctor?.specialty || ''}</p>
                    <span className="consultation-clinic-label">SehatSetu Digital Health Clinic</span>
                  </div>
                </div>
                <div className="consultation-doctor-facts">
                  <div>
                    <span>Experience</span>
                    <strong>{appointment?.doctor?.experience || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span>Languages</span>
                    <strong>English, Hindi</strong>
                  </div>
                </div>
                <div className="consultation-session-strip">
                  <span><Clock3 /> Consultation in progress</span>
                  <strong>Available now</strong>
                </div>
              </section>

              <section className="consultation-chat-card">
                <header className="consultation-chat-header">
                  <span className="consultation-chat-icon"><MessageSquare /></span>
                  <div><h4>Consultation chat</h4><p>Messages are private and encrypted</p></div>
                </header>
                <div className="consultation-chat-body">
                  <div className="consultation-chat-empty">
                    <span><MessageSquare /></span>
                    <strong>Your consultation chat</strong>
                    <p>Share symptoms, questions, or anything important with your doctor during the call.</p>
                    <div className="consultation-quick-notes" aria-hidden="true">
                      <small>Ask a question</small>
                      <small>Share a symptom</small>
                    </div>
                  </div>
                </div>
                <div className="consultation-chat-composer">
                  <input type="text" placeholder="Type a message…" aria-label="Consultation message" />
                  <button type="button" aria-label="Send message"><Send /><span>Send</span></button>
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
