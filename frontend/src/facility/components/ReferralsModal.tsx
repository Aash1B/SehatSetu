import React, { useState } from 'react';
import {
  Share2,
  Search,
  X,
  User,
  Building2,
  Stethoscope,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { FacilityReferralItem } from '../../services/facilitiesApi';

interface ReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
  referrals: FacilityReferralItem[];
  facilityName?: string;
}

export const ReferralsModal: React.FC<ReferralsModalProps> = ({
  isOpen,
  onClose,
  referrals,
  facilityName,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  if (!isOpen) return null;

  const filtered = referrals.filter((r) => {
    const patName = r.patient?.name || '';
    const docName = r.referredByDoctor?.name || '';
    const reason = r.reason || '';
    const fac = r.recommendedFacility || '';
    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      docName.toLowerCase().includes(search.toLowerCase()) ||
      reason.toLowerCase().includes(search.toLowerCase()) ||
      fac.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-area-pb">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Incoming & Facility Referrals Desk
              </h3>
              <p className="text-xs text-slate-500">
                Patients referred to {facilityName || 'this facility'} across the regional health network
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
              placeholder="Search by patient, referring doctor, diagnosis..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'PENDING', 'SCHEDULED', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? `All (${referrals.length})` : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[240px]">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No incoming referrals found matching your search.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const patientName = item.patient?.name || 'Referred Patient';
                const doctorName = item.referredByDoctor?.name || 'Referring Physician';
                const isCompleted = item.status === 'COMPLETED' || item.status === 'VISITED';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-200 transition shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {patientName}
                        </span>
                        {item.patient?.village && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                            {item.patient.village}
                          </span>
                        )}
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                          {item.facilityType || 'PHC/CHC'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-slate-800">{item.recommendedFacility}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Stethoscope className="w-3 h-3 text-blue-500" />
                          <span>Referred by: {doctorName}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-900">Clinical Reason: </span>
                        <span>{item.reason}</span>
                        {item.followUpNotes && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            Notes: {item.followUpNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.status === 'SCHEDULED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
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
                        {item.scheduledDate ? `Due: ${new Date(item.scheduledDate).toLocaleDateString()}` : new Date(item.createdAt).toLocaleDateString()}
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
          <span>Showing {filtered.length} of {referrals.length} referrals</span>
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
