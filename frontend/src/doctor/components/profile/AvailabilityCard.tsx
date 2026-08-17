import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { Availability, AvailabilitySlot } from '../../types/profile.types';
import { Clock, CalendarClock, Check, Save, Plus, Trash2, Copy, ChevronDown } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};
const TIME_OPTIONS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM',
];

interface TimeSlot { start: string; end: string; }
type WeeklySchedule = Record<string, TimeSlot[]>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function convertTo24Hour(timeStr: string): string {
  if (!timeStr) return '09:00';
  const parts = timeStr.split(' ');
  if (parts.length < 2) return timeStr;
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);
  if (modifier === 'PM' && h < 12) h += 12;
  if (modifier === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minutes}`;
}

/** Convert 24h "09:00" → 12h "09:00 AM" */
function convertTo12Hour(timeStr: string): string {
  if (!timeStr) return '09:00 AM';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Build a WeeklySchedule from the legacy AvailabilitySlot[] array stored in the DB.
 * The slots store "workingHours" as "HH:MM - HH:MM" (24h) or "HH:MM AM - HH:MM PM" (12h).
 */
function slotsToSchedule(slots: AvailabilitySlot[]): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  ALL_DAYS.forEach(day => { schedule[day] = []; });
  slots.forEach(slot => {
    if (!slot.isWorking || !slot.workingHours || slot.workingHours === 'Off' || slot.workingHours === 'Closed') return;
    const parts = slot.workingHours.split(' - ');
    if (parts.length !== 2) return;
    const [rawStart, rawEnd] = parts;
    // Detect whether already in 12h format (contains AM/PM) or 24h
    const is12h = /AM|PM/i.test(rawStart);
    const start = is12h ? rawStart.trim() : convertTo12Hour(rawStart.trim());
    const end = is12h ? rawEnd.trim() : convertTo12Hour(rawEnd.trim());
    schedule[slot.day] = [{ start, end }];
  });
  return schedule;
}

/** Convert WeeklySchedule back to AvailabilitySlot[] */
function scheduleToSlots(schedule: WeeklySchedule): AvailabilitySlot[] {
  return ALL_DAYS.map(day => {
    const daySlots = schedule[day] || [];
    if (daySlots.length === 0) {
      return { day, isWorking: false, workingHours: 'Off', breakTime: 'None' };
    }
    const workingHours = daySlots
      .map(s => `${convertTo24Hour(s.start)} - ${convertTo24Hour(s.end)}`)
      .join(', ');
    return { day, isWorking: true, workingHours, breakTime: 'None' };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  availability: Availability;
  onSave?: (updated: Availability) => Promise<void>;
  isSaving?: boolean;
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  Monday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Tuesday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Wednesday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Thursday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Friday: [{ start: '09:00 AM', end: '05:00 PM' }],
  Saturday: [],
  Sunday: [],
};

const AvailabilityCard: React.FC<Props> = ({ availability, onSave, isSaving = false }) => {
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [slotDuration, setSlotDuration] = useState(availability?.slotDurationMinutes || 30);
  const [status, setStatus] = useState<Availability['status']>(availability?.status || 'Available');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Initialise from prop
  useEffect(() => {
    if (availability) {
      setSlotDuration(availability.slotDurationMinutes || 30);
      setStatus(availability.status || 'Available');
      if (Array.isArray(availability.slots) && availability.slots.length > 0) {
        setSchedule(slotsToSchedule(availability.slots));
      }
    }
  }, [availability]);

  // ── Schedule mutators ─────────────────────────────────────────────────────

  const toggleDay = (day: string) => {
    setSchedule(prev => {
      const current = prev[day] || [];
      return {
        ...prev,
        [day]: current.length > 0 ? [] : [{ start: '09:00 AM', end: '05:00 PM' }],
      };
    });
  };

  const addSlot = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: '02:00 PM', end: '06:00 PM' }],
    }));
  };

  const removeSlot = (day: string, idx: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== idx),
    }));
  };

  const updateSlotTime = (day: string, idx: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => {
      const slots = [...(prev[day] || [])];
      if (slots[idx]) slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [day]: slots };
    });
  };

  const applyPreset = (preset: 'weekdays' | 'mon-sat' | 'all') => {
    setSchedule(prev => {
      const updated: WeeklySchedule = { ...prev };
      ALL_DAYS.forEach(day => {
        if (preset === 'weekdays') {
          updated[day] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day)
            ? [{ start: '09:00 AM', end: '05:00 PM' }] : [];
        } else if (preset === 'mon-sat') {
          updated[day] = day !== 'Sunday' ? [{ start: '09:00 AM', end: '05:00 PM' }] : [];
        } else {
          updated[day] = [{ start: '09:00 AM', end: '05:00 PM' }];
        }
      });
      return updated;
    });
  };

  const copyMondayToAll = () => {
    const mondaySlots = schedule['Monday']?.length ? schedule['Monday'] : [{ start: '09:00 AM', end: '05:00 PM' }];
    setSchedule(prev => {
      const updated: WeeklySchedule = { ...prev };
      ALL_DAYS.forEach(day => {
        if ((prev[day] || []).length > 0) updated[day] = mondaySlots.map(s => ({ ...s }));
      });
      return updated;
    });
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!onSave) return;
    const updated: Availability = {
      slots: scheduleToSlots(schedule),
      slotDurationMinutes: slotDuration,
      status,
    };
    await onSave(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SectionCard title="Availability & Schedule" subtitle="">
      <div className="space-y-6">

        {/* ── Controls cards (Two separate cards, dropdown arrows shifted inward to left) ───────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Slot Duration */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between gap-2 shadow-xs">
            <label className="block text-base md:text-lg font-black text-[#111144] uppercase tracking-wider">Consultation Slot Duration</label>
            <div className="relative w-full">
              <select
                value={slotDuration}
                onChange={e => setSlotDuration(Number(e.target.value))}
                className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-base font-extrabold rounded-xl pl-4 pr-12 py-2.5 focus:ring-2 focus:ring-habanero focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
              <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none stroke-[2.5]" />
            </div>
          </div>

          {/* Card 2: Overall Status */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between gap-2 shadow-xs">
            <label className="block text-base md:text-lg font-black text-[#111144] uppercase tracking-wider">Overall Doctor Status</label>
            <div className="relative w-full">
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Availability['status'])}
                className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-base font-extrabold rounded-xl pl-4 pr-12 py-2.5 focus:ring-2 focus:ring-habanero focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="Available">Available for Appointments</option>
                <option value="Busy">Busy (Limited Slots)</option>
                <option value="On Leave">On Leave / Closed</option>
              </select>
              <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* ── Day chip row ────────────────────────────────────── */}
        <div className="space-y-3">
          <span className="text-base md:text-lg lg:text-xl font-black text-[#111144] uppercase tracking-wider block mb-2">Select Practicing Days</span>

          {/* 7 day chips */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {ALL_DAYS.map(day => {
              const active = (schedule[day] || []).length > 0;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`py-2.5 sm:py-3.5 px-0.5 sm:px-1 rounded-xl text-[11px] sm:text-lg md:text-xl font-normal text-center transition-all cursor-pointer border ${active
                    ? 'bg-[#223362] text-white border-[#223362] shadow-md scale-[1.02]'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{DAY_SHORT[day]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Day-by-day shift editor ───────────────────────────────────── */}
        <div className="space-y-3">
          {ALL_DAYS.map(day => {
            const daySlots = schedule[day] || [];
            const isAvailable = daySlots.length > 0;

            return (
              <div
                key={day}
                className={`p-3.5 sm:p-4.5 rounded-2xl border transition-all ${isAvailable ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/70 border-slate-200/60 opacity-75'
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Day label + checkbox */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 shrink-0">
                    <label className="flex items-center gap-3 cursor-pointer font-normal text-slate-900 text-lg sm:text-xl md:text-2xl">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={() => toggleDay(day)}
                        className="w-5 h-5 accent-[#223382] rounded cursor-pointer"
                      />
                      <span className="w-28 font-normal">{day}</span>
                    </label>
                    {!isAvailable && (
                      <span className="text-sm font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-md">
                        Not Available on {day}s
                      </span>
                    )}
                  </div>

                  {/* Time slot rows */}
                  {isAvailable && (
                    <div className="flex-1 flex flex-col gap-2.5 sm:items-end">
                      {daySlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 flex-wrap bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-none border-slate-200"
                        >
                          <span className="text-base md:text-lg font-black text-[#111144] uppercase tracking-wider mr-1">Working Hours</span>
                          <div className="relative">
                            <select
                              value={slot.start}
                              onChange={e => updateSlotTime(day, idx, 'start', e.target.value)}
                              className="text-sm md:text-base font-extrabold pl-4 pr-10 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#F98513] outline-none cursor-pointer appearance-none shadow-2xs"
                            >
                              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none stroke-[2.5]" />
                          </div>
                          <span className="text-base font-extrabold text-slate-400 mx-1">–</span>
                          <div className="relative">
                            <select
                              value={slot.end}
                              onChange={e => updateSlotTime(day, idx, 'end', e.target.value)}
                              className="text-sm md:text-base font-extrabold pl-4 pr-10 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#F98513] outline-none cursor-pointer appearance-none shadow-2xs"
                            >
                              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none stroke-[2.5]" />
                          </div>
                          {daySlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlot(day, idx)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1"
                              title="Remove shift"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSlot(day)}
                        className="inline-flex items-center gap-1.5 text-sm md:text-base font-extrabold text-[#F98513] hover:text-[#e0730b] hover:underline cursor-pointer mt-1"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" /> Add Time Slot (Split Shift)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {saveSuccess ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-600">
              <Check className="w-4 h-4" /> Schedule saved to database!
            </span>
          ) : (
            <span className="text-sm text-gray-500 font-medium"></span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2.5 bg-[#F98513] hover:bg-[#e0750e] text-white px-8 py-3.5 rounded-2xl font-black text-base md:text-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 stroke-[2.5]" /> Save Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </SectionCard>
  );
};

export default AvailabilityCard;
