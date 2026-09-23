import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  X,
  User,
  Stethoscope,
  Clock,
  Phone,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import type { FacilityAppointmentItem } from '../../services/facilitiesApi';

interface HighRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  highRiskCases: FacilityAppointmentItem[];
}

export const HighRiskModal: React.FC<HighRiskModalProps> = ({
  isOpen,
  onClose,
  highRiskCases,
}) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'EMERGENCY' | 'HIGH'>('ALL');

  if (!isOpen) return null;

  const filtered = highRiskCases.filter((item) => {
    const patName = item.patient?.name || item.patientName || '';
    const concern = item.healthConcern || '';
    const docName = item.doctor?.name || '';
    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      concern.toLowerCase().includes(search.toLowerCase()) ||
      docName.toLowerCase().includes(search.toLowerCase());

    const isEmergency = item.priority === 'EMERGENCY' || item.urgency === 'emergency';
    const matchesSeverity =
      severityFilter === 'ALL' ||
      (severityFilter === 'EMERGENCY' && isEmergency) ||
      (severityFilter === 'HIGH' && !isEmergency);

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-area-pb">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  High-Risk & Emergency Triage Queue
                </h3>
                <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patients flagged with critical vitals, acute symptoms, or urgent surgical/obstetric referral needs
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
              placeholder="Search urgent patient, triage complaint..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'EMERGENCY', 'HIGH'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                  severityFilter === sev
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev === 'ALL'
                  ? `All Urgent (${highRiskCases.length})`
                  : sev === 'EMERGENCY'
                  ? 'Immediate Emergency'
                  : 'High Priority'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[240px]">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No urgent high-risk cases matching the criteria.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const patientName = item.patient?.name || item.patientName || 'Emergency Patient';
                const doctorName = item.doctor?.name || 'Emergency Medical Officer';
                const isEmergency = item.priority === 'EMERGENCY' || item.urgency === 'emergency';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isEmergency
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                        : 'bg-amber-50/30 border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <ShieldAlert
                            className={`w-4 h-4 ${isEmergency ? 'text-rose-600 animate-bounce' : 'text-amber-600'}`}
                          />
                          {patientName}
                        </span>
                        {item.patient?.age && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({item.patient.age}y, {item.patient.gender || 'Patient'})
                          </span>
                        )}
                        {item.patient?.village && (
                          <span className="text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                            {item.patient.village}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            isEmergency
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {item.priority || 'URGENT'}
                        </span>
                      </div>

                      {item.healthConcern && (
                        <div className="text-xs bg-white/90 p-2.5 rounded-xl border border-slate-200">
                          <span className="font-extrabold text-rose-900">Triage Flag: </span>
                          <span className="text-slate-900 font-semibold">{item.healthConcern}</span>
                        </div>
                      )}

                      {item.symptoms && item.symptoms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Symptoms:</span>
                          {item.symptoms.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-rose-100/70 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-md font-semibold"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-slate-400" />
                          <span>Doctor: {doctorName}</span>
                        </span>
                        {item.patientPhone && (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{item.patientPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.date || new Date(item.createdAt).toLocaleDateString()} {item.timeSlot || ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => alert(`Initiating priority dispatch for ${patientName}`)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1 min-h-[36px]"
                      >
                        <span>Follow-up</span>
                        <ArrowRight className="w-3 h-3" />
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
          <span>{filtered.length} high-risk clinical triage encounters</span>
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
