import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PrescriptionData } from '../../common/components/PrescriptionViewModal';
import { getToken } from '../../auth/authStorage';

interface EndConsultationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  onConfirmRx?: (prescription: PrescriptionData) => void;
  prescriptionData: PrescriptionData;
}

const EndConsultationDialog: React.FC<EndConsultationDialogProps> = ({
  isOpen,
  onClose,
  consultationId,
  onConfirmRx,
  prescriptionData,
}) => {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleEndAndConfirmPrescription = async () => {
    setIsSending(true);
    const confirmedPrescription = {
      id: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ...prescriptionData,
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    const submittedSymptoms = Array.isArray(confirmedPrescription.symptoms)
      ? confirmedPrescription.symptoms.filter((symptom): symptom is string => typeof symptom === 'string' && symptom.trim().length > 0)
      : [];

    try {
      const response = await fetch('/api/livekit/end-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          appointmentId: consultationId,
          notes: 'Consultation ended and prescription confirmed by doctor.',
          symptoms: submittedSymptoms,
          prescription: { ...confirmedPrescription, symptoms: submittedSymptoms },
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'The prescription could not be saved.');
      const saved = { ...confirmedPrescription, id: result?.prescription?.id || confirmedPrescription.id };
      localStorage.setItem(`prescription_${consultationId}`, JSON.stringify(saved));
      localStorage.setItem('sehatsetu_active_prescription', JSON.stringify(saved));
      onClose();
      if (onConfirmRx) onConfirmRx(saved);
      else navigate('/doctor/dashboard');
    } catch (err) {
      console.error('The prescription could not be saved.', err);
    } finally {
      setIsSending(false);
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4 text-lg !text-white !font-normal !text-left flex items-start">
            <div className="flex-1 !text-white !font-normal !text-left">
              <span className="!font-bold block !text-left !text-white">Prescription Sync</span>
              Ending the call will publish the official prescription directly to both doctor and patient screens.
            </div>
          </div>

          <p className="text-gray-600 mb-6 text-lg">
            Are you sure you want to end this video call and generate the final prescription for <strong>{prescriptionData.patientName || 'this patient'}</strong>?
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
              disabled={isSending}
              className="flex-1 py-3 rounded-xl bg-habanero text-white font-bold hover:bg-[#e0750e] transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isSending ? 'Saving Prescription…' : 'Confirm & Send Rx'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndConsultationDialog;
