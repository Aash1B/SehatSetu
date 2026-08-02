import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import PatientMiniCard from '../components/PatientMiniCard';
import ConsultationTimer from '../components/ConsultationTimer';
import SymptomsEditor from '../components/SymptomsEditor';
import MedicineEditor from '../components/MedicineEditor';
import LabTestEditor from '../components/LabTestEditor';
import DietEditor from '../components/DietEditor';
import EndConsultationDialog from '../components/EndConsultationDialog';
import type { PatientProfile, TranscriptDTO, AIInsightDTO } from '../../types';
import { Shield, Mic } from 'lucide-react';
import { useLiveAudioTranscription } from '../../common/hooks/useLiveAudioTranscription';

// Mock Data
const mockPatient: PatientProfile = {
  id: "p2",
  name: "Sunita Devi",
  initials: "SD",
  age: 31,
  gender: "F",
  bloodGroup: "B+",
  weight: "58kg",
  height: "162cm"
};

const mockTranscripts: TranscriptDTO[] = [
  { id: '1', speaker: 'Doctor', text: 'Hello Sunita, how are you feeling today?', timestamp: '11:30 AM' },
  { id: '2', speaker: 'Patient', text: 'Doctor, my fever is not going down. It is been 4 days now.', timestamp: '11:31 AM' },
  { id: '3', speaker: 'Doctor', text: 'I see. Have you been taking the paracetamol I prescribed?', timestamp: '11:31 AM' },
  { id: '4', speaker: 'Patient', text: 'Yes, but it only goes down for a few hours and then comes back with body ache.', timestamp: '11:32 AM' },
];

const mockInsights: AIInsightDTO[] = [
  { id: '1', type: 'SUGGESTION', message: 'Fever persisting > 3 days with body ache. Consider testing for Dengue (NS1/IgM).', confidence: 92 },
  { id: '2', type: 'INFO', message: 'Patient has a history of Type 2 Diabetes.', confidence: 100 },
];

const VideoConsultation: React.FC = () => {
  const { consultationId = '1' } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const [isEndCallOpen, setIsEndCallOpen] = useState(false);
  const [token, setToken] = useState("");
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  const { isRecording, symptoms, medicines, startRecording, stopRecording } = useLiveAudioTranscription();

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/livekit/token?room=${consultationId}&username=Doctor`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [consultationId]);

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deep-space">

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Area */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/doctor/patient/${mockPatient.id}`)}
              className="text-gray-500 hover:text-deep-space font-medium text-sm transition-colors"
            >
              ← Back to Details
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
              <Shield className="w-4 h-4" />
              End-to-End Encrypted
            </div>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse shadow-md' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {isRecording ? '🔴 Listening Live Speech...' : '🎙️ Start AI Mic Listening'}
            </button>
          </div>
          <ConsultationTimer />
        </div>

        {/* Main Consultation Area */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left Column: Video & Controls */}
            <div className="lg:col-span-8 flex flex-col h-full gap-4">
              <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 shadow-sm">
                {token ? (
                  <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    data-lk-theme="default"
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    onDisconnected={() => setIsEndCallOpen(true)}
                  >
                    <VideoConference />
                  </LiveKitRoom>
                ) : (
                  <div className="flex h-full items-center justify-center text-white/50 font-medium">
                    Connecting to secure room...
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Tools */}
            <div className="lg:col-span-4 flex flex-col h-full gap-4 overflow-y-auto pr-2 pb-2 custom-scrollbar">
              <PatientMiniCard patient={mockPatient} />
              
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <SymptomsEditor className="flex-1 min-h-[200px]" aiExtractedSymptoms={symptoms} />
                <MedicineEditor className="flex-1 min-h-[200px]" aiExtractedMedicines={medicines} />
                <LabTestEditor className="flex-1 min-h-[200px]" />
                <DietEditor className="flex-1 min-h-[200px]" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <EndConsultationDialog 
        isOpen={isEndCallOpen}
        onClose={() => setIsEndCallOpen(false)}
        consultationId={consultationId}
      />
    </div>
  );
};

export default VideoConsultation;
