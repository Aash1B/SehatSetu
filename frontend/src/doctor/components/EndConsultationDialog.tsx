import React from 'react';
import { X, CheckCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EndConsultationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  onConfirmRx?: () => void;
}

const EndConsultationDialog: React.FC<EndConsultationDialogProps> = ({
  isOpen,
  onClose,
  consultationId,
  onConfirmRx
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleEndAndConfirmPrescription = async () => {
    // Generate confirmed prescription object from doctor's consultation data
    const confirmedPrescription = {
      id: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorName: "Dr. Ananya Sharma",
      doctorSpecialty: "General Physician & Telehealth Specialist",
      doctorRegNo: "MCI-IND-98742",
      doctorHospital: "SehatSetu Digital Health Clinic",
      patientName: "Sunita Devi",
      patientAge: 31,
      patientGender: "Female",
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      diagnosis: "Acute Viral Fever with Body Ache",
      symptoms: ["Persistent Fever (4 days)", "Body ache & Fatigue"],
      medications: [
        { name: "Tab. Paracetamol 650mg", dosage: "650 mg", frequency: "1-0-1", duration: "5 days", timing: "After Food" },
        { name: "Tab. Cetirizine 10mg", dosage: "10 mg", frequency: "0-0-1", duration: "3 days", timing: "SOS at Night" }
      ],
      dietAdvice: "Increase fluid intake (min 3L/day), avoid spicy and oily foods, take warm water & rest.",
      notes: "Follow up in 5 days if fever persists. Complete CBC & Dengue NS1 test if body ache continues."
    };

    // Save prescription to local storage for both doctor & patient sync
    localStorage.setItem(`prescription_${consultationId}`, JSON.stringify(confirmedPrescription));
    localStorage.setItem('sehatsetu_active_prescription', JSON.stringify(confirmedPrescription));

    try {
      await fetch('/api/livekit/end-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: consultationId,
          notes: 'Consultation ended and prescription confirmed by doctor.',
          prescription: confirmedPrescription,
        }),
      });
    } catch (err) {
      console.warn('Could not post end-consultation queue job:', err);
    }

    onClose();
    if (onConfirmRx) {
      onConfirmRx();
    } else {
      navigate('/doctor/dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-deep-space flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            End Consultation & Send Rx
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-900 flex items-start gap-2">
            <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-blue-950">Prescription Sync</span>
              Ending the call will publish the official prescription directly to both doctor and patient screens.
            </div>
          </div>

          <p className="text-gray-600 mb-6 text-sm">
            Are you sure you want to end this video call and generate the final prescription for <strong>Sunita Devi</strong>?
          </p>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-deep-space font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleEndAndConfirmPrescription}
              className="flex-1 py-3 rounded-xl bg-habanero text-white font-bold hover:bg-[#e0750e] transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Confirm & Send Rx</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndConsultationDialog;
