import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PrescriptionViewModal from '../../common/components/PrescriptionViewModal';
import { generatePrescriptionDraft } from '../../common/services/aiApi';

const DoctorPrescription: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transcription, setTranscription] = useState('Patient reported fever for 4 days with body ache and fatigue.');
  const [medications, setMedications] = useState([
    { name: 'Tab. Paracetamol 650mg', dosage: '650 mg', frequency: '1-0-1', duration: '5 days', timing: 'After Food' },
    { name: 'Tab. Cetirizine 10mg', dosage: '10 mg', frequency: '0-0-1', duration: '3 days', timing: 'SOS at Night' }
  ]);
  const [dietRecommendations, setDietRecommendations] = useState('Increase fluid intake (min 3L/day), avoid spicy and oily foods, take warm water & rest.');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [loadedPrescription, setLoadedPrescription] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`prescription_${id}`) || localStorage.getItem('sehatsetu_active_prescription');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setLoadedPrescription(parsed);
        if (parsed.medications) setMedications(parsed.medications);
        if (parsed.dietAdvice) setDietRecommendations(parsed.dietAdvice);
        setShowPreviewModal(true);
      } catch (e) {
        console.error('Error parsing prescription:', e);
      }
    }
  }, [id]);

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', timing: '' }]);
  };

  const handleMedChange = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Confirmed Doctor Prescription</h1>
        <button 
          onClick={() => navigate('/doctor/dashboard')}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200"
        >
          ← Back to Dashboard
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Transcription & Notes */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                Real-time Consultation Summary
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </h2>
              <button
                type="button"
                disabled={isAiDrafting || !transcription.trim()}
                onClick={async () => {
                  setIsAiDrafting(true);
                  try {
                    const res = await generatePrescriptionDraft(transcription);
                    if (res && res.data && Array.isArray(res.data.medications)) {
                      setMedications(res.data.medications.map(m => ({
                        name: m.name || '',
                        dosage: m.dosage || '',
                        frequency: m.frequency || '1-0-1',
                        duration: m.duration || '5 days',
                      })));
                      if (res.data.guidance_and_followup) {
                        setDietRecommendations(res.data.guidance_and_followup);
                      }
                    }
                  } catch (err) {
                    console.error('AI Draft Error', err);
                  } finally {
                    setIsAiDrafting(false);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isAiDrafting ? '✨ AI Generating...' : '✨ Re-Draft with AI'}
              </button>
            </div>
            <textarea 
              className="w-full h-40 p-4 border border-gray-200 rounded-lg bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="Listening to conversation..."
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
            />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Diet & Lifestyle Instructions</h2>
            <textarea 
              className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
              placeholder="E.g., Low sodium diet for hypertension..."
              value={dietRecommendations}
              onChange={(e) => setDietRecommendations(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Prescription Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Confirmed Medications</h2>
          
          <div className="space-y-4">
            {medications.map((med, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                <input 
                  type="text" 
                  placeholder="Medicine Name" 
                  value={med.name}
                  onChange={(e) => handleMedChange(index, 'name', e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <input 
                  type="text" 
                  placeholder="Dosage (e.g., 650 mg)" 
                  value={med.dosage}
                  onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <input 
                  type="text" 
                  placeholder="Frequency (e.g., 1-0-1)" 
                  value={med.frequency}
                  onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <input 
                  type="text" 
                  placeholder="Duration (e.g., 5 days)" 
                  value={med.duration}
                  onChange={(e) => handleMedChange(index, 'duration', e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            ))}
          </div>
          
          <button 
            type="button"
            onClick={handleAddMedication}
            className="mt-4 text-blue-600 font-medium hover:text-blue-800 transition-colors text-sm"
          >
            + Add Another Medicine
          </button>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button 
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md cursor-pointer text-sm"
            >
              View Official Prescription PDF
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Prescription View Modal */}
      <PrescriptionViewModal 
        isOpen={showPreviewModal}
        isModal={true}
        onClose={() => setShowPreviewModal(false)}
        data={loadedPrescription || {
          doctorName: "Dr. Ananya Sharma",
          doctorSpecialty: "General Physician & Telehealth Specialist",
          patientName: "Sunita Devi",
          patientAge: 31,
          patientGender: "Female",
          medications: medications.filter(m => m.name.trim() !== ''),
          dietAdvice: dietRecommendations,
        }}
      />
    </div>
  );
};

export default DoctorPrescription;
