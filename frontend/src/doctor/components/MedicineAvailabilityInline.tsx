import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, XCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { searchMedicineAvailability, type MedicineStockRecord } from '../../services/facilitiesApi';

interface MedicineAvailabilityInlineProps {
  medicineName: string;
  className?: string;
}

export const MedicineAvailabilityInline: React.FC<MedicineAvailabilityInlineProps> = ({
  medicineName,
  className = '',
}) => {
  const { t } = useTranslation('doctor');
  const [stocks, setStocks] = useState<MedicineStockRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!medicineName || medicineName.trim().length < 3) {
      setStocks([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        // Normalize name: strip common prefixes like "Tab. ", "Cap. ", dosage numbers if any
        const cleanedName = medicineName
          .replace(/^(Tab\.?|Cap\.?|Syr\.?|Inj\.?)\s+/i, '')
          .replace(/\b\d+(\.\d+)?\s*(mg|g|ml|mcg)\b/gi, '')
          .trim();

        const results = await searchMedicineAvailability(cleanedName || medicineName);
        if (isMounted) {
          setStocks(results);
        }
      } catch (e) {
        console.warn('Medicine search failed', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [medicineName]);

  if (!medicineName || medicineName.trim().length < 3) {
    return null;
  }

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[11px] text-slate-400 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-slate-300 animate-ping" />
        <span>Checking government PHC inventory...</span>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[11px] text-slate-400 ${className}`}>
        <Building2 className="w-3 h-3 text-slate-400" />
        <span>No PHC stock records found</span>
      </div>
    );
  }

  // Find best availability
  const availableStock = stocks.find((s) => s.status === 'AVAILABLE');
  const lowStock = stocks.find((s) => s.status === 'LOW_STOCK');
  const primaryStock = availableStock || lowStock || stocks[0];

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {primaryStock.status === 'AVAILABLE' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>In Stock at {primaryStock.facilityName} ({primaryStock.quantity} left)</span>
          </span>
        ) : primaryStock.status === 'LOW_STOCK' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Low Stock at {primaryStock.facilityName} ({primaryStock.quantity} left)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Out of Stock at {primaryStock.facilityName}</span>
          </span>
        )}

        {stocks.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>{stocks.length} facilities</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {expanded && stocks.length > 1 && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 shadow-xs max-w-md animate-in fade-in duration-150">
          <p className="font-bold text-slate-700 text-[11px]">Availability across health facilities:</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {stocks.map((st) => (
              <div key={st.id} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-800 font-medium truncate max-w-[200px]">
                  {st.facilityName} <span className="text-slate-400">({st.facilityType})</span>
                </span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    st.status === 'AVAILABLE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : st.status === 'LOW_STOCK'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {st.status === 'AVAILABLE'
                    ? `${st.quantity} in stock`
                    : st.status === 'LOW_STOCK'
                      ? `${st.quantity} low`
                      : 'Out of stock'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineAvailabilityInline;
