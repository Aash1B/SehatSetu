import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TestTube2,
  FileCheck2,
  AlertCircle,
  Plus,
  Send,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  createDiagnosticOrder,
  reviewDiagnosticOrder,
  type DiagnosticOrderRecord,
} from '../../services/diagnosticsApi';

interface DiagnosticsOrderTabProps {
  patientId: string;
  patientName: string;
  doctorId?: string;
  appointmentId?: string;
  orders: DiagnosticOrderRecord[];
  onOrderCreated: (order: DiagnosticOrderRecord) => void;
  onOrderReviewed: (order: DiagnosticOrderRecord) => void;
}

const COMMON_TESTS = [
  { name: 'Complete Blood Count (CBC)', type: 'BLOOD' as const, inst: 'Routine fasting not mandatory' },
  { name: 'Fasting Blood Glucose (FBS)', type: 'BLOOD' as const, inst: 'Strict 8-10 hours overnight fasting required' },
  { name: 'Lipid Profile', type: 'BLOOD' as const, inst: '12 hours fasting required before sample collection' },
  { name: 'Liver Function Test (LFT)', type: 'BLOOD' as const, inst: 'Morning fasting blood sample' },
  { name: 'Kidney Function Test (KFT)', type: 'BLOOD' as const, inst: 'Hydrate well with plain water' },
  { name: 'Chest X-Ray (PA View)', type: 'IMAGING' as const, inst: 'Remove metallic ornaments and chest jewelry' },
  { name: 'Ultrasound Abdomen & Pelvis', type: 'IMAGING' as const, inst: 'Drink 1L water 1 hour prior to scan, do not void' },
  { name: 'Urine Routine & Microscopy', type: 'URINE' as const, inst: 'Collect clean catch midstream morning urine sample' },
  { name: 'ECG (12-Lead)', type: 'OTHER' as const, inst: 'Rest 10 minutes prior to recording' },
];

export const DiagnosticsOrderTab: React.FC<DiagnosticsOrderTabProps> = ({
  patientId,
  patientName,
  doctorId,
  appointmentId,
  orders,
  onOrderCreated,
  onOrderReviewed,
}) => {
  const { t } = useTranslation('doctor');
  const [testName, setTestName] = useState(COMMON_TESTS[0].name);
  const [testType, setTestType] = useState<'BLOOD' | 'IMAGING' | 'URINE' | 'OTHER'>('BLOOD');
  const [instructions, setInstructions] = useState(COMMON_TESTS[0].inst);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Review states
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleSelectCommonTest = (test: (typeof COMMON_TESTS)[0]) => {
    setTestName(test.name);
    setTestType(test.type);
    setInstructions(test.inst);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) {
      setError(t('diagnostics.nameRequired', 'Please enter a test name'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const created = await createDiagnosticOrder({
        patientId,
        orderedByDoctorId: doctorId,
        appointmentId,
        testName: testName.trim(),
        testType,
        instructions: instructions.trim() || undefined,
      });

      onOrderCreated(created);
      // Reset form to default
      setTestName(COMMON_TESTS[0].name);
      setTestType('BLOOD');
      setInstructions(COMMON_TESTS[0].inst);
    } catch (err: any) {
      setError(err?.message || t('diagnostics.orderFailed', 'Failed to create diagnostic order'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (orderId: string) => {
    if (!reviewSummary.trim()) return;
    try {
      setReviewLoading(true);
      const updated = await reviewDiagnosticOrder(orderId, reviewSummary.trim());
      onOrderReviewed(updated);
      setReviewingOrderId(null);
      setReviewSummary('');
    } catch (err: any) {
      console.error('Failed reviewing diagnostic order', err);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Order New Test Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <TestTube2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {t('diagnostics.orderNewTest', 'Order Diagnostic Investigation')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('diagnostics.orderSubtitle', 'Request lab or imaging tests for')} {patientName}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="space-y-4">
          {/* Quick Select Common Tests */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              {t('diagnostics.quickSelect', 'Quick Select Standard Test')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TESTS.map((test) => (
                <button
                  key={test.name}
                  type="button"
                  onClick={() => handleSelectCommonTest(test)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition border cursor-pointer ${
                    testName === test.name
                      ? 'bg-teal-100 border-teal-400 text-teal-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {test.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Test Name input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('diagnostics.testName', 'Test Name')} *
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                required
                placeholder="e.g. Thyroid Profile (T3, T4, TSH)"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            {/* Test Type */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('diagnostics.testType', 'Investigation Type')} *
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="BLOOD">BLOOD</option>
                <option value="IMAGING">IMAGING</option>
                <option value="URINE">URINE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              {t('diagnostics.instructions', 'Instructions for Patient & Phlebotomist / Lab (Optional)')}
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. 10 hours overnight fasting, avoid heavy breakfast"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? t('common.saving', 'Ordering...') : t('diagnostics.submitOrder', 'Order Investigation')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>{t('diagnostics.activeOrders', 'Ordered Tests & Lab Results')}</span>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {orders.length}
          </span>
        </h4>

        {orders.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400">
            {t('diagnostics.noOrders', 'No diagnostic investigations ordered for this patient yet.')}
          </div>
        ) : (
          orders.map((ord) => {
            const isReviewed = ord.status === 'REVIEWED';
            const hasReport = ord.status === 'REPORT_UPLOADED' || isReviewed;

            return (
              <div
                key={ord.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3 transition hover:shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                      <TestTube2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-extrabold text-slate-900 text-sm leading-snug">
                          {ord.testName}
                        </h5>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {ord.testType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ordered on {new Date(ord.orderedAt).toLocaleDateString()}
                        {ord.orderedByDoctor && ` by Dr. ${ord.orderedByDoctor.name}`}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                        isReviewed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : ord.status === 'REPORT_UPLOADED'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {isReviewed ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reviewed & EHR Synced</span>
                        </>
                      ) : ord.status === 'REPORT_UPLOADED' ? (
                        <>
                          <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Report Ready for Review</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{ord.status}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {ord.instructions && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                    <strong className="text-slate-800">Instructions:</strong> {ord.instructions}
                  </p>
                )}

                {/* Report link if available */}
                {ord.reportFileUrl && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700">Lab Document:</span>
                    <a
                      href={ord.reportFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:text-teal-900 font-bold underline inline-flex items-center gap-1"
                    >
                      <span>View Uploaded Report</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Review summary block */}
                {isReviewed ? (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Doctor Review Summary (Synced to EHR)</span>
                    </div>
                    <p className="text-emerald-900 leading-relaxed">{ord.resultSummary}</p>
                  </div>
                ) : (
                  /* Doctor Review Trigger */
                  <div>
                    {reviewingOrderId === ord.id ? (
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2 mt-2">
                        <label className="block text-xs font-bold text-slate-800">
                          {t('diagnostics.reviewResultTitle', 'Enter Clinical Finding / Diagnostic Summary')}
                        </label>
                        <textarea
                          rows={2}
                          value={reviewSummary}
                          onChange={(e) => setReviewSummary(e.target.value)}
                          placeholder="e.g. Hemoglobin 11.2 g/dL (mild anemia), Platelets normal. Advised oral iron supplements."
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingOrderId(null);
                              setReviewSummary('');
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl"
                          >
                            {t('buttons.cancel', 'Cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewSubmit(ord.id)}
                            disabled={reviewLoading}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs disabled:opacity-50"
                          >
                            {reviewLoading ? 'Saving...' : 'Confirm & Sync to EHR'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingOrderId(ord.id);
                            setReviewSummary(ord.resultSummary || '');
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          <span>Review & Sync to EHR</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DiagnosticsOrderTab;
