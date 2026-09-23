import React, { useState } from 'react';
import {
  Pill,
  Search,
  X,
  AlertTriangle,
  XCircle,
  Edit3,
  CheckCircle2,
  Package,
} from 'lucide-react';
import type { MedicineStockRecord } from '../../services/facilitiesApi';

interface ShortagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: MedicineStockRecord[];
  onOpenEdit: (item: MedicineStockRecord) => void;
}

export const ShortagesModal: React.FC<ShortagesModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onOpenEdit,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL_SHORTAGES' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('ALL_SHORTAGES');

  if (!isOpen) return null;

  const shortages = inventory.filter(
    (item) => item.status === 'OUT_OF_STOCK' || item.status === 'LOW_STOCK' || (item.quantity !== null && item.quantity < 10)
  );

  const filtered = shortages.filter((item) => {
    const matchesSearch = item.medicineName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'ALL_SHORTAGES' ||
      (filter === 'OUT_OF_STOCK' && item.status === 'OUT_OF_STOCK') ||
      (filter === 'LOW_STOCK' && item.status === 'LOW_STOCK');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-area-pb">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Medicine Shortages & Stockout Alerts
                </h3>
                <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full">
                  {shortages.length} CRITICAL
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Essential pharmacy supplies that are currently depleted or below safety buffer thresholds
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
              placeholder="Search depleted medicine..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('ALL_SHORTAGES')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                filter === 'ALL_SHORTAGES'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Shortages ({shortages.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('OUT_OF_STOCK')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                filter === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Out of Stock ({shortages.filter((s) => s.status === 'OUT_OF_STOCK').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('LOW_STOCK')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer min-h-[38px] ${
                filter === 'LOW_STOCK'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Low Stock ({shortages.filter((s) => s.status === 'LOW_STOCK').length})
            </button>
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[240px]">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No medicine shortages matching criteria. All other inventory is stocked!
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const isOut = item.status === 'OUT_OF_STOCK';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOut
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                        : 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-slate-500" />
                          {item.medicineName}
                        </span>
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                            <XCircle className="w-3 h-3" />
                            <span>OUT OF STOCK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            <span>LOW STOCK</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          Current stock level:{' '}
                          <strong className="text-slate-900 font-extrabold">
                            {item.quantity ?? 0} units
                          </strong>
                        </span>
                        <span>
                          Last updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenEdit(item);
                        }}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Stock</span>
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
          <span>{filtered.length} depleted or low supplies in this facility</span>
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
