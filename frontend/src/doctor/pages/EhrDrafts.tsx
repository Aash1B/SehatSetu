import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileWarning } from 'lucide-react';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorNavbar from '../components/DoctorNavbar';
import PageHeader from '../components/PageHeader';
import EhrDraftCard from '../components/EhrDraftCard';
import { listPendingEhrDrafts, EhrSessionError } from '../services/ehrApi';
import { clearAuth } from '../../auth/authStorage';
import type { EhrDraftRecord } from '../../types';
import { LiquidLoader } from '../../common/components/LiquidLoader';

const EhrDrafts: React.FC = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<EhrDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPendingEhrDrafts();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof EhrSessionError) {
        clearAuth();
        navigate('/doctor/login', { replace: true, state: { from: '/doctor/ehr-drafts' } });
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to load pending EHR drafts.');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#F8FAFC]">
        <LiquidLoader text="Loading pending drafts" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-deep-space overflow-hidden">
      <DoctorSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <DoctorNavbar />
        <main className="flex-1 flex flex-col overflow-hidden px-8 md:px-10 pt-12 pb-10 bg-[#F8FAFC]">
        <PageHeader title="EHR Drafts — Pending Review" />

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full space-y-4 pb-12">
            <p className="text-lg md:text-xl font-extrabold text-[#223382] mb-4 leading-relaxed">
              AI-drafted EHR records extracted from uploaded medical reports. Review
              each draft and approve or reject before it becomes part of a
              patient's verified record.
            </p>

            {error ? (
              <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
                <h3 className="text-lg font-bold text-red-600 mb-2">Could not load drafts</h3>
                <p className="text-slate-600 mb-6">{error}</p>
                <button
                  onClick={fetchDrafts}
                  className="bg-habanero text-white px-6 py-2 rounded-xl font-bold hover:bg-[#e0750e] transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : drafts.length > 0 ? (
              drafts.map((draft) => (
                <EhrDraftCard
                  key={draft.id}
                  draft={draft}
                  onView={() => navigate(`/doctor/ehr-drafts/${draft.id}`)}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-jodhpur-tan/30">
                <FileWarning className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No EHR drafts are pending review.</p>
                <p className="text-sm text-slate-400 mt-1">
                  New drafts appear here after a patient's medical report is processed by AI.
                </p>
              </div>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

export default EhrDrafts;
