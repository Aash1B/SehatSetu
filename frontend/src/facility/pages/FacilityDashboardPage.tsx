import React, { useState, useEffect, useRef } from 'react';
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
  Maximize2,
  User,
  Stethoscope,
  Calendar,
  Baby,
  Send,
  Phone,
  ShieldAlert,
  ArrowRight,
  FileText,
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
import { ConsultationsModal } from '../components/ConsultationsModal';
import { ReferralsModal } from '../components/ReferralsModal';
import { HighRiskModal } from '../components/HighRiskModal';
import { DiagnosticsModal } from '../components/DiagnosticsModal';
import { OverdueModal } from '../components/OverdueModal';
import { ShortagesModal } from '../components/ShortagesModal';

type DetailModalType =
  | 'consultations'
  | 'referrals'
  | 'highRisk'
  | 'diagnostics'
  | 'shortages'
  | 'overdue'
  | null;

type SectionTab =
  | 'INVENTORY'
  | 'CONSULTATIONS'
  | 'REFERRALS'
  | 'HIGHRISK'
  | 'DIAGNOSTICS'
  | 'OVERDUE';

export const FacilityDashboardPage: React.FC = () => {
  const { t } = useTranslation('facility');
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('fac-phc-rampur');
  const [dashboardData, setDashboardData] = useState<FacilityDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active section tab & modal state
  const [activeSectionTab, setActiveSectionTab] = useState<SectionTab>('INVENTORY');
  const [activeModal, setActiveModal] = useState<DetailModalType>(null);
  const [inventoryHighlight, setInventoryHighlight] = useState(false);
  const inventorySectionRef = useRef<HTMLDivElement>(null);

  // Filter & Search states for inventory table
  const [inventorySearch, setInventorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Generic in-section search & filters for other tabs
  const [tabSearch, setTabSearch] = useState('');

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
        const updatedInventory = dashboardData.inventory.map((s) =>
          s.id === updated.id ? updated : s,
        );

        // Recalculate shortage counts
        const outCount = updatedInventory.filter(
          (s) => s.status === 'OUT_OF_STOCK' || (s.quantity !== null && s.quantity <= 0),
        ).length;
        const lowCount = updatedInventory.filter(
          (s) => s.status === 'LOW_STOCK' || (s.quantity !== null && s.quantity > 0 && s.quantity < 10),
        ).length;
        const availCount = updatedInventory.filter(
          (s) => s.status === 'AVAILABLE' && (s.quantity === null || s.quantity >= 10),
        ).length;

        setDashboardData({
          ...dashboardData,
          inventory: updatedInventory,
          metrics: {
            ...dashboardData.metrics,
            medicineInventory: {
              ...dashboardData.metrics.medicineInventory,
              available: availCount,
              lowStock: lowCount,
              outOfStock: outCount,
              shortages: outCount + lowCount,
            },
          },
          details: dashboardData.details
            ? {
                ...dashboardData.details,
                medicineShortages: updatedInventory.filter(
                  (s) =>
                    s.status === 'OUT_OF_STOCK' ||
                    s.status === 'LOW_STOCK' ||
                    (s.quantity !== null && s.quantity < 10),
                ),
              }
            : undefined,
        });
      }
      setEditingStock(null);
    } catch (err) {
      console.error('Failed updating stock', err);
    } finally {
      setSavingStock(false);
    }
  };

  // Card click handler: open modal and optionally switch section
  const handleCardClick = (type: DetailModalType) => {
    if (type === 'consultations') {
      setActiveSectionTab('CONSULTATIONS');
      setActiveModal('consultations');
    } else if (type === 'referrals') {
      setActiveSectionTab('REFERRALS');
      setActiveModal('referrals');
    } else if (type === 'highRisk') {
      setActiveSectionTab('HIGHRISK');
      setActiveModal('highRisk');
    } else if (type === 'diagnostics') {
      setActiveSectionTab('DIAGNOSTICS');
      setActiveModal('diagnostics');
    } else if (type === 'shortages') {
      setActiveSectionTab('INVENTORY');
      setStatusFilter('OUT_OF_STOCK');
      setActiveModal('shortages');
      setInventoryHighlight(true);
      setTimeout(() => setInventoryHighlight(false), 2500);
      if (inventorySectionRef.current) {
        inventorySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (type === 'overdue') {
      setActiveSectionTab('OVERDUE');
      setActiveModal('overdue');
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
  const details = dashboardData?.details;

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.medicineName.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      className="min-h-screen text-slate-800 font-sans pb-16"
      style={{
        background: 'linear-gradient(135deg, #FEFDE8 0%, #FFF8C5 45%, #FEE36E 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-amber-200/50 sticky top-0 z-30 shadow-2xs">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ca8a04] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {facility?.name || t('title', 'Primary Health Centre (PHC) Operations Portal')}
                </h1>
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
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Core 6 StatCards Grid - ALL FULLY CLICKABLE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              {t('overview', 'Key Health & Operations Metrics')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. Consultations */}
            <StatCard
              title={t('consultationsTitle', 'Consultations')}
              subtitle={`${metrics?.consultations.completed ?? 0} ${t('completed', 'completed')} (${metrics?.consultations.total ?? 0} ${t('total', 'total')})`}
              value={metrics?.consultations.completed ?? 0}
              icon={Stethoscope}
              iconColorClass="text-blue-600"
              badgeBgClass="bg-blue-50 border-blue-200"
              onClick={() => handleCardClick('consultations')}
            />

            {/* 2. Incoming Referrals */}
            <StatCard
              title={t('referralsTitle', 'Incoming Referrals')}
              subtitle={`${metrics?.referrals.completed ?? 0} ${t('visited', 'visited')} · ${metrics?.referrals.total ?? 0} ${t('total', 'total')}`}
              value={metrics?.referrals.pending ?? 0}
              icon={Share2}
              iconColorClass="text-amber-600"
              badgeBgClass="bg-amber-50 border-amber-200"
              onClick={() => handleCardClick('referrals')}
            />

            {/* 3. High-Risk Cases */}
            <StatCard
              title={t('highRiskTitle', 'High-Risk Cases')}
              subtitle={`${metrics?.highRiskCases.appointments ?? 0} ${t('urgentFlags', 'urgent triage flags')}`}
              value={metrics?.highRiskCases.total ?? 0}
              icon={AlertTriangle}
              iconColorClass="text-rose-600"
              badgeBgClass="bg-rose-50 border-rose-200"
              onClick={() => handleCardClick('highRisk')}
            />

            {/* 4. Diagnostic Coordination */}
            <StatCard
              title={t('diagnosticsTitle', 'Diagnostic Orders')}
              subtitle={`${metrics?.diagnosticOrders.completed ?? 0} ${t('reviewed', 'results reviewed & synced')}`}
              value={metrics?.diagnosticOrders.pending ?? 0}
              icon={TestTube2}
              iconColorClass="text-teal-600"
              badgeBgClass="bg-teal-50 border-teal-200"
              onClick={() => handleCardClick('diagnostics')}
            />

            {/* 5. Medicine Inventory Shortages */}
            <StatCard
              title={t('medicineShortagesTitle', 'Medicine Shortages')}
              subtitle={`${metrics?.medicineInventory.outOfStock ?? 0} ${t('outOfStock', 'out')} · ${metrics?.medicineInventory.lowStock ?? 0} ${t('lowStock', 'low stock')}`}
              value={metrics?.medicineInventory.shortages ?? 0}
              icon={Pill}
              iconColorClass="text-red-600"
              badgeBgClass="bg-red-50 border-red-200"
              onClick={() => handleCardClick('shortages')}
            />

            {/* 6. Overdue Follow-ups */}
            <StatCard
              title={t('overdueTitle', 'Overdue Follow-ups')}
              subtitle={`${metrics?.overdueFollowUps.total ?? 0} ${t('remindersOverdue', 'vaccination / ANC reminders')}`}
              value={metrics?.overdueFollowUps.total ?? 0}
              icon={Clock}
              iconColorClass="text-indigo-600"
              badgeBgClass="bg-indigo-50 border-indigo-200"
              onClick={() => handleCardClick('overdue')}
            />
          </div>
        </section>

        {/* Section 2: Interactive Section Navigator / Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveSectionTab('INVENTORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === 'INVENTORY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-red-600" />
            <span>Dispensary Inventory ({inventory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('CONSULTATIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === 'CONSULTATIONS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Consultations ({details?.consultations.length ?? metrics?.consultations.total ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('REFERRALS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === 'REFERRALS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Incoming Referrals ({details?.referrals.length ?? metrics?.referrals.total ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('HIGHRISK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === 'HIGHRISK'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>High-Risk Triage ({details?.highRiskCases.length ?? metrics?.highRiskCases.total ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('DIAGNOSTICS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === 'DIAGNOSTICS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <TestTube2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Diagnostic Orders ({details?.diagnosticOrders.length ?? metrics?.diagnosticOrders.total ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('OVERDUE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === 'OVERDUE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Overdue Follow-ups ({details?.overdueFollowUps.length ?? metrics?.overdueFollowUps.total ?? 0})</span>
          </button>
        </div>

        {/* Section 3: Detailed Content Area Based on Active Section Tab */}

        {/* TAB 1: MEDICINE INVENTORY */}
        {activeSectionTab === 'INVENTORY' && (
          <section
            ref={inventorySectionRef}
            className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-2xs space-y-5 ${
              inventoryHighlight ? 'border-red-500 ring-4 ring-red-100 shadow-lg' : 'border-slate-200/90'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {t('inventoryTitle', 'Facility Medicine Stock & Shortage Monitoring')}
                </h3>
              </div>

              {/* Action & Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[40px] flex items-center justify-center shrink-0 ${
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
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[40px] flex items-center justify-center shrink-0 ${
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
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[40px] flex items-center justify-center shrink-0 ${
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
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[40px] flex items-center justify-center shrink-0 ${
                    statusFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Out of Stock ({inventory.filter((s) => s.status === 'OUT_OF_STOCK').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('shortages')}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer min-h-[40px] flex items-center gap-1 shrink-0"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Shortages View</span>
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
        )}

        {/* TAB 2: CONSULTATIONS FEED */}
        {activeSectionTab === 'CONSULTATIONS' && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Consultations & Clinical Encounters ({details?.consultations.length ?? 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Live database feed of clinical consults, triage admissions, and OPD attendance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('consultations')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center min-h-[40px]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Full View</span>
              </button>
            </div>

            <div className="space-y-3">
              {(details?.consultations || []).slice(0, 10).map((c) => {
                const patientName = c.patient?.name || c.patientName || 'Patient';
                const isCompleted = c.status === 'COMPLETED';
                const isEmergency = c.priority === 'EMERGENCY' || c.urgency === 'emergency';

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-blue-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {patientName}
                        </span>
                        {c.patient?.village && (
                          <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            {c.patient.village}
                          </span>
                        )}
                        {isEmergency && (
                          <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        Doctor: <strong className="text-slate-800">{c.doctor?.name || 'On Duty'}</strong>
                        {c.healthConcern ? ` · Concern: ${c.healthConcern}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {c.date || new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: INCOMING REFERRALS */}
        {activeSectionTab === 'REFERRALS' && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Incoming Referrals Desk ({details?.referrals.length ?? 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Patients routed to or within the regional network for specialized care
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('referrals')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center min-h-[40px]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Full View</span>
              </button>
            </div>

            <div className="space-y-3">
              {(details?.referrals || []).map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-amber-200 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {r.patient?.name || 'Referred Patient'}
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        {r.facilityType}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Target Facility: <strong className="text-slate-800">{r.recommendedFacility}</strong> · Referred By: {r.referredByDoctor?.name || 'Doctor'}
                  </p>
                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                    Reason: {r.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: HIGH-RISK TRIAGE */}
        {activeSectionTab === 'HIGHRISK' && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  High-Risk Triage & Emergency Alerts ({details?.highRiskCases.length ?? 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Critical medical alerts requiring immediate triage, resuscitation, or referral escalation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('highRisk')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center min-h-[40px]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Full View</span>
              </button>
            </div>

            <div className="space-y-3">
              {(details?.highRiskCases || []).map((h) => (
                <div
                  key={h.id}
                  className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {h.patient?.name || h.patientName || 'Emergency Patient'}
                      </span>
                      <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                        {h.priority || 'EMERGENCY'}
                      </span>
                    </div>
                    <p className="text-xs text-rose-950 font-medium">
                      Flag: {h.healthConcern || 'Critical symptoms detected'}
                    </p>
                    {h.symptoms && h.symptoms.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        {h.symptoms.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-rose-100 text-rose-900 px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal('highRisk')}
                    className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition cursor-pointer self-start sm:self-center"
                  >
                    View Triage Details
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: DIAGNOSTIC ORDERS */}
        {activeSectionTab === 'DIAGNOSTICS' && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Diagnostic Orders & Lab Coordination ({details?.diagnosticOrders.length ?? 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Laboratory pathology tests ordered and synced with facility clinical workstations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('diagnostics')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center min-h-[40px]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Full View</span>
              </button>
            </div>

            <div className="space-y-3">
              {(details?.diagnosticOrders || []).map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <TestTube2 className="w-4 h-4 text-teal-600" />
                        {d.testName}
                      </span>
                      <span className="text-xs text-slate-500">
                        for <strong>{d.patient?.name || 'Patient'}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Ordered By: {d.orderedByDoctor?.name || 'Physician'} · Ordered on: {new Date(d.orderedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-center">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 6: OVERDUE FOLLOW-UPS */}
        {activeSectionTab === 'OVERDUE' && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Overdue Follow-ups & Reminders ({details?.overdueFollowUps.length ?? 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Maternal ANC visits and childhood vaccinations past scheduled due date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('overdue')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center min-h-[40px]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Full View</span>
              </button>
            </div>

            <div className="space-y-3">
              {(details?.overdueFollowUps || []).map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {o.child?.name ? `${o.child.name} (Child of ${o.patient?.name})` : o.patient?.name || 'MCH Beneficiary'}
                    </span>
                    <p className="text-xs text-slate-600">
                      Type: <strong className="text-slate-800">{o.reminderType.replace(/_/g, ' ')}</strong> · Due: {new Date(o.eventDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 self-start sm:self-center">
                    {o.status} (OVERDUE)
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* POPUP MODALS FOR ALL 6 METRIC CATEGORIES */}
      <ConsultationsModal
        isOpen={activeModal === 'consultations'}
        onClose={() => setActiveModal(null)}
        consultations={details?.consultations || []}
      />

      <ReferralsModal
        isOpen={activeModal === 'referrals'}
        onClose={() => setActiveModal(null)}
        referrals={details?.referrals || []}
        facilityName={facility?.name}
      />

      <HighRiskModal
        isOpen={activeModal === 'highRisk'}
        onClose={() => setActiveModal(null)}
        highRiskCases={details?.highRiskCases || []}
      />

      <DiagnosticsModal
        isOpen={activeModal === 'diagnostics'}
        onClose={() => setActiveModal(null)}
        diagnosticOrders={details?.diagnosticOrders || []}
      />

      <ShortagesModal
        isOpen={activeModal === 'shortages'}
        onClose={() => setActiveModal(null)}
        inventory={inventory}
        onOpenEdit={handleOpenEdit}
      />

      <OverdueModal
        isOpen={activeModal === 'overdue'}
        onClose={() => setActiveModal(null)}
        overdueReminders={details?.overdueFollowUps || []}
      />

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
