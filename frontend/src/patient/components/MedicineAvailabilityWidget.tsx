import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pill,
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  searchMedicineAvailability,
  type MedicineStockRecord,
} from '../../services/facilitiesApi';

interface MedicineAvailabilityWidgetProps {
  className?: string;
  presetMedicines?: string[];
}

const COMMON_SUGGESTIONS = [
  'Paracetamol',
  'Amoxicillin',
  'Metformin',
  'Amlodipine',
  'Cetirizine',
  'Oral rehydration salts',
];

export const MedicineAvailabilityWidget: React.FC<MedicineAvailabilityWidgetProps> = ({
  className = '',
  presetMedicines = [],
}) => {
  const { t } = useTranslation('patient');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<MedicineStockRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchTerm).trim();
    if (!term) return;

    try {
      setLoading(true);
      setHasSearched(true);
      const data = await searchMedicineAvailability(term);
      setResults(data);
    } catch (err) {
      console.error('Failed to search medicine availability', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuick = (name: string) => {
    setSearchTerm(name);
    handleSearch(name);
  };

  const suggestions = Array.from(new Set([...presetMedicines, ...COMMON_SUGGESTIONS])).slice(0, 6);

  return (
    <div
      className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {t('medicineAvailability.title', 'PHC / Government Medicine Availability')}
            </h3>
            <p className="text-xs text-slate-500">
              {t(
                'medicineAvailability.subtitle',
                'Check free medicine inventory at your nearest Health Centre & Hospital',
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t(
              'medicineAvailability.searchPlaceholder',
              'Search medicine name (e.g. Paracetamol, Metformin)...',
            )}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={loading || !searchTerm.trim()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl transition shadow-2xs shrink-0 cursor-pointer"
        >
          {loading ? t('common.loading', 'Checking...') : t('buttons.search', 'Check Stock')}
        </button>
      </div>

      {/* Quick Click Suggestions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{t('medicineAvailability.quickCheck', 'Quick check:')}</span>
        </span>
        {suggestions.map((sug) => (
          <button
            key={sug}
            type="button"
            onClick={() => handleSelectQuick(sug)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200/60 text-slate-700 transition cursor-pointer"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Search Results */}
      {loading && (
        <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span>{t('medicineAvailability.searching', 'Searching facility inventories...')}</span>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
          {t(
            'medicineAvailability.noStockFound',
            'No inventory records found for this medicine across nearby facilities. Please consult your ASHA worker or doctor for alternatives.',
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-bold text-slate-700">
            {t('medicineAvailability.availableAtFacilities', 'Found in {{count}} health facilities:', {
              count: results.length,
            })}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {results.map((st) => (
              <div
                key={st.id}
                className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                      {st.facilityName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="font-medium">{st.facilityType}</span>
                      {st.village && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                            {st.village}, {st.district}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div>
                    {st.status === 'AVAILABLE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>In Stock ({st.quantity})</span>
                      </span>
                    ) : st.status === 'LOW_STOCK' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Low Stock ({st.quantity})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Out of Stock</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-100">
                  <span className="text-slate-600 font-medium">Medicine: {st.medicineName}</span>
                  <span className="text-emerald-700 font-bold">Government Free Dispensation</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineAvailabilityWidget;
