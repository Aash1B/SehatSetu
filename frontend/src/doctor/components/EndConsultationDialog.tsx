import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EndConsultationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
}

const EndConsultationDialog: React.FC<EndConsultationDialogProps> = ({ isOpen, onClose, consultationId }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-deep-space flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            End Consultation
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Are you sure you want to end this video consultation? You will be redirected to the prescription builder.
          </p>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-deep-space font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => navigate(`/doctor/prescription/${consultationId}`)}
              className="flex-1 py-3 rounded-xl bg-habanero text-white font-bold hover:bg-[#e0750e] transition-colors"
            >
              Proceed to Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndConsultationDialog;
