import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';

interface RejectDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  onConfirm: (reason: string) => Promise<void>;
}

const RejectDraftDialog: React.FC<RejectDraftDialogProps> = ({
  isOpen,
  onClose,
  patientName,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason('');
    setSubmitError('');
    onClose();
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm(reason.trim());
      setReason('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The draft could not be rejected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-deep-space flex items-center gap-2">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0" />
            <span>Reject EHR Draft</span>
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <p className="text-gray-600 mb-4 text-sm">
            Reject the AI-drafted EHR record for{' '}
            <strong>{patientName || 'this patient'}</strong>? This draft will not be
            visible to the patient. You may optionally note why this draft was
            rejected.
          </p>

          <label htmlFor="reject-reason" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Rejection reason (optional)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="e.g. Extracted diagnosis text was ambiguous, needs manual review."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-deep-space focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
          />

          {submitError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-4 mt-6">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-3 rounded-xl border border-gray-200 text-deep-space font-bold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 min-h-[44px]"
            >
              {isSubmitting ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectDraftDialog;
