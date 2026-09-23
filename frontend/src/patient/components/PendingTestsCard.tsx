import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TestTube2,
  Clock,
  Upload,
  CheckCircle,
  FileCheck2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { uploadMedicalReport } from '../services/medicalReportsApi';
import {
  uploadDiagnosticReport,
  type DiagnosticOrderRecord,
} from '../../services/diagnosticsApi';

interface PendingTestsCardProps {
  orders: DiagnosticOrderRecord[];
  onOrderUpdated: (updated: DiagnosticOrderRecord) => void;
  className?: string;
}

export const PendingTestsCard: React.FC<PendingTestsCardProps> = ({
  orders,
  onOrderUpdated,
  className = '',
}) => {
  const { t } = useTranslation('patient');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadOrderId, setActiveUploadOrderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const pendingOrUploadedOrders = orders.filter((o) => o.status !== 'REVIEWED');
  const reviewedOrders = orders.filter((o) => o.status === 'REVIEWED');

  const handleUploadClick = (orderId: string) => {
    setActiveUploadOrderId(orderId);
    setUploadError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadOrderId) return;

    try {
      setUploading(true);
      setUploadError('');

      const targetOrder = orders.find((o) => o.id === activeUploadOrderId);
      if (!targetOrder) return;

      // 1. Reuse existing medical report upload pipeline (OCR & storage)
      const uploadedReport = await uploadMedicalReport(file, 'TEST_REPORTS');

      // 2. Link uploaded report to the diagnostic order
      const updated = await uploadDiagnosticReport(activeUploadOrderId, {
        reportId: uploadedReport.id,
        reportFileUrl: (uploadedReport as any).storagePath || `/api/medical-reports/${uploadedReport.id}`,
        resultSummary:
          uploadedReport.extractedData?.summary ||
          (uploadedReport.extractedText ? uploadedReport.extractedText.slice(0, 200) : undefined),
      });

      onOrderUpdated(updated);
    } catch (err: any) {
      console.error('Diagnostic report upload failed', err);
      setUploadError(err?.message || 'Failed uploading lab report. Please retry.');
    } finally {
      setUploading(false);
      setActiveUploadOrderId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (orders.length === 0) return null;

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 ${className}`}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
      />

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <TestTube2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {t('diagnostics.pendingTestsTitle', 'Diagnostic Tests & Lab Orders')}
            </h3>
            <p className="text-xs text-slate-500">
              {pendingOrUploadedOrders.length > 0
                ? `${pendingOrUploadedOrders.length} test(s) awaiting completion or review`
                : 'All diagnostic investigations completed & synced to EHR'}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
          {orders.length} total
        </span>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {pendingOrUploadedOrders.map((ord) => (
          <div
            key={ord.id}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 transition hover:bg-slate-50/80"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">{ord.testName}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    {ord.testType}
                  </span>
                </div>
                {ord.orderedByDoctor && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ordered by Dr. {ord.orderedByDoctor.name} ({ord.orderedByDoctor.specialty})
                  </p>
                )}
              </div>

              {/* Status pill */}
              <div>
                {ord.status === 'REPORT_UPLOADED' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Report Uploaded (Under Review)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sample / Report Pending</span>
                  </span>
                )}
              </div>
            </div>

            {ord.instructions && (
              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60">
                <strong className="text-slate-800">Preparation instructions:</strong> {ord.instructions}
              </p>
            )}

            {/* Action Row */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Date: {new Date(ord.orderedAt).toLocaleDateString()}
              </span>

              {ord.status === 'ORDERED' && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleUploadClick(ord.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploading && activeUploadOrderId === ord.id
                      ? 'Uploading & Extracting...'
                      : 'Upload Lab Report'}
                  </span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Reviewed tests summary */}
        {reviewedOrders.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reviewed Investigations (Synced to EHR)
            </h4>
            {reviewedOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-950">{ord.testName}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    EHR Verified
                  </span>
                </div>
                {ord.resultSummary && (
                  <p className="text-emerald-900 leading-relaxed pt-0.5">
                    <strong>Findings:</strong> {ord.resultSummary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingTestsCard;
