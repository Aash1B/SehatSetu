import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Users,
  Share2,
  AlertTriangle,
  TestTube2,
  Pill,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  CheckCircle2,
  XCircle,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import StatCard from '../../doctor/components/StatCard';
import { LiquidLoader } from '../../common/components/LiquidLoader';
import {
  fetchAllFacilities,
  fetchFacilityDashboard,
  updateMedicineStock,
  type FacilityRecord,
  type FacilityDashboardMetrics,
  type MedicineStockRecord,
} from '../../services/facilitiesApi';

export const FacilityDashboardPage: React.FC = () => {
  const { t } = useTranslation('facility');
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('fac-phc-rampur');
  const [dashboardData, setDashboardData] = useState<FacilityDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Search states for inventory table
  const [inventorySearch, setInventorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Stock edit modal
  const [editingStock, setEditingStock] = useState<MedicineStockRecord | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('AVAILABLE');
  const [savingStock, setSavingStock] = useState(false);

  // Load facilities list
  useEffect(() => {
    fetchAllFacilities()
      .then((data) => {
        setFacilities(data);
        if (data.length > 0 && !data.some((f) => f.id === selectedFacilityId)) {
          setSelectedFacilityId(data[0].id);
        }
      })
      .catch((e) => console.warn('Could not load facilities list', e));
  }, []);

  const loadDashboard = async (facilityId: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchFacilityDashboard(facilityId);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to load facility dashboard', err);
      setError(err?.message || 'Failed to load facility operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFacilityId) {
      loadDashboard(selectedFacilityId);
    }
  }, [selectedFacilityId]);

  const handleOpenEdit = (stock: MedicineStockRecord) => {
    setEditingStock(stock);
    setEditQty(stock.quantity ?? 0);
    setEditStatus(stock.status);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    try {
      setSavingStock(true);
      const updated = await updateMedicineStock(selectedFacilityId, editingStock.id, {
        quantity: Number(editQty),
        status: editStatus,
      });

      // Update local state
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          inventory: dashboardData.inventory.map((s) => (s.id === updated.id ? updated : s)),
        });
      }
      setEditingStock(null);
    } catch (err) {
      console.error('Failed updating stock', err);
    } finally {
      setSavingStock(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <LiquidLoader text={t('common.loading', 'Loading Facility Dashboard...')} />
      </div>
    );
  }

  const facility = dashboardData?.facility;
  const metrics = dashboardData?.metrics;
  const inventory = dashboardData?.inventory || [];

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.medicineName.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {facility?.name || t('title', 'Primary Health Centre (PHC) Operations Portal')}
                </h1>
                {facility?.type && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                    {facility.type}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>
                  {facility?.village ? `${facility.village}, ` : ''}
                  {facility?.district || 'Rampur'}, Uttar Pradesh
                </span>
              </p>
            </div>
          </div>

          {/* Controls: Facility Selector & LanguageSwitcher */}
          <div className="flex items-center gap-2 self-stretch sm:self-center justify-between sm:justify-end flex-wrap sm:flex-nowrap">
            {/* Facility Selector Dropdown */}
            <div className="relative flex-1 sm:flex-none max-w-[170px] xs:max-w-[210px] sm:max-w-xs">
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full truncate appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[44px]"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => loadDashboard(selectedFacilityId)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Refresh Dashboard"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <LanguageSwitcher align="right" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Core 6 StatCards Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              {t('overview', 'Key Health & Operations Metrics')}
            </h2>
            <span className="text-xs text-slate-400 font-medium">Real-time sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Consultations */}
            <StatCard
              title={t('consultationsTitle', 'Consultations')}
              subtitle={`${metrics?.consultations.completed ?? 0} ${t('completed', 'completed')} (${metrics?.consultations.total ?? 0} ${t('total', 'total')})`}
              value={metrics?.consultations.completed ?? 0}
              icon={Users}
              iconColorClass="text-blue-600"
              badgeBgClass="bg-blue-50 border-blue-200"
            />

            {/* 2. Incoming Referrals */}
            <StatCard
              title={t('referralsTitle', 'Incoming Referrals')}
              subtitle={`${metrics?.referrals.completed ?? 0} ${t('visited', 'visited')} · ${metrics?.referrals.total ?? 0} ${t('total', 'total')}`}
              value={metrics?.referrals.pending ?? 0}
              icon={Share2}
              iconColorClass="text-amber-600"
              badgeBgClass="bg-amber-50 border-amber-200"
            />

            {/* 3. High-Risk Cases */}
            <StatCard
              title={t('highRiskTitle', 'High-Risk Cases')}
              subtitle={`${metrics?.highRiskCases.appointments ?? 0} ${t('urgentFlags', 'urgent triage flags')}`}
              value={metrics?.highRiskCases.total ?? 0}
              icon={AlertTriangle}
              iconColorClass="text-rose-600"
              badgeBgClass="bg-rose-50 border-rose-200"
            />

            {/* 4. Diagnostic Coordination */}
            <StatCard
              title={t('diagnosticsTitle', 'Diagnostic Orders')}
              subtitle={`${metrics?.diagnosticOrders.completed ?? 0} ${t('reviewed', 'results reviewed & synced')}`}
              value={metrics?.diagnosticOrders.pending ?? 0}
              icon={TestTube2}
              iconColorClass="text-teal-600"
              badgeBgClass="bg-teal-50 border-teal-200"
            />

            {/* 5. Medicine Inventory Shortages */}
            <StatCard
              title={t('medicineShortagesTitle', 'Medicine Shortages')}
              subtitle={`${metrics?.medicineInventory.outOfStock ?? 0} ${t('outOfStock', 'out')} · ${metrics?.medicineInventory.lowStock ?? 0} ${t('lowStock', 'low stock')}`}
              value={metrics?.medicineInventory.shortages ?? 0}
              icon={Pill}
              iconColorClass="text-red-600"
              badgeBgClass="bg-red-50 border-red-200"
            />

            {/* 6. Overdue Follow-ups */}
            <StatCard
              title={t('overdueTitle', 'Overdue Follow-ups')}
              subtitle={`${metrics?.overdueFollowUps.total ?? 0} ${t('remindersOverdue', 'vaccination / ANC reminders')}`}
              value={metrics?.overdueFollowUps.total ?? 0}
              icon={Clock}
              iconColorClass="text-indigo-600"
              badgeBgClass="bg-indigo-50 border-indigo-200"
            />
          </div>
        </section>

        {/* Section 2: Real-time Medicine Stock Management */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {t('inventoryTitle', 'Facility Medicine Stock & Shortage Monitoring')}
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  'inventorySubtitle',
                  'Live dispensary stock levels — adjust quantities or flag shortages in real time',
                )}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center shrink-0 ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center shrink-0 ${
                  statusFilter === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                In Stock ({inventory.filter((s) => s.status === 'AVAILABLE').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LOW_STOCK')}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center shrink-0 ${
                  statusFilter === 'LOW_STOCK'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Low Stock ({inventory.filter((s) => s.status === 'LOW_STOCK').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OUT_OF_STOCK')}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center shrink-0 ${
                  statusFilter === 'OUT_OF_STOCK'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Out of Stock ({inventory.filter((s) => s.status === 'OUT_OF_STOCK').length})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              placeholder="Search medicine in this facility..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[44px]"
            />
          </div>

          {/* Mobile Card Layout (< md) */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredInventory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                No medicines matching criteria in this facility.
              </div>
            ) : (
              filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">
                        {item.medicineName}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    {item.status === 'AVAILABLE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>In Stock</span>
                      </span>
                    ) : item.status === 'LOW_STOCK' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Low Stock</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Out of Stock</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-xs text-slate-400">Available: </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {item.quantity ?? 0} units
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition cursor-pointer min-h-[44px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Stock</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Inventory Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4">Quantity Available</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No medicines matching criteria in this facility.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.medicineName}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'AVAILABLE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>In Stock</span>
                          </span>
                        ) : item.status === 'LOW_STOCK' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Out of Stock</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        {item.quantity ?? 0} units
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition cursor-pointer min-h-[44px]"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Quick Edit Stock Modal */}
      {editingStock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-area-pb">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 truncate pr-2">
                Update Stock: {editingStock.medicineName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStock(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer text-lg"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Quantity (units)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Availability Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer min-h-[44px]"
                >
                  <option value="AVAILABLE">AVAILABLE (In Stock)</option>
                  <option value="LOW_STOCK">LOW_STOCK (Below Threshold)</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK (Shortage)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStock}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition shadow-2xs cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  {savingStock ? 'Saving...' : 'Save Stock Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityDashboardPage;
