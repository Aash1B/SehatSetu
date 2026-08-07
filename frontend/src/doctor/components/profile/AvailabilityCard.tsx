import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { Availability } from '../../types/profile.types';
import { CalendarClock, Clock, Check, Save } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  availability: Availability;
  onSave?: (updated: Availability) => Promise<void>;
  isSaving?: boolean;
}

const AvailabilityCard: React.FC<Props> = ({ availability, onSave, isSaving = false }) => {
  const [data, setData] = useState<Availability>(availability);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setData(availability);
  }, [availability]);

  const handleStatusChange = (newStatus: Availability['status']) => {
    setData(prev => ({ ...prev, status: newStatus }));
  };

  const handleDurationChange = (minutes: number) => {
    setData(prev => ({ ...prev, slotDurationMinutes: minutes }));
  };

  const handleSlotToggle = (day: string) => {
    setData(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.day === day ? { ...s, isWorking: !s.isWorking } : s)
    }));
  };

  const handleSlotFieldChange = (day: string, field: 'workingHours' | 'breakTime', value: string) => {
    setData(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.day === day ? { ...s, [field]: value } : s)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      await onSave(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <SectionCard title="Availability & Schedule" subtitle="Configure your weekly consultation hours & slot durations">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-aster-blue" />
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Consultation Slot Duration</label>
              <select
                value={data.slotDurationMinutes}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="mt-1 bg-white border border-gray-200 text-deep-space text-sm font-semibold rounded-lg p-1.5 focus:ring-2 focus:ring-habanero focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-green-500" />
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Overall Doctor Status</label>
              <select
                value={data.status}
                onChange={(e) => handleStatusChange(e.target.value as Availability['status'])}
                className="mt-1 bg-white border border-gray-200 text-deep-space text-sm font-semibold rounded-lg p-1.5 focus:ring-2 focus:ring-habanero focus:outline-none"
              >
                <option value="Available">Available for Appointments</option>
                <option value="Busy">Busy (Limited Slots)</option>
                <option value="On Leave">On Leave / Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Weekly Day Slots */}
        <div className="space-y-3">
          {data.slots.map((slot) => (
            <div 
              key={slot.day} 
              className={cn(
                "flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border transition-colors gap-3",
                slot.isWorking ? "bg-white border-gray-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-60"
              )}
            >
              <div className="flex items-center gap-3 w-40 shrink-0">
                <input
                  type="checkbox"
                  id={`slot-${slot.day}`}
                  checked={slot.isWorking}
                  onChange={() => handleSlotToggle(slot.day)}
                  className="w-4 h-4 text-habanero rounded border-gray-300 focus:ring-habanero cursor-pointer"
                />
                <label htmlFor={`slot-${slot.day}`} className="font-bold text-sm text-deep-space cursor-pointer select-none">
                  {slot.day}
                </label>
              </div>
              
              {slot.isWorking ? (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Working Hours</span>
                    <input
                      type="text"
                      value={slot.workingHours}
                      onChange={(e) => handleSlotFieldChange(slot.day, 'workingHours', e.target.value)}
                      placeholder="e.g. 09:00 AM - 05:00 PM"
                      className="w-full text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:bg-white focus:ring-1 focus:ring-habanero focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Break Time</span>
                    <input
                      type="text"
                      value={slot.breakTime}
                      onChange={(e) => handleSlotFieldChange(slot.day, 'breakTime', e.target.value)}
                      placeholder="e.g. 01:00 PM - 02:00 PM"
                      className="w-full text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:bg-white focus:ring-1 focus:ring-habanero focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-xs text-gray-400 italic">
                  Not Available on {slot.day}s
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {saveSuccess ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-600">
              <Check className="w-4 h-4" /> Schedule saved to database!
            </span>
          ) : (
            <span className="text-xs text-gray-500 font-medium">Changes will take effect immediately for patient booking.</span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-habanero hover:bg-[#e0750e] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Schedule to Database
              </>
            )}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

export default AvailabilityCard;
