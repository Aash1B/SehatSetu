import React, { useState } from 'react';
import {
  Users,
  Search,
  X,
  Calendar,
  Clock,
  User,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type { FacilityAppointmentItem } from '../../services/facilitiesApi';

interface ConsultationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultations: FacilityAppointmentItem[];
}

export const ConsultationsModal: React.FC<ConsultationsModalProps> = ({
  isOpen,
  onClose,
  consultations,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'WAITING' | 'SCHEDULED'>('ALL');

  if (!isOpen) return null;

  const filtered = consultations.filter((c) => {
    const patName = c.patient?.name || c.patientName || '';
    const docName = c.doctor?.name || '';
    const concern = c.healthConcern || '';
    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      docName.toLowerCase().includes(search.toLowerCase()) ||
      concern.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-area-pb">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Consultations & Clinical Encounters
              </h3>
              <p className="text-xs text-slate-500">
                Live database feed of OPD consultations and patient appointments
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
              placeholder="Search by patient, doctor, concern..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'COMPLETED', 'WAITING', 'SCHEDULED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? `All (${consultations.length})` : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[240px]">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No consultations found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const patientName = item.patient?.name || item.patientName || 'Anonymous Patient';
                const doctorName = item.doctor?.name || 'Dr. On-Duty';
                const isCompleted = item.status === 'COMPLETED';
                const isEmergency = item.priority === 'EMERGENCY' || item.urgency === 'emergency';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 transition shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {patientName}
                        </span>
                        {item.patient?.age && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({item.patient.age}y, {item.patient.gender || 'Patient'})
                          </span>
                        )}
                        {item.patient?.village && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                            {item.patient.village}
                          </span>
                        )}
                        {isEmergency && (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                            Urgent / Emergency
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-blue-500" />
                          <span>{doctorName}</span>
                          {item.doctor?.specialty && (
                            <span className="text-slate-400">· {item.doctor.specialty}</span>
                          )}
                        </span>
                        {item.healthConcern && (
                          <span className="text-slate-600 font-medium">
                            Reason: <span className="text-slate-800 font-semibold">{item.healthConcern}</span>
                          </span>
                        )}
                      </div>

                      {item.symptoms && item.symptoms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {item.symptoms.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-blue-50/70 text-blue-800 border border-blue-100 px-2 py-0.5 rounded-md font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.status === 'WAITING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{item.status}</span>
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.date || new Date(item.createdAt).toLocaleDateString()} {item.timeSlot || ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {consultations.length} records</span>
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
