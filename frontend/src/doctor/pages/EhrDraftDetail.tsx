import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, FileText, Pill, Activity, StickyNote, XCircle } from 'lucide-react';
import DoctorSidebar from '../components/DoctorSidebar';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import ApproveDraftDialog from '../components/ApproveDraftDialog';
import RejectDraftDialog from '../components/RejectDraftDialog';
import { getEhrDraft, approveEhrDraft, rejectEhrDraft, EhrSessionError } from '../services/ehrApi';
import { clearAuth } from '../../auth/authStorage';
import { EhrDraftStatus } from '../../types';
import type { EhrDraftRecord } from '../../types';
import { ehrStatusBadgeVariant, ehrStatusLabel } from '../utils/ehrDraftStatus';

const EhrDraftDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<EhrDraftRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDraft = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEhrDraft(id);
      setDraft(data);
    } catch (err) {
      if (err instanceof EhrSessionError) {
        clearAuth();
        navigate('/doctor/login', { replace: true, state: { from: `/doctor/ehr-drafts/${id}` } });
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to load this EHR draft.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  const handleBack = () => navigate('/doctor/ehr-drafts');

  const handleApprove = async () => {
    if (!id) return;
    const updated = await approveEhrDraft(id);
    setDraft(updated);
    setIsApproveOpen(false);
    setActionFeedback({ type: 'success', message: 'Draft approved and marked VERIFIED. The patient can now see this record.' });
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    const updated = await rejectEhrDraft(id, reason || undefined);
    setDraft(updated);
    setIsRejectOpen(false);
    setActionFeedback({ type: 'success', message: 'Draft rejected. It will not be shown to the patient.' });
  };

  const patientName = draft?.patient?.user?.fullName || 'Unknown Patient';
  const isPending = draft?.status === EhrDraftStatus.DRAFT;
  const vitals = draft?.structuredData?.vitals && typeof draft.structuredData.vitals === 'object'
    ? Object.entries(draft.structuredData.vitals).filter(([, value]) => value !== null && value !== undefined && value !== '')
    : [];
  const medications = Array.isArray(draft?.structuredData?.medications) ? draft!.structuredData!.medications as string[] : [];

  if (loading) {
    return (
      <div className="flex h-screen bg-luster-white font-sans text-deep-space">
        <DoctorSidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-lg font-medium text-slate-600 animate-pulse">Loading EHR draft…</div>
        </main>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="flex h-screen bg-luster-white font-sans text-deep-space">
        <DoctorSidebar />
        <main className="flex-1 p-4 md:p-8">
          <PageHeader title="EHR Draft" onBack={handleBack} />
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center mt-6 shadow-sm max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-red-600 mb-2">Draft Not Found</h3>
            <p className="text-slate-600 mb-6">{error || 'This EHR draft could not be retrieved.'}</p>
            <button
              onClick={handleBack}
              className="bg-habanero text-white px-6 py-2 rounded-xl font-bold hover:bg-[#e0750e] transition-colors cursor-pointer"
            >
              Back to Pending Drafts
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deep-space">
      <DoctorSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 md:p-8">
        <PageHeader title="Review EHR Draft" onBack={handleBack} />

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6 pb-16">
            {actionFeedback && (
              <div
                className={`rounded-xl border p-4 text-sm font-semibold flex items-start gap-2 ${
                  actionFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {actionFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                {actionFeedback.message}
              </div>
            )}

            {/* Clear DRAFT / requires-review banner */}
            {isPending && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">DRAFT — Requires Doctor Review</p>
                  <p className="text-amber-800 text-xs mt-1">
                    This record was extracted automatically by AI from an uploaded medical
                    report and has not been verified. It is not visible to the patient
                    and must not be treated as a confirmed medical record until approved.
                  </p>
                </div>
              </div>
            )}

            {/* Patient + status header */}
            <SectionCard>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-deep-space">{patientName}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Created {new Date(draft.createdAt).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge label={ehrStatusLabel(draft.status)} variant={ehrStatusBadgeVariant(draft.status)} />
              </div>
            </SectionCard>

            {/* Source medical report */}
            {draft.medicalReport && (
              <SectionCard title="Source Medical Report">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{draft.medicalReport.originalFileName}</span>
                  <StatusBadge label={draft.medicalReport.reportType} variant="default" />
                </div>
              </SectionCard>
            )}

            {/* Diagnosis */}
            <SectionCard title="Diagnosis">
              {draft.diagnosis ? (
                <p className="text-sm text-slate-800 leading-relaxed">{draft.diagnosis}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No diagnosis was extracted from this report.</p>
              )}
            </SectionCard>

            {/* Medications */}
            <SectionCard title="Medications">
              {medications.length > 0 ? (
                <ul className="space-y-2">
                  {medications.map((med, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-800">
                      <Pill className="w-4 h-4 text-habanero shrink-0" />
                      {med}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">No medications were extracted from this report.</p>
              )}
            </SectionCard>

            {/* Vitals */}
            <SectionCard title="Vitals">
              {vitals.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vitals.map(([key, value]) => (
                    <div key={key} className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500 mb-1">
                        <Activity className="w-3 h-3" />
                        {key.replace(/_/g, ' ')}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No vitals were extracted from this report.</p>
              )}
            </SectionCard>

            {/* Clinical notes */}
            <SectionCard title="Clinical Notes / Findings">
              {draft.notes ? (
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap flex items-start gap-2">
                  <StickyNote className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{draft.notes}</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">No additional notes were extracted.</p>
              )}
            </SectionCard>

            {/* Already reviewed info */}
            {!isPending && (
              <SectionCard title="Review Outcome">
                <p className="text-sm text-slate-700">
                  This draft has already been {draft.status === EhrDraftStatus.VERIFIED ? 'approved' : 'rejected'}.
                  {draft.verifiedAt && (
                    <span className="text-slate-500">
                      {' '}On {new Date(draft.verifiedAt).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                    </span>
                  )}
                </p>
              </SectionCard>
            )}

            {/* Actions */}
            {isPending && (
              <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-luster-white/95 backdrop-blur-sm pt-4 pb-2">
                <button
                  onClick={() => setIsRejectOpen(true)}
                  className="flex-1 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setIsApproveOpen(true)}
                  className="flex-1 py-3 rounded-xl bg-habanero text-white font-bold hover:bg-[#e0750e] transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <ApproveDraftDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        patientName={patientName}
        onConfirm={handleApprove}
      />
      <RejectDraftDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        patientName={patientName}
        onConfirm={handleReject}
      />
    </div>
  );
};

export default EhrDraftDetail;
