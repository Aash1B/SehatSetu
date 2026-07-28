import React, { useState } from 'react';

const DoctorPrescription: React.FC = () => {
  const [transcription, setTranscription] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [dietRecommendations, setDietRecommendations] = useState('');

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Live Prescription</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Transcription & Notes */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center justify-between">
              Real-time Transcription
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </h2>
            <textarea 
              className="w-full h-40 p-4 border border-gray-200 rounded-lg bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Listening to conversation..."
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
            />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Diet & Nutrition (AI Suggested)</h2>
            <textarea 
              className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="E.g., Low sodium diet for hypertension..."
              value={dietRecommendations}
              onChange={(e) => setDietRecommendations(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Prescription Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Medications</h2>
          
          <div className="space-y-4">
            {medications.map((med, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                <input 
                  type="text" 
                  placeholder="Medicine Name" 
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Dosage (e.g., 500mg)" 
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Frequency (e.g., 1-0-1)" 
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Duration (e.g., 5 days)" 
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
          
          <button 
            onClick={handleAddMedication}
            className="mt-4 text-blue-600 font-medium hover:text-blue-800 transition-colors"
          >
            + Add Another Medicine
          </button>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
              Confirm & Generate Prescription PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPrescription;
