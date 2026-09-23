import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AshaSidebar from '../components/AshaSidebar';
import AshaNavbar from '../components/AshaNavbar';
import CaseloadTable from '../components/CaseloadTable';
import { fetchCaseloadPatients, type CaseloadPatientItem } from '../services/ashaApi';

export default function PatientsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('asha');

  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [patients, setPatients] = useState<CaseloadPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatients = async (query?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCaseloadPatients(query);
      setPatients(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load caseload');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm) {
        setSearchParams({ search: searchTerm });
      } else {
        setSearchParams({});
      }
      loadPatients(searchTerm);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const clearSearch = () => {
    setSearchTerm('');
    setSearchParams({});
    loadPatients('');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      <AshaSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AshaNavbar title={t('caseload.title')} />

        <main className="flex-1 p-3 sm:p-6 md:p-8 space-y-5 max-w-7xl w-full mx-auto safe-area-pb">
          {/* Header row */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('caseload.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t('caseload.subtitle')}
            </p>
          </div>

          {/* Search bar & filters */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('caseload.searchPlaceholder')}
              className="flex-1 bg-transparent border-none text-sm text-slate-900 focus:outline-hidden placeholder:text-slate-400 min-h-[40px]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Patient Count indicator */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>{t('caseload.patientCount', { count: patients.length })}</span>
            {searchTerm && (
              <span>Filtering by &ldquo;{searchTerm}&rdquo;</span>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Caseload responsive table & mobile cards */}
          <CaseloadTable patients={patients} loading={loading} />
        </main>
      </div>
    </div>
  );
}
