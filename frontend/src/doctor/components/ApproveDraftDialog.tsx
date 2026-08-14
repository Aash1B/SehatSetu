import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface ApproveDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  onConfirm: () => Promise<void>;
}

const ApproveDraftDialog: React.FC<ApproveDraftDialogProps> = ({
  isOpen,
  onClose,
  patientName,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError('');
    onClose();
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The draft could not be approved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-deep-space flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Approve EHR Draft
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-2 text-sm">
            Approve the AI-drafted EHR record for{' '}
            <strong>{patientName || 'this patient'}</strong>?
          </p>
          <p className="text-gray-500 mb-6 text-xs">
            Once approved, this record becomes VERIFIED and will be visible to
            the patient. This action cannot be undone from this screen.
          </p>

          {submitError && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-deep-space font-bold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-[#9BACD8] text-slate-900 font-bold hover:bg-[#8ba0d2] transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Approving…' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApproveDraftDialog;
