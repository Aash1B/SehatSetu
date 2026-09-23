import React from 'react';
import { CalendarPlus, Eye, AlertTriangle, ShieldCheck, Phone, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CaseloadPatientItem } from '../services/ashaApi';

export interface CaseloadTableProps {
  patients: CaseloadPatientItem[];
  loading?: boolean;
}

const CaseloadTable: React.FC<CaseloadTableProps> = ({ patients, loading }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('asha');

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading caseload...</p>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <p className="text-slate-600 font-medium text-sm">{t('caseload.noPatients')}</p>
        <button
          type="button"
          onClick={() => navigate('/asha/patients/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition border-none cursor-pointer"
        >
          {t('caseload.registerButton')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ─── Mobile View: Stacked Responsive Cards (< md) ─────────────── */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {patients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 transition hover:border-emerald-200"
          >
            {/* Top row: Name, age, badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {patient.name}
                  </h3>
                  {patient.age && (
                    <span className="text-xs font-semibold text-slate-500">
                      • {patient.age}y
                    </span>
                  )}
                  {patient.gender && (
                    <span className="text-xs font-semibold text-slate-400">
                      ({patient.gender[0]})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{patient.village}</span>
                </div>
              </div>

              {/* Status / Emergency Badges */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {patient.hasEmergencyFlag && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Risk</span>
                  </span>
                )}
                {patient.isAshaRegistered && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                    <span>ASHA Reg</span>
                  </span>
                )}
              </div>
            </div>

            {/* Middle row: Phone & Last Visit */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={`tel:${patient.phone}`} className="text-emerald-700 font-semibold no-underline truncate">
                  {patient.phone}
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 justify-end truncate">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {patient.lastVisitDate ? patient.lastVisitDate : 'No visits'}
                </span>
              </div>
            </div>

            {/* Action Buttons: 44px touch targets */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/asha/book?patientId=${patient.id}`)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition min-h-[44px] border-none cursor-pointer shadow-xs"
              >
                <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
                <span>{t('caseload.bookAction')}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/asha/patients/${patient.id}`)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition min-h-[44px] border-none cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span>{t('caseload.viewAction')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Desktop View: Structured Table (≥ md) ───────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="table-responsive-wrapper">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">{t('caseload.table.patient')}</th>
                <th className="py-3.5 px-4">{t('caseload.table.village')}</th>
                <th className="py-3.5 px-4">{t('caseload.table.contact')}</th>
                <th className="py-3.5 px-4">{t('caseload.table.lastVisit')}</th>
                <th className="py-3.5 px-4">{t('caseload.table.status')}</th>
                <th className="py-3.5 px-4 text-right">{t('caseload.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50/60 transition">
                  {/* Patient Name & Badges */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {patient.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-snug">
                          {patient.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {patient.gender ? `${patient.gender}` : ''}
                          {patient.age ? ` • ${patient.age}y` : ''}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Village / Area */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-medium text-xs">
                      {patient.village}
                    </div>
                    {patient.assignedArea && (
                      <div className="text-[11px] text-slate-400">
                        {patient.assignedArea}
                      </div>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="py-3.5 px-4">
                    <a
                      href={`tel:${patient.phone}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1.5"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{patient.phone}</span>
                    </a>
                  </td>

                  {/* Last Visit */}
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {patient.lastVisitDate || 'No past visits'}
                  </td>

                  {/* Badges / Care status */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {patient.hasEmergencyFlag && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{t('caseload.emergencyAlert')}</span>
                        </span>
                      )}
                      {patient.isAshaRegistered ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{t('caseload.registeredByAsha')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          App User
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/asha/book?patientId=${patient.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition border-none cursor-pointer shadow-2xs"
                      >
                        <CalendarPlus className="w-3 h-3" />
                        <span>{t('caseload.bookAction')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/asha/patients/${patient.id}`)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border-none cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>{t('caseload.viewAction')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CaseloadTable;
