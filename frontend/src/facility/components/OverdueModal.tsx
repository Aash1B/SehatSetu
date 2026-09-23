import React, { useState } from 'react';
import {
  Clock,
  Search,
  X,
  User,
  AlertTriangle,
  Calendar,
  Send,
  CheckCircle2,
  Baby,
} from 'lucide-react';
import type { FacilityOverdueItem } from '../../services/facilitiesApi';

interface OverdueModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueReminders: FacilityOverdueItem[];
}

export const OverdueModal: React.FC<OverdueModalProps> = ({
  isOpen,
  onClose,
  overdueReminders,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VACCINATION' | 'ANC'>('ALL');

  if (!isOpen) return null;

  const filtered = overdueReminders.filter((item) => {
    const patName = item.patient?.name || '';
    const childName = item.child?.name || '';
    const type = item.reminderType || '';
    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      childName.toLowerCase().includes(search.toLowerCase()) ||
      type.toLowerCase().includes(search.toLowerCase());

    const isVaccination = type.includes('VACCINATION');
    const isAnc = type.includes('ANC');

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'VACCINATION' && isVaccination) ||
      (typeFilter === 'ANC' && isAnc);

    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-area-pb">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-indigo-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Overdue Follow-ups & Reminders
              </h3>
              <p className="text-xs text-slate-500">
                Maternal health ANC checkups and child immunization schedules past due date
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer text-lg hover:bg-slate-100 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mother/child name, reminder type..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'VACCINATION', 'ANC'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                  typeFilter === t
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL'
                  ? `All Overdue (${overdueReminders.length})`
                  : t === 'VACCINATION'
                  ? 'Child Immunization'
                  : 'ANC Maternal Checkups'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[240px]">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No overdue follow-up reminders matching your search.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const isVaccination = item.reminderType.includes('VACCINATION');
                const patientName = item.patient?.name || 'MCH Beneficiary';
                const childName = item.child?.name;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 transition shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          {isVaccination ? (
                            <Baby className="w-4 h-4 text-purple-600" />
                          ) : (
                            <User className="w-4 h-4 text-indigo-600" />
                          )}
                          {childName ? `${childName} (Child of ${patientName})` : patientName}
                        </span>
                        {item.patient?.village && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                            {item.patient.village}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isVaccination
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {item.reminderType.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 text-rose-600 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Due Date: {new Date(item.eventDate).toLocaleDateString()}</span>
                        </span>
                        {item.patient?.phone && (
                          <span className="text-slate-600 font-medium">
                            Beneficiary Phone: {item.patient.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-extrabold">
                        {item.status} (OVERDUE)
                      </span>
                      <button
                        type="button"
                        onClick={() => alert(`ASHA worker alert dispatched for ${patientName}`)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1 min-h-[36px]"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch ASHA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {overdueReminders.length} overdue follow-ups</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer min-h-[38px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
