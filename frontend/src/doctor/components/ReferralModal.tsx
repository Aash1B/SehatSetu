import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Specialization, Priority, ReferralStatus } from '../../types';
import type { ReferralDTO } from '../../types';

export interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientId: string;
  fromDoctorId: string;
  patientName: string;
  onSubmit: (data: ReferralDTO) => void;
}

const SPECIALISTS = Object.values(Specialization);

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  consultationId,
  patientId,
  fromDoctorId,
  patientName,
  onSubmit
}) => {
  const [specialist, setSpecialist] = useState<Specialization>(Specialization.GENERAL_PHYSICIAN);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.ROUTINE);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const referralData: ReferralDTO = {
      consultationId,
      patientId,
      fromDoctorId,
      targetSpecialization: specialist,
      reason,
      additionalNotes: notes,
      priority,
      status: ReferralStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    
    onSubmit(referralData);
    
    // Reset form after submit
    setSpecialist(Specialization.GENERAL_PHYSICIAN);
    setReason('');
    setNotes('');
    setPriority(Priority.ROUTINE);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-space/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-jodhpur-tan/30">
          <div>
            <h2 className="text-xl font-bold text-deep-space">Refer to Specialist</h2>
            <p className="text-sm text-gray-500 mt-1">Patient: <span className="font-medium text-deep-space">{patientName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          <form id="referral-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Target Specialist */}
            <div>
              <label className="block text-sm font-bold text-deep-space mb-2">Target Specialist *</label>
              <select
                value={specialist}
                onChange={(e) => setSpecialist(e.target.value as Specialization)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-habanero focus:border-transparent bg-white"
              >
                {SPECIALISTS.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-bold text-deep-space mb-2">Reason for Referral *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="Briefly describe why this patient needs a referral..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-habanero focus:border-transparent resize-none"
              />
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-sm font-bold text-deep-space mb-2">Additional Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any other relevant details or past history..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-habanero focus:border-transparent resize-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-bold text-deep-space mb-3">Referral Priority *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                    priority === Priority.ROUTINE ? "border-aster-blue" : "border-gray-300 group-hover:border-aster-blue"
                  )}>
                    {priority === Priority.ROUTINE && <div className="w-2.5 h-2.5 rounded-full bg-aster-blue" />}
                  </div>
                  <input
                    type="radio"
                    name="priority"
                    value={Priority.ROUTINE}
                    checked={priority === Priority.ROUTINE}
                    onChange={() => setPriority(Priority.ROUTINE)}
                    className="hidden"
                  />
                  <span className="text-sm font-medium text-deep-space">Routine</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                    priority === Priority.URGENT ? "border-habanero" : "border-gray-300 group-hover:border-habanero"
                  )}>
                    {priority === Priority.URGENT && <div className="w-2.5 h-2.5 rounded-full bg-habanero" />}
                  </div>
                  <input
                    type="radio"
                    name="priority"
                    value={Priority.URGENT}
                    checked={priority === Priority.URGENT}
                    onChange={() => setPriority(Priority.URGENT)}
                    className="hidden"
                  />
                  <span className="text-sm font-medium text-deep-space flex items-center gap-1.5">
                    Urgent
                    <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">High</span>
                  </span>
                </label>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-jodhpur-tan/30 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-deep-space transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="referral-form"
            className="bg-habanero hover:bg-[#e0750e] text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
          >
            Send Referral
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralModal;
