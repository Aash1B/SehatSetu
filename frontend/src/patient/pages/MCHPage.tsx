import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  getMchOverview, listPregnancies, listChildren,
  createPregnancy, createChild, createAncVisit,
  listAncVisits, listVaccinations, listGrowthMeasurements,
  listMilestones, createGrowthMeasurement, updateMilestone,
  listInvestigations, createInvestigation, listMchDocuments,
  listSafetyFlags, recordVaccination,
  type MchOverview, type Pregnancy, type Child, type AncVisit,
  type VaccinationRecord, type GrowthMeasurement, type Milestone,
  type Investigation, type MchDocument, type SafetyFlag,
} from '../services/mchApi';
import { clearAuth } from '../../auth/authStorage';
import { LiquidLoader } from '../../common/components/LiquidLoader';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function ageLabel(dob: string) {
  const ms = Date.now() - new Date(dob).getTime();
  const months = Math.floor(ms / (30.44 * 24 * 3600 * 1000));
  if (months < 1) return '< 1 month';
  if (months < 24) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years}y ${rem}m` : `${years} year${years !== 1 ? 's' : ''}`;
}
function severityColor(s: string) {
  if (s === 'CRITICAL') return '#dc2626';
  if (s === 'WARNING') return '#d97706';
  return '#2563eb';
}
function statusBadge(s: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    UPCOMING: { bg: '#eff6ff', color: '#2563eb' },
    DUE: { bg: '#fef3c7', color: '#92400e' },
    COMPLETED: { bg: '#d1fae5', color: '#065f46' },
    MISSED: { bg: '#fee2e2', color: '#991b1b' },
    PENDING: { bg: '#f3f4f6', color: '#374151' },
    ACHIEVED: { bg: '#d1fae5', color: '#065f46' },
    NEEDS_REVIEW: { bg: '#fef3c7', color: '#92400e' },
    ACTIVE: { bg: '#dbeafe', color: '#1e40af' },
    COMPLETED_P: { bg: '#d1fae5', color: '#065f46' },
  };
  return map[s] ?? { bg: '#f3f4f6', color: '#374151' };
}

type MCHTab = 'overview' | 'pregnancy' | 'children' | 'documents' | 'flags';
type PregnancySubTab = 'details' | 'anc' | 'investigations';
type ChildSubTab = 'vaccinations' | 'growth' | 'milestones';

// ─── Main Page ───────────────────────────────────────────────────────────────

const MCHPage: React.FC = () => {
  const { t } = useTranslation('mch');
  const navigate = useNavigate();

  const [tab, setTab] = useState<MCHTab>('overview');
  const [overview, setOverview] = useState<MchOverview | null>(null);
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedPregnancy, setSelectedPregnancy] = useState<Pregnancy | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [pregnancySubTab, setPregnancySubTab] = useState<PregnancySubTab>('details');
  const [childSubTab, setChildSubTab] = useState<ChildSubTab>('vaccinations');
  const [ancVisits, setAncVisits] = useState<AncVisit[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [growth, setGrowth] = useState<GrowthMeasurement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<MchDocument[]>([]);
  const [flags, setFlags] = useState<SafetyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Forms
  const [showPregnancyForm, setShowPregnancyForm] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [showAncForm, setShowAncForm] = useState(false);
  const [showInvForm, setShowInvForm] = useState(false);
  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Pregnancy form state
  const [pForm, setPForm] = useState({ lmpDate: '', eddUltrasound: '', gravida: '', para: '', bloodGroup: '', rhFactor: '', notes: '' });
  // ── Child form state
  const [cForm, setCForm] = useState({ name: '', dateOfBirth: '', sex: 'MALE', bloodGroup: '', birthWeight: '', birthLength: '', birthHeadCirc: '' });
  // ── ANC form state
  const [ancForm, setAncForm] = useState({ visitDate: '', gestationalWeek: '', weight: '', systolicBp: '', diastolicBp: '', pulseRate: '', hemoglobin: '', fetalHeartRate: '', complaints: '', advice: '', nextVisitDate: '' });
  // ── Investigation form state
  const [invForm, setInvForm] = useState({ testName: '', testDate: '', result: '', unit: '', referenceRange: '', notes: '' });
  // ── Growth form state
  const [growthForm, setGrowthForm] = useState({ measurementDate: '', weightKg: '', heightCm: '', headCircCm: '', temperature: '', pulseRate: '', spo2: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, preg, ch] = await Promise.all([getMchOverview(), listPregnancies(), listChildren()]);
      setOverview(ov);
      setPregnancies(preg);
      setChildren(ch);
      if (preg.length && !selectedPregnancy) setSelectedPregnancy(preg[0]);
      if (ch.length && !selectedChild) setSelectedChild(ch[0]);
    } catch (e: any) {
      setError(e.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedPregnancy) {
      listAncVisits(selectedPregnancy.id).then(setAncVisits).catch(() => {});
      listInvestigations(selectedPregnancy.id).then(setInvestigations).catch(() => {});
    }
  }, [selectedPregnancy]);

  useEffect(() => {
    if (selectedChild) {
      listVaccinations(selectedChild.id).then(setVaccinations).catch(() => {});
      listGrowthMeasurements(selectedChild.id).then(setGrowth).catch(() => {});
      listMilestones(selectedChild.id).then(setMilestones).catch(() => {});
    }
  }, [selectedChild]);

  useEffect(() => {
    if (tab === 'documents') listMchDocuments().then(setDocuments).catch(() => {});
    if (tab === 'flags') listSafetyFlags().then(setFlags).catch(() => {});
  }, [tab]);

  // ── Submit handlers ─────────────────────────────────────────────────────────

  const submitPregnancy = async () => {
    setFormSaving(true); setFormError('');
    try {
      const p = await createPregnancy({
        lmpDate: pForm.lmpDate || undefined,
        eddUltrasound: pForm.eddUltrasound || undefined,
        gravida: pForm.gravida ? Number(pForm.gravida) : undefined,
        para: pForm.para ? Number(pForm.para) : undefined,
        bloodGroup: pForm.bloodGroup || undefined,
        rhFactor: pForm.rhFactor || undefined,
        notes: pForm.notes || undefined,
      });
      setPregnancies(prev => [p, ...prev]);
      setSelectedPregnancy(p);
      setShowPregnancyForm(false);
      setPForm({ lmpDate: '', eddUltrasound: '', gravida: '', para: '', bloodGroup: '', rhFactor: '', notes: '' });
      await load();
    } catch (e: any) { setFormError(e.message); }
    finally { setFormSaving(false); }
  };

  const submitChild = async () => {
    setFormSaving(true); setFormError('');
    try {
      const c = await createChild({
        name: cForm.name,
        dateOfBirth: cForm.dateOfBirth,
        sex: cForm.sex as any,
        bloodGroup: cForm.bloodGroup || undefined,
        birthWeight: cForm.birthWeight ? Number(cForm.birthWeight) : undefined,
        birthLength: cForm.birthLength ? Number(cForm.birthLength) : undefined,
        birthHeadCirc: cForm.birthHeadCirc ? Number(cForm.birthHeadCirc) : undefined,
      });
      setChildren(prev => [...prev, c]);
      setSelectedChild(c);
      setShowChildForm(false);
      setCForm({ name: '', dateOfBirth: '', sex: 'MALE', bloodGroup: '', birthWeight: '', birthLength: '', birthHeadCirc: '' });
    } catch (e: any) { setFormError(e.message); }
    finally { setFormSaving(false); }
  };

  const submitAnc = async () => {
    if (!selectedPregnancy) return;
    setFormSaving(true); setFormError('');
    try {
      const v = await createAncVisit(selectedPregnancy.id, {
        visitDate: ancForm.visitDate,
        gestationalWeek: ancForm.gestationalWeek ? Number(ancForm.gestationalWeek) : undefined,
        weight: ancForm.weight ? Number(ancForm.weight) : undefined,
        systolicBp: ancForm.systolicBp ? Number(ancForm.systolicBp) : undefined,
        diastolicBp: ancForm.diastolicBp ? Number(ancForm.diastolicBp) : undefined,
        pulseRate: ancForm.pulseRate ? Number(ancForm.pulseRate) : undefined,
        hemoglobin: ancForm.hemoglobin ? Number(ancForm.hemoglobin) : undefined,
        fetalHeartRate: ancForm.fetalHeartRate ? Number(ancForm.fetalHeartRate) : undefined,
        complaints: ancForm.complaints || undefined,
        advice: ancForm.advice || undefined,
        nextVisitDate: ancForm.nextVisitDate || undefined,
      });
      setAncVisits(prev => [v, ...prev]);
      setShowAncForm(false);
      setAncForm({ visitDate: '', gestationalWeek: '', weight: '', systolicBp: '', diastolicBp: '', pulseRate: '', hemoglobin: '', fetalHeartRate: '', complaints: '', advice: '', nextVisitDate: '' });
    } catch (e: any) { setFormError(e.message); }
    finally { setFormSaving(false); }
  };

  const submitInvestigation = async () => {
    if (!selectedPregnancy) return;
    setFormSaving(true); setFormError('');
    try {
      const inv = await createInvestigation(selectedPregnancy.id, {
        testName: invForm.testName,
        testDate: invForm.testDate || undefined,
        result: invForm.result || undefined,
        unit: invForm.unit || undefined,
        referenceRange: invForm.referenceRange || undefined,
        notes: invForm.notes || undefined,
      });
      setInvestigations(prev => [inv, ...prev]);
      setShowInvForm(false);
      setInvForm({ testName: '', testDate: '', result: '', unit: '', referenceRange: '', notes: '' });
    } catch (e: any) { setFormError(e.message); }
    finally { setFormSaving(false); }
  };

  const submitGrowth = async () => {
    if (!selectedChild) return;
    setFormSaving(true); setFormError('');
    try {
      const g = await createGrowthMeasurement(selectedChild.id, {
        measurementDate: growthForm.measurementDate,
        weightKg: growthForm.weightKg ? Number(growthForm.weightKg) : undefined,
        heightCm: growthForm.heightCm ? Number(growthForm.heightCm) : undefined,
        headCircCm: growthForm.headCircCm ? Number(growthForm.headCircCm) : undefined,
        temperature: growthForm.temperature ? Number(growthForm.temperature) : undefined,
        pulseRate: growthForm.pulseRate ? Number(growthForm.pulseRate) : undefined,
        spo2: growthForm.spo2 ? Number(growthForm.spo2) : undefined,
        notes: growthForm.notes || undefined,
      });
      setGrowth(prev => [...prev, g]);
      setShowGrowthForm(false);
      setGrowthForm({ measurementDate: '', weightKg: '', heightCm: '', headCircCm: '', temperature: '', pulseRate: '', spo2: '', notes: '' });
    } catch (e: any) { setFormError(e.message); }
    finally { setFormSaving(false); }
  };

  const markVaccineDone = async (id: string) => {
    try {
      await recordVaccination(id, { administeredDate: new Date().toISOString().slice(0, 10) });
      if (selectedChild) listVaccinations(selectedChild.id).then(setVaccinations).catch(() => {});
    } catch (e: any) { setError(e.message); }
  };

  const toggleMilestone = async (m: Milestone) => {
    const next = m.status === 'ACHIEVED' ? 'PENDING' : 'ACHIEVED';
    try {
      await updateMilestone(m.id, { status: next, achievedDate: next === 'ACHIEVED' ? new Date().toISOString().slice(0, 10) : undefined });
      setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x));
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return (
    <LiquidLoader fullScreen text="Loading MCH Data" />
  );

  return (
    <div className="mch-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', padding: '24px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#f97316,#F0541E)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{t('mchTitle')}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{t('mchSubtitle')}</div>
            </div>
          </div>
        </div>
        {([
          { key: 'overview', icon: '📊', label: t('nav.overview') },
          { key: 'pregnancy', icon: '🤰', label: t('nav.pregnancy') },
          { key: 'children', icon: '👶', label: t('nav.children') },
          { key: 'documents', icon: '📄', label: t('nav.documents') },
          { key: 'flags', icon: '🚩', label: t('nav.safetyFlags') },
        ] as const).map(item => (
          <button key={item.key} onClick={() => setTab(item.key as MCHTab)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', border: 'none', background: tab === item.key ? '#fff7ed' : 'transparent', color: tab === item.key ? '#F0541E' : '#475569', fontWeight: tab === item.key ? 600 : 400, fontSize: 13, cursor: 'pointer', borderLeft: tab === item.key ? '3px solid #F0541E' : '3px solid transparent', textAlign: 'left', width: '100%' }}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/patient/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', border: 'none', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          ← {t('backToDashboard')}
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 'calc(100vw - 220px)' }}>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {tab === 'overview' && <OverviewTab overview={overview} t={t} setTab={setTab} setSelectedPregnancy={setSelectedPregnancy} setSelectedChild={setSelectedChild} pregnancies={pregnancies} children={children} />}
        {tab === 'pregnancy' && (
          <PregnancyTab
            pregnancies={pregnancies} selectedPregnancy={selectedPregnancy} setSelectedPregnancy={setSelectedPregnancy}
            subTab={pregnancySubTab} setSubTab={setPregnancySubTab}
            ancVisits={ancVisits} investigations={investigations}
            showPregnancyForm={showPregnancyForm} setShowPregnancyForm={setShowPregnancyForm}
            showAncForm={showAncForm} setShowAncForm={setShowAncForm}
            showInvForm={showInvForm} setShowInvForm={setShowInvForm}
            pForm={pForm} setPForm={setPForm}
            ancForm={ancForm} setAncForm={setAncForm}
            invForm={invForm} setInvForm={setInvForm}
            formSaving={formSaving} formError={formError}
            submitPregnancy={submitPregnancy} submitAnc={submitAnc} submitInvestigation={submitInvestigation}
            t={t}
          />
        )}
        {tab === 'children' && (
          <ChildrenTab
            children={children} selectedChild={selectedChild} setSelectedChild={setSelectedChild}
            subTab={childSubTab} setSubTab={setChildSubTab}
            vaccinations={vaccinations} growth={growth} milestones={milestones}
            showChildForm={showChildForm} setShowChildForm={setShowChildForm}
            showGrowthForm={showGrowthForm} setShowGrowthForm={setShowGrowthForm}
            cForm={cForm} setCForm={setCForm}
            growthForm={growthForm} setGrowthForm={setGrowthForm}
            formSaving={formSaving} formError={formError}
            submitChild={submitChild} submitGrowth={submitGrowth}
            markVaccineDone={markVaccineDone} toggleMilestone={toggleMilestone}
            t={t}
          />
        )}
        {tab === 'documents' && <DocumentsTab documents={documents} t={t} />}
        {tab === 'flags' && <FlagsTab flags={flags} t={t} />}
      </main>
    </div>
  );
};

export default MCHPage;

// ─── Overview Tab ────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{
  overview: MchOverview | null;
  t: (k: string, opts?: any) => string;
  setTab: (t: any) => void;
  setSelectedPregnancy: (p: Pregnancy) => void;
  setSelectedChild: (c: Child) => void;
  pregnancies: Pregnancy[];
  children: Child[];
}> = ({ overview, t, setTab, setSelectedPregnancy, setSelectedChild, pregnancies, children }) => {
  if (!overview) return <div style={{ color: '#64748b' }}>{t('loading')}</div>;
  const p = overview.activePregnancy;
  const openCritical = overview.openFlags.filter(f => f.severity === 'CRITICAL');
  const openWarning = overview.openFlags.filter(f => f.severity === 'WARNING');

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{t('overview.title')}</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px' }}>{t('overview.subtitle')}</p>

      {/* Critical flags banner */}
      {openCritical.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 600, color: '#991b1b', fontSize: 14 }}>{t('overview.criticalFlagsTitle', { count: openCritical.length })}</div>
            <div style={{ color: '#b91c1c', fontSize: 13 }}>{openCritical[0].message}</div>
          </div>
          <button onClick={() => setTab('flags')} style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{t('overview.viewFlags')}</button>
        </div>
      )}
      {openWarning.length > 0 && openCritical.length === 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ color: '#92400e', fontSize: 14 }}>{t('overview.warningFlags', { count: openWarning.length })}</div>
          <button onClick={() => setTab('flags')} style={{ marginLeft: 'auto', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{t('overview.viewFlags')}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 24 }}>
        {/* Pregnancy card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>🤰 {t('overview.pregnancyCard')}</div>
            <button onClick={() => setTab('pregnancy')} style={{ fontSize: 12, color: '#F0541E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('overview.viewAll')}</button>
          </div>
          {p ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p.gestationalWeeks !== null && p.gestationalWeeks !== undefined && (
                  <div style={{ background: '#eff6ff', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{p.gestationalWeeks}w</span><span style={{ color: '#64748b' }}> {t('overview.gestational')}</span>
                  </div>
                )}
                {p.trimester && (
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: '#166534' }}>{t(`overview.trimester${p.trimester}`)}</span>
                  </div>
                )}
              </div>
              {p.edd && <div style={{ fontSize: 13, color: '#475569' }}>{t('overview.edd')}: <strong>{fmt(p.edd)}</strong></div>}
              {p.ancVisits && p.ancVisits.length > 0 && (
                <div style={{ fontSize: 13, color: '#475569' }}>{t('overview.lastAnc')}: <strong>{fmt(p.ancVisits[0].visitDate)}</strong></div>
              )}
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
              {t('overview.noActivePregnancy')}
              <br /><button onClick={() => { setTab('pregnancy'); }} style={{ marginTop: 8, background: '#F0541E', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>{t('overview.addPregnancy')}</button>
            </div>
          )}
        </div>

        {/* Children summary */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>👶 {t('overview.childrenCard')}</div>
            <button onClick={() => setTab('children')} style={{ fontSize: 12, color: '#F0541E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('overview.viewAll')}</button>
          </div>
          {overview.children.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
              {t('overview.noChildren')}
              <br /><button onClick={() => setTab('children')} style={{ marginTop: 8, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>{t('overview.addChild')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overview.children.slice(0, 3).map(c => {
                const dueVaccines = c.vaccinationRecords?.filter(v => v.status === 'DUE').length ?? 0;
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{ageLabel(c.dateOfBirth)}</div>
                    </div>
                    {dueVaccines > 0 && (
                      <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                        {dueVaccines} {t('overview.dueVaccines')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 14 }}>📋 {t('overview.summaryCard')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: t('overview.pregnancies'), value: pregnancies.length, color: '#4f46e5' },
              { label: t('overview.children'), value: children.length, color: '#10b981' },
              { label: t('overview.openFlags'), value: overview.openFlags.length, color: overview.openFlags.length > 0 ? '#dc2626' : '#64748b' },
              { label: t('overview.activePregnancy'), value: overview.activePregnancy ? '✓' : '—', color: overview.activePregnancy ? '#10b981' : '#94a3b8' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Pregnancy Tab ───────────────────────────────────────────────────────────

const PregnancyTab: React.FC<any> = ({
  pregnancies, selectedPregnancy, setSelectedPregnancy, subTab, setSubTab,
  ancVisits, investigations,
  showPregnancyForm, setShowPregnancyForm, showAncForm, setShowAncForm,
  showInvForm, setShowInvForm,
  pForm, setPForm, ancForm, setAncForm, invForm, setInvForm,
  formSaving, formError, submitPregnancy, submitAnc, submitInvestigation, t,
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>🤰 {t('pregnancy.title')}</h2>
      <button onClick={() => setShowPregnancyForm(true)} style={{ background: '#F0541E', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ {t('pregnancy.addPregnancy')}</button>
    </div>

    {showPregnancyForm && (
      <FormCard title={t('pregnancy.addPregnancy')} onClose={() => setShowPregnancyForm(false)} onSubmit={submitPregnancy} saving={formSaving} error={formError} t={t}>
        <FormRow label={t('pregnancy.lmpDate')}><input type="date" value={pForm.lmpDate} onChange={e => setPForm((p: any) => ({ ...p, lmpDate: e.target.value }))} style={inputStyle} /></FormRow>
        <FormRow label={t('pregnancy.eddUltrasound')}><input type="date" value={pForm.eddUltrasound} onChange={e => setPForm((p: any) => ({ ...p, eddUltrasound: e.target.value }))} style={inputStyle} /></FormRow>
        <FormRow label={t('pregnancy.gravida')}><input type="number" min={1} max={20} value={pForm.gravida} onChange={e => setPForm((p: any) => ({ ...p, gravida: e.target.value }))} style={inputStyle} placeholder="1" /></FormRow>
        <FormRow label={t('pregnancy.para')}><input type="number" min={0} max={20} value={pForm.para} onChange={e => setPForm((p: any) => ({ ...p, para: e.target.value }))} style={inputStyle} placeholder="0" /></FormRow>
        <FormRow label={t('pregnancy.bloodGroup')}><input type="text" value={pForm.bloodGroup} onChange={e => setPForm((p: any) => ({ ...p, bloodGroup: e.target.value }))} style={inputStyle} placeholder="e.g. O+" /></FormRow>
        <FormRow label={t('pregnancy.rhFactor')}><input type="text" value={pForm.rhFactor} onChange={e => setPForm((p: any) => ({ ...p, rhFactor: e.target.value }))} style={inputStyle} placeholder="+ / -" /></FormRow>
        <FormRow label={t('pregnancy.notes')}><textarea value={pForm.notes} onChange={e => setPForm((p: any) => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, height: 70, resize: 'vertical' }} /></FormRow>
      </FormCard>
    )}

    {/* Pregnancy selector */}
    {pregnancies.length > 0 && (
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {pregnancies.map((p: Pregnancy) => {
          const badge = statusBadge(p.status);
          return (
            <button key={p.id} onClick={() => setSelectedPregnancy(p)}
              style={{ background: selectedPregnancy?.id === p.id ? '#fff7ed' : '#fff', border: `2px solid ${selectedPregnancy?.id === p.id ? '#F0541E' : '#e2e8f0'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: 4, padding: '2px 6px', alignSelf: 'flex-start' }}>{p.status}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>{fmt(p.lmpDate) || fmt(p.createdAt)}</span>
            </button>
          );
        })}
      </div>
    )}

    {selectedPregnancy ? (
      <>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {(['details', 'anc', 'investigations'] as PregnancySubTab[]).map(st => (
            <button key={st} onClick={() => setSubTab(st)} style={{ padding: '8px 20px', border: 'none', background: 'none', color: subTab === st ? '#F0541E' : '#64748b', fontWeight: subTab === st ? 700 : 400, fontSize: 14, cursor: 'pointer', borderBottom: subTab === st ? '2px solid #F0541E' : '2px solid transparent', marginBottom: -2 }}>
              {t(`pregnancy.sub.${st}`)}
            </button>
          ))}
        </div>

        {subTab === 'details' && <PregnancyDetails p={selectedPregnancy} t={t} />}
        {subTab === 'anc' && (
          <AncTab ancVisits={ancVisits} showForm={showAncForm} setShowForm={setShowAncForm} ancForm={ancForm} setAncForm={setAncForm} formSaving={formSaving} formError={formError} submitAnc={submitAnc} t={t} />
        )}
        {subTab === 'investigations' && (
          <InvestigationsTab investigations={investigations} showForm={showInvForm} setShowForm={setShowInvForm} invForm={invForm} setInvForm={setInvForm} formSaving={formSaving} formError={formError} submitInvestigation={submitInvestigation} t={t} />
        )}
      </>
    ) : (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        {t('pregnancy.noPregnancyPrompt')}
      </div>
    )}
  </div>
);

const PregnancyDetails: React.FC<{ p: Pregnancy; t: (k: string) => string }> = ({ p, t }) => {
  const today = new Date();
  const gestWeeks = p.lmpDate ? Math.floor((today.getTime() - new Date(p.lmpDate).getTime()) / (7 * 24 * 3600 * 1000)) : null;
  const trimester = gestWeeks ? (gestWeeks <= 13 ? 1 : gestWeeks <= 26 ? 2 : 3) : null;
  const edd = p.eddUltrasound ?? p.eddLmp;
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '22px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        {[
          { label: t('pregnancy.status'), value: p.status },
          { label: t('pregnancy.lmpDate'), value: fmt(p.lmpDate) },
          { label: t('pregnancy.edd'), value: fmt(edd) },
          { label: t('pregnancy.gestationalWeeks'), value: gestWeeks !== null ? `${gestWeeks} ${t('pregnancy.weeks')}` : '—' },
          { label: t('pregnancy.trimester'), value: trimester ? `${trimester}${t('pregnancy.trimesterSuffix')}` : '—' },
          { label: t('pregnancy.gravida'), value: p.gravida ?? '—' },
          { label: t('pregnancy.para'), value: p.para ?? '—' },
          { label: t('pregnancy.bloodGroup'), value: p.bloodGroup ?? '—' },
          { label: t('pregnancy.rhFactor'), value: p.rhFactor ?? '—' },
        ].map(f => (
          <div key={f.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{String(f.value)}</div>
          </div>
        ))}
      </div>
      {p.highRiskFactors && p.highRiskFactors.length > 0 && (
        <div style={{ marginTop: 16, background: '#fef3c7', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 6 }}>⚠️ {t('pregnancy.highRiskFactors')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{p.highRiskFactors.map((f, i) => <span key={i} style={{ background: '#fde68a', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#78350f' }}>{f}</span>)}</div>
        </div>
      )}
      {p.notes && <div style={{ marginTop: 12, fontSize: 13, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}><strong>{t('pregnancy.notes')}:</strong> {p.notes}</div>}
    </div>
  );
};

// ─── ANC Tab ─────────────────────────────────────────────────────────────────

const AncTab: React.FC<any> = ({ ancVisits, showForm, setShowForm, ancForm, setAncForm, formSaving, formError, submitAnc, t }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{t('anc.title')} ({ancVisits.length})</div>
      <button onClick={() => setShowForm(true)} style={{ background: '#223382', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ {t('anc.addVisit')}</button>
    </div>
    {showForm && (
      <FormCard title={t('anc.addVisit')} onClose={() => setShowForm(false)} onSubmit={submitAnc} saving={formSaving} error={formError} t={t}>
        <FormRow label={`${t('anc.visitDate')} *`}><input type="date" value={ancForm.visitDate} onChange={(e: any) => setAncForm((a: any) => ({ ...a, visitDate: e.target.value }))} style={inputStyle} required /></FormRow>
        <FormRow label={t('anc.gestationalWeek')}><input type="number" min={4} max={46} value={ancForm.gestationalWeek} onChange={(e: any) => setAncForm((a: any) => ({ ...a, gestationalWeek: e.target.value }))} style={inputStyle} placeholder="e.g. 20" /></FormRow>
        <FormRow label={t('anc.weight')}><input type="number" step="0.1" value={ancForm.weight} onChange={(e: any) => setAncForm((a: any) => ({ ...a, weight: e.target.value }))} style={inputStyle} placeholder="kg" /></FormRow>
        <FormRow label={t('anc.systolicBp')}><input type="number" value={ancForm.systolicBp} onChange={(e: any) => setAncForm((a: any) => ({ ...a, systolicBp: e.target.value }))} style={inputStyle} placeholder="mmHg" /></FormRow>
        <FormRow label={t('anc.diastolicBp')}><input type="number" value={ancForm.diastolicBp} onChange={(e: any) => setAncForm((a: any) => ({ ...a, diastolicBp: e.target.value }))} style={inputStyle} placeholder="mmHg" /></FormRow>
        <FormRow label={t('anc.pulseRate')}><input type="number" value={ancForm.pulseRate} onChange={(e: any) => setAncForm((a: any) => ({ ...a, pulseRate: e.target.value }))} style={inputStyle} placeholder="bpm" /></FormRow>
        <FormRow label={t('anc.hemoglobin')}><input type="number" step="0.1" value={ancForm.hemoglobin} onChange={(e: any) => setAncForm((a: any) => ({ ...a, hemoglobin: e.target.value }))} style={inputStyle} placeholder="g/dL" /></FormRow>
        <FormRow label={t('anc.fetalHeartRate')}><input type="number" value={ancForm.fetalHeartRate} onChange={(e: any) => setAncForm((a: any) => ({ ...a, fetalHeartRate: e.target.value }))} style={inputStyle} placeholder="bpm" /></FormRow>
        <FormRow label={t('anc.complaints')}><textarea value={ancForm.complaints} onChange={(e: any) => setAncForm((a: any) => ({ ...a, complaints: e.target.value }))} style={{ ...inputStyle, height: 60, resize: 'vertical' }} /></FormRow>
        <FormRow label={t('anc.nextVisitDate')}><input type="date" value={ancForm.nextVisitDate} onChange={(e: any) => setAncForm((a: any) => ({ ...a, nextVisitDate: e.target.value }))} style={inputStyle} /></FormRow>
      </FormCard>
    )}
    {ancVisits.length === 0 ? (
      <EmptyState message={t('anc.noVisits')} />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ancVisits.map((v: AncVisit) => (
          <div key={v.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('anc.visit')} — {fmt(v.visitDate)}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {v.gestationalWeek && <Chip label={`${v.gestationalWeek}w`} bg="#eff6ff" color="#2563eb" />}
                {v.verifiedByDoctorId ? <Chip label="✓ Verified" bg="#d1fae5" color="#065f46" /> : <Chip label="Patient entry" bg="#f3f4f6" color="#374151" />}
                {v.safetyFlags && v.safetyFlags.length > 0 && <Chip label={`🚩 ${v.safetyFlags.length}`} bg="#fef3c7" color="#92400e" />}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
              {v.weight && <VitalItem label={t('anc.weight')} value={`${v.weight} kg`} />}
              {(v.systolicBp || v.diastolicBp) && <VitalItem label={t('anc.bp')} value={`${v.systolicBp ?? '?'}/${v.diastolicBp ?? '?'} mmHg`} />}
              {v.hemoglobin && <VitalItem label={t('anc.hemoglobin')} value={`${v.hemoglobin} g/dL`} />}
              {v.pulseRate && <VitalItem label={t('anc.pulseRate')} value={`${v.pulseRate} bpm`} />}
              {v.fetalHeartRate && <VitalItem label={t('anc.fetalHeartRate')} value={`${v.fetalHeartRate} bpm`} />}
            </div>
            {v.complaints && <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}><strong>{t('anc.complaints')}:</strong> {v.complaints}</div>}
            {v.nextVisitDate && <div style={{ marginTop: 6, fontSize: 13, color: '#059669' }}>📅 {t('anc.nextVisit')}: {fmt(v.nextVisitDate)}</div>}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Investigations Tab ───────────────────────────────────────────────────────

const InvestigationsTab: React.FC<any> = ({ investigations, showForm, setShowForm, invForm, setInvForm, formSaving, formError, submitInvestigation, t }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{t('investigations.title')}</div>
      <button onClick={() => setShowForm(true)} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ {t('investigations.add')}</button>
    </div>
    {showForm && (
      <FormCard title={t('investigations.add')} onClose={() => setShowForm(false)} onSubmit={submitInvestigation} saving={formSaving} error={formError} t={t}>
        <FormRow label={`${t('investigations.testName')} *`}><input type="text" value={invForm.testName} onChange={(e: any) => setInvForm((f: any) => ({ ...f, testName: e.target.value }))} style={inputStyle} placeholder={t('investigations.testNamePlaceholder')} required /></FormRow>
        <FormRow label={t('investigations.testDate')}><input type="date" value={invForm.testDate} onChange={(e: any) => setInvForm((f: any) => ({ ...f, testDate: e.target.value }))} style={inputStyle} /></FormRow>
        <FormRow label={t('investigations.result')}><input type="text" value={invForm.result} onChange={(e: any) => setInvForm((f: any) => ({ ...f, result: e.target.value }))} style={inputStyle} /></FormRow>
        <FormRow label={t('investigations.unit')}><input type="text" value={invForm.unit} onChange={(e: any) => setInvForm((f: any) => ({ ...f, unit: e.target.value }))} style={inputStyle} placeholder="g/dL, mg/dL…" /></FormRow>
        <FormRow label={t('investigations.referenceRange')}><input type="text" value={invForm.referenceRange} onChange={(e: any) => setInvForm((f: any) => ({ ...f, referenceRange: e.target.value }))} style={inputStyle} /></FormRow>
        <FormRow label={t('investigations.notes')}><textarea value={invForm.notes} onChange={(e: any) => setInvForm((f: any) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, height: 60, resize: 'vertical' }} /></FormRow>
      </FormCard>
    )}
    {investigations.length === 0 ? <EmptyState message={t('investigations.noInvestigations')} /> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {investigations.map((inv: Investigation) => {
          const badge = statusBadge(inv.status);
          return (
            <div key={inv.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{inv.testName}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{fmt(inv.testDate)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {inv.result && <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{inv.result}{inv.unit ? ` ${inv.unit}` : ''}</span>}
                {inv.referenceRange && <span style={{ fontSize: 12, color: '#64748b' }}>({inv.referenceRange})</span>}
                <Chip label={inv.status} bg={badge.bg} color={badge.color} />
                {inv.verifiedByDoctorId && <Chip label="✓" bg="#d1fae5" color="#065f46" />}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Children Tab ─────────────────────────────────────────────────────────────

const ChildrenTab: React.FC<any> = ({
  children, selectedChild, setSelectedChild, subTab, setSubTab,
  vaccinations, growth, milestones,
  showChildForm, setShowChildForm, showGrowthForm, setShowGrowthForm,
  cForm, setCForm, growthForm, setGrowthForm,
  formSaving, formError, submitChild, submitGrowth,
  markVaccineDone, toggleMilestone, t,
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>👶 {t('children.title')}</h2>
      <button onClick={() => setShowChildForm(true)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ {t('children.addChild')}</button>
    </div>

    {showChildForm && (
      <FormCard title={t('children.addChild')} onClose={() => setShowChildForm(false)} onSubmit={submitChild} saving={formSaving} error={formError} t={t}>
        <FormRow label={`${t('children.name')} *`}><input type="text" value={cForm.name} onChange={(e: any) => setCForm((c: any) => ({ ...c, name: e.target.value }))} style={inputStyle} required /></FormRow>
        <FormRow label={`${t('children.dateOfBirth')} *`}><input type="date" max={new Date().toISOString().slice(0, 10)} value={cForm.dateOfBirth} onChange={(e: any) => setCForm((c: any) => ({ ...c, dateOfBirth: e.target.value }))} style={inputStyle} required /></FormRow>
        <FormRow label={`${t('children.sex')} *`}>
          <select value={cForm.sex} onChange={(e: any) => setCForm((c: any) => ({ ...c, sex: e.target.value }))} style={inputStyle}>
            <option value="MALE">{t('children.male')}</option>
            <option value="FEMALE">{t('children.female')}</option>
            <option value="OTHER">{t('children.other')}</option>
          </select>
        </FormRow>
        <FormRow label={t('children.bloodGroup')}><input type="text" value={cForm.bloodGroup} onChange={(e: any) => setCForm((c: any) => ({ ...c, bloodGroup: e.target.value }))} style={inputStyle} placeholder="e.g. O+" /></FormRow>
        <FormRow label={t('children.birthWeight')}><input type="number" step="0.01" value={cForm.birthWeight} onChange={(e: any) => setCForm((c: any) => ({ ...c, birthWeight: e.target.value }))} style={inputStyle} placeholder="kg" /></FormRow>
        <FormRow label={t('children.birthLength')}><input type="number" step="0.1" value={cForm.birthLength} onChange={(e: any) => setCForm((c: any) => ({ ...c, birthLength: e.target.value }))} style={inputStyle} placeholder="cm" /></FormRow>
      </FormCard>
    )}

    {/* Child selector */}
    {children.length > 0 && (
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {children.map((c: Child) => (
          <button key={c.id} onClick={() => setSelectedChild(c)}
            style={{ background: selectedChild?.id === c.id ? '#f0fdf4' : '#fff', border: `2px solid ${selectedChild?.id === c.id ? '#10b981' : '#e2e8f0'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{c.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{ageLabel(c.dateOfBirth)} · {c.sex}</div>
          </button>
        ))}
      </div>
    )}

    {selectedChild ? (
      <>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <VitalItem label={t('children.dob')} value={fmt(selectedChild.dateOfBirth)} />
          <VitalItem label={t('children.age')} value={ageLabel(selectedChild.dateOfBirth)} />
          <VitalItem label={t('children.sex')} value={selectedChild.sex} />
          {selectedChild.bloodGroup && <VitalItem label={t('children.bloodGroup')} value={selectedChild.bloodGroup} />}
          {selectedChild.birthWeight && <VitalItem label={t('children.birthWeight')} value={`${selectedChild.birthWeight} kg`} />}
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {(['vaccinations', 'growth', 'milestones'] as ChildSubTab[]).map(st => (
            <button key={st} onClick={() => setSubTab(st)} style={{ padding: '8px 20px', border: 'none', background: 'none', color: subTab === st ? '#10b981' : '#64748b', fontWeight: subTab === st ? 700 : 400, fontSize: 14, cursor: 'pointer', borderBottom: subTab === st ? '2px solid #10b981' : '2px solid transparent', marginBottom: -2 }}>
              {t(`children.sub.${st}`)}
            </button>
          ))}
        </div>

        {subTab === 'vaccinations' && <VaccinationTab vaccinations={vaccinations} markDone={markVaccineDone} t={t} />}
        {subTab === 'growth' && <GrowthTab growth={growth} showForm={showGrowthForm} setShowForm={setShowGrowthForm} growthForm={growthForm} setGrowthForm={setGrowthForm} formSaving={formSaving} formError={formError} submitGrowth={submitGrowth} t={t} />}
        {subTab === 'milestones' && <MilestonesTab milestones={milestones} toggle={toggleMilestone} t={t} />}
      </>
    ) : (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>{t('children.noChildPrompt')}</div>
    )}
  </div>
);

// ─── Vaccination Tab ──────────────────────────────────────────────────────────

const VaccinationTab: React.FC<{ vaccinations: VaccinationRecord[]; markDone: (id: string) => void; t: any }> = ({ vaccinations, markDone, t }) => {
  const groups: Record<string, VaccinationRecord[]> = {};
  for (const v of vaccinations) {
    const key = v.status;
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 14 }}>💉 {t('vaccinations.title')} ({vaccinations.length})</div>
      {['DUE', 'UPCOMING', 'MISSED', 'COMPLETED'].map(status => {
        const items = groups[status] ?? [];
        if (items.length === 0) return null;
        const badge = statusBadge(status);
        return (
          <div key={status} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: badge.color, marginBottom: 8 }}>{t(`vaccinations.status.${status}`)} ({items.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(v => (
                <div key={v.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${status === 'DUE' ? '#fcd34d' : '#e2e8f0'}`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{v.vaccineName} — {t('vaccinations.dose')} {v.doseNumber}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{t('vaccinations.scheduled')}: {fmt(v.scheduledDate)}{v.administeredDate ? ` · ${t('vaccinations.given')}: ${fmt(v.administeredDate)}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Chip label={status} bg={badge.bg} color={badge.color} />
                    {v.verifiedByDoctorId && <Chip label="✓" bg="#d1fae5" color="#065f46" />}
                    {(status === 'DUE' || status === 'UPCOMING') && (
                      <button onClick={() => markDone(v.id)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>{t('vaccinations.markDone')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Growth Tab ───────────────────────────────────────────────────────────────

const GrowthTab: React.FC<any> = ({ growth, showForm, setShowForm, growthForm, setGrowthForm, formSaving, formError, submitGrowth, t }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>📈 {t('growth.title')}</div>
      <button onClick={() => setShowForm(true)} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ {t('growth.addMeasurement')}</button>
    </div>
    {showForm && (
      <FormCard title={t('growth.addMeasurement')} onClose={() => setShowForm(false)} onSubmit={submitGrowth} saving={formSaving} error={formError} t={t}>
        <FormRow label={`${t('growth.date')} *`}><input type="date" value={growthForm.measurementDate} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, measurementDate: e.target.value }))} style={inputStyle} required /></FormRow>
        <FormRow label={t('growth.weight')}><input type="number" step="0.01" value={growthForm.weightKg} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, weightKg: e.target.value }))} style={inputStyle} placeholder="kg" /></FormRow>
        <FormRow label={t('growth.height')}><input type="number" step="0.1" value={growthForm.heightCm} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, heightCm: e.target.value }))} style={inputStyle} placeholder="cm" /></FormRow>
        <FormRow label={t('growth.headCirc')}><input type="number" step="0.1" value={growthForm.headCircCm} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, headCircCm: e.target.value }))} style={inputStyle} placeholder="cm" /></FormRow>
        <FormRow label={t('growth.temperature')}><input type="number" step="0.1" value={growthForm.temperature} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, temperature: e.target.value }))} style={inputStyle} placeholder="°C" /></FormRow>
        <FormRow label={t('growth.pulseRate')}><input type="number" value={growthForm.pulseRate} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, pulseRate: e.target.value }))} style={inputStyle} placeholder="bpm" /></FormRow>
        <FormRow label={t('growth.spo2')}><input type="number" step="0.1" value={growthForm.spo2} onChange={(e: any) => setGrowthForm((g: any) => ({ ...g, spo2: e.target.value }))} style={inputStyle} placeholder="%" /></FormRow>
      </FormCard>
    )}
    {growth.length === 0 ? <EmptyState message={t('growth.noMeasurements')} /> : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {[t('growth.date'), t('growth.ageMonths'), t('growth.weight'), t('growth.height'), t('growth.headCirc'), t('growth.bmi'), 'SpO2', t('growth.flags')].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{[...growth].reverse().map(g => (
            <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 12px' }}>{fmt(g.measurementDate)}</td>
              <td style={{ padding: '8px 12px' }}>{g.ageMonths?.toFixed(1) ?? '—'}</td>
              <td style={{ padding: '8px 12px' }}>{g.weightKg ? `${g.weightKg} kg` : '—'}</td>
              <td style={{ padding: '8px 12px' }}>{g.heightCm ? `${g.heightCm} cm` : '—'}</td>
              <td style={{ padding: '8px 12px' }}>{g.headCircCm ? `${g.headCircCm} cm` : '—'}</td>
              <td style={{ padding: '8px 12px' }}>{g.bmi ? g.bmi.toFixed(1) : '—'}</td>
              <td style={{ padding: '8px 12px' }}>{g.spo2 ? `${g.spo2}%` : '—'}</td>
              <td style={{ padding: '8px 12px' }}>{g.safetyFlags && g.safetyFlags.length > 0 ? <span style={{ color: severityColor(g.safetyFlags[0].severity) }}>🚩</span> : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )}
  </div>
);

// ─── Milestones Tab ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  GROSS_MOTOR: '🏃 Gross Motor', FINE_MOTOR: '✋ Fine Motor',
  LANGUAGE: '🗣️ Language', SOCIAL_EMOTIONAL: '💞 Social/Emotional', COGNITIVE: '🧠 Cognitive',
};

const MilestonesTab: React.FC<{ milestones: Milestone[]; toggle: (m: Milestone) => void; t: any }> = ({ milestones, toggle, t }) => {
  const byCat = milestones.reduce<Record<string, Milestone[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 14 }}>🧩 {t('milestones.title')}</div>
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 8 }}>{CATEGORY_LABELS[cat] ?? cat}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(m => {
              const badge = statusBadge(m.status);
              return (
                <div key={m.id} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b' }}>{m.milestoneName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{t('milestones.expectedAge')}: {m.expectedAgeMonths}–{m.expectedAgeMaxMonths ?? m.expectedAgeMonths + 2} {t('milestones.months')}</div>
                    {m.achievedDate && <div style={{ fontSize: 11, color: '#059669' }}>✓ {fmt(m.achievedDate)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {m.needsReview && <Chip label="Review" bg="#fef3c7" color="#92400e" />}
                    <Chip label={m.status} bg={badge.bg} color={badge.color} />
                    {m.status !== 'ACHIEVED' && (
                      <button onClick={() => toggle(m)} style={{ background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>{t('milestones.markAchieved')}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Documents Tab ────────────────────────────────────────────────────────────

const DocumentsTab: React.FC<{ documents: MchDocument[]; t: any }> = ({ documents, t }) => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>📄 {t('documents.title')}</h2>
    {documents.length === 0 ? <EmptyState message={t('documents.noDocuments')} /> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {documents.map(doc => (
          <div key={doc.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{doc.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{doc.category} · {fmt(doc.createdAt)}</div>
              {doc.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{doc.notes}</div>}
            </div>
            <Chip label={doc.category} bg="#eff6ff" color="#2563eb" />
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Safety Flags Tab ─────────────────────────────────────────────────────────

const FlagsTab: React.FC<{ flags: SafetyFlag[]; t: any }> = ({ flags, t }) => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>🚩 {t('flags.title')}</h2>
    <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>{t('flags.disclaimer')}</p>
    {flags.length === 0 ? <EmptyState message={t('flags.noFlags')} /> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {flags.map(f => (
          <div key={f.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${f.severity === 'CRITICAL' ? '#fca5a5' : f.severity === 'WARNING' ? '#fcd34d' : '#bfdbfe'}`, padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: severityColor(f.severity) }}>{f.message}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{f.ruleDescription}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{fmt(f.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip label={f.severity} bg={f.severity === 'CRITICAL' ? '#fee2e2' : f.severity === 'WARNING' ? '#fef3c7' : '#dbeafe'} color={severityColor(f.severity)} />
                <Chip label={f.status} bg={statusBadge(f.status).bg} color={statusBadge(f.status).color} />
              </div>
            </div>
            {f.reviewNotes && <div style={{ marginTop: 8, fontSize: 13, color: '#475569', background: '#f8fafc', borderRadius: 6, padding: '8px 10px' }}><strong>{t('flags.doctorNotes')}:</strong> {f.reviewNotes}</div>}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
  fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
};

const FormCard: React.FC<{ title: string; onClose: () => void; onSubmit: () => void; saving: boolean; error: string; t: any; children: React.ReactNode }> = ({ title, onClose, onSubmit, saving, error, t, children }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #F0541E', padding: '20px 24px', marginBottom: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{title}</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1 }}>✕</button>
    </div>
    {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>{children}</div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <button onClick={onClose} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}>{t('cancel')}</button>
      <button onClick={onSubmit} disabled={saving} style={{ background: '#F0541E', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? t('saving') : t('save')}</button>
    </div>
  </div>
);

const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

const Chip: React.FC<{ label: string; bg: string; color: string }> = ({ label, bg, color }) => (
  <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
);

const VitalItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', minWidth: 100 }}>
    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginTop: 2 }}>{value}</div>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>{message}</div>
);
