import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import PatientMiniCard from '../components/PatientMiniCard';
import ConsultationTimer from '../components/ConsultationTimer';
import SymptomsEditor from '../components/SymptomsEditor';
import MedicineEditor, { type StructuredMedicine } from '../components/MedicineEditor';
import LabTestEditor from '../components/LabTestEditor';
import DietEditor from '../components/DietEditor';
import EndConsultationDialog from '../components/EndConsultationDialog';
import PrescriptionViewModal from '../../common/components/PrescriptionViewModal';
import type { PatientProfile, TranscriptDTO, AIInsightDTO } from '../../types';
import { ArrowLeft, Mic } from 'lucide-react';
import { useLiveAudioTranscription } from '../../common/hooks/useLiveAudioTranscription';
import { getToken } from '../../auth/authStorage';
import { API_BASE_URL } from '../../patient/utils/constants';
import LowBandwidthMode from '../../common/components/LowBandwidthMode';

const VideoConsultation: React.FC = () => {
  const { id: consultationId = '1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEndCallOpen, setIsEndCallOpen] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [appointment, setAppointment] = useState<any>(null);
  const [consultationCount, setConsultationCount] = useState(1);
  const [roomConnected, setRoomConnected] = useState(true);
  const [issuedPrescription, setIssuedPrescription] = useState<any>(null);
  const [consultationSymptoms, setConsultationSymptoms] = useState<string[]>([]);
  const [consultationMedicines, setConsultationMedicines] = useState<StructuredMedicine[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [consultationLabTests, setConsultationLabTests] = useState<string[]>([]);
  const [consultationDiet, setConsultationDiet] = useState<string[]>([]);
  const intentionalEndRef = useRef(false);

  const { isRecording, symptoms, medicines, error: micError, startRecording, stopRecording } = useLiveAudioTranscription();

  React.useEffect(() => {
    (async () => {
      try {
        const appointmentResponse = await fetch(`${API_BASE_URL}/appointments/${encodeURIComponent(consultationId)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!appointmentResponse.ok) throw new Error('Unable to load consultation details');
        const appointmentData = await appointmentResponse.json();
        setAppointment(appointmentData);
        const resp = await fetch(`${API_BASE_URL}/livekit/token?appointmentId=${encodeURIComponent(consultationId)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
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
  }, [consultationId]);

  React.useEffect(() => {
    const patientId = appointment?.patient?.id || appointment?.patientId;
    if (!patientId) return;

    let cancelled = false;
    const loadConsultationCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/appointments`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!response.ok) return;
        const appointments = await response.json();
        if (!cancelled && Array.isArray(appointments)) {
          const patientVisits = appointments.filter(
            (item: any) => item.patientId === patientId || item.patient?.id === patientId,
          );
          setConsultationCount(Math.max(1, patientVisits.length));
        }
      } catch (error) {
        console.warn('Unable to load consultation history count:', error);
      }
    };

    loadConsultationCount();
    return () => {
      cancelled = true;
    };
  }, [appointment?.patient?.id, appointment?.patientId]);

  return (
    <div className="doctor-video-consultation flex h-dvh overflow-hidden bg-[#F8FAFC] font-sans text-deep-space">

      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header Area */}
        <div className="doctor-video-header shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(appointment?.patient?.id ? `/doctor/patient/${appointment.patient.id}` : '/doctor/consultations')}
              className="consultation-back-button doctor-consultation-back-button text-gray-500 hover:text-deep-space transition-colors"
            >
              <ArrowLeft className="consultation-back-icon" aria-hidden="true" />
              <span>Back</span>
            </button>
            {micError && <span className="text-xs font-semibold text-red-600">{micError} You can continue with manual entry.</span>}
          </div>
          <ConsultationTimer />
        </div>

        {/* Main Consultation Area */}
        <div className="doctor-video-main-area flex-1 min-h-0 overflow-hidden p-6">
          <div className="doctor-video-grid grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-12 gap-6">

            {/* Left Column: Video & Controls */}
            <div className="lg:col-span-8 flex flex-col h-full gap-4">
              <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 shadow-sm">
                {token && serverUrl ? (
                  <LiveKitRoom
                    connect={Boolean(token && serverUrl && roomConnected)}
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    data-lk-theme="default"
                    style={{ height: '100%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    onDisconnected={() => {
                      if (!intentionalEndRef.current) setIsEndCallOpen(true);
                    }}
                    onError={(error) => setConnectionError(error.message)}
                  >
                    <LowBandwidthMode />
                    <VideoConference />
                  </LiveKitRoom>
                ) : (
                  <div className="flex h-full items-center justify-center text-white/50 font-medium">
                    {connectionError || 'Connecting to secure room...'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Tools */}
            <div className="doctor-video-tools lg:col-span-4 flex flex-col h-full gap-4 overflow-y-auto pr-2 pb-2 custom-scrollbar">
              {appointment && <PatientMiniCard
                patient={{
                  id: appointment.patient?.id || '',
                  name: appointment.patient?.user?.fullName || appointment.patientName || 'Patient',
                  initials: (appointment.patient?.user?.fullName || appointment.patientName || 'Patient').split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(),
                  age: Number(appointment.patient?.age || appointment.patientAge || 0),
                  gender: appointment.patient?.gender || appointment.patientGender || 'Other',
                  bloodGroup: appointment.patient?.bloodGroup || appointment.patientBloodGroup,
                  weight: appointment.patient?.weight || appointment.patientWeight,
                  height: appointment.patient?.height || appointment.patientHeight,
                } as PatientProfile}
                consultationCount={consultationCount}
                consultationSummary={appointment.ehrRecord?.aiSummary || appointment.ehrRecord?.notes || appointment.notes}
                chiefComplaint={appointment.healthConcern || appointment.symptoms?.[0] || 'General medical consultation'}
              />}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <section className="rounded-2xl bg-[#9bacd8] p-3 shadow-sm border border-gray-200">
                  <label htmlFor="doctor-clinical-notes" className="mb-2 block text-base font-bold text-deep-space">
                    Doctor's Clinical Notes
                  </label>
                  <textarea
                    id="doctor-clinical-notes"
                    value={clinicalNotes}
                    onChange={(event) => setClinicalNotes(event.target.value)}
                    rows={3}
                    placeholder="Type..."
                    className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-deep-space outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                </section>
                <SymptomsEditor
                  className="flex-1 min-h-[200px]"
                  aiExtractedSymptoms={symptoms}
                  isListening={isRecording}
                  onChange={setConsultationSymptoms}
                />
                <MedicineEditor
                  className="flex-1 min-h-[200px]"
                  aiExtractedMedicines={medicines}
                  isListening={isRecording}
                  onChange={setConsultationMedicines}
                />
                <LabTestEditor className="flex-1 min-h-[200px]" isListening={isRecording} onChange={setConsultationLabTests} />
                <DietEditor className="flex-1 min-h-[200px]" isListening={isRecording} onChange={setConsultationDiet} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <EndConsultationDialog
        isOpen={isEndCallOpen}
        onClose={() => setIsEndCallOpen(false)}
        consultationId={consultationId}
        prescriptionData={{
          doctorName: appointment?.doctor?.name || appointment?.doctor?.user?.fullName || 'Doctor',
          doctorSpecialty: appointment?.doctor?.specialty || '',
          doctorHospital: appointment?.doctor?.hospital || 'SehatSetu Digital Health Clinic',
          patientName: appointment?.patientName || appointment?.patient?.user?.fullName || 'Patient',
          patientAge: appointment?.patientAge || appointment?.patient?.age || '',
          patientGender: appointment?.patientGender || appointment?.patient?.gender || '',
          diagnosis: appointment?.ehrRecord?.diagnosis || appointment?.healthConcern || '',
          symptoms: consultationSymptoms.length
            ? consultationSymptoms
            : (symptoms.length ? symptoms : (appointment?.symptoms || [])),
          medications: consultationMedicines.length
            ? consultationMedicines.map((m) => ({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              timing: m.timing,
            }))
            : [],
          dietAdvice: consultationDiet.join('\n'),
          notes: [
            clinicalNotes.trim() || appointment?.ehrRecord?.notes || appointment?.notes || '',
            consultationLabTests.length ? `Recommended lab tests: ${consultationLabTests.join(', ')}` : '',
          ].filter(Boolean).join('\n'),
        }}
        onConfirmRx={(prescription) => {
          intentionalEndRef.current = true;
          setIssuedPrescription(prescription);
          setRoomConnected(false);
          setShowRxModal(true);
        }}
      />

      <PrescriptionViewModal
        isOpen={showRxModal}
        isModal={true}
        onClose={() => {
          setShowRxModal(false);
          navigate('/doctor/dashboard');
        }}
        data={issuedPrescription || undefined}
      />
    </div>
  );
};

export default VideoConsultation;
