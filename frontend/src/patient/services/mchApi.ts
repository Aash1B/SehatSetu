import i18n from '../../i18n/config';
import { getToken } from '../../auth/authStorage';
import { API_BASE_URL } from '../utils/constants';

// ─── Types ─────────────────────────────────────────────────────────────────

export type PregnancyStatus = 'ACTIVE' | 'COMPLETED' | 'LOST' | 'TERMINATED';
export type InvestigationStatus = 'ORDERED' | 'SAMPLE_COLLECTED' | 'RESULT_AVAILABLE' | 'VERIFIED';
export type ChildSex = 'MALE' | 'FEMALE' | 'OTHER';
export type VaccinationStatus = 'UPCOMING' | 'DUE' | 'COMPLETED' | 'MISSED';
export type MilestoneCategory = 'GROSS_MOTOR' | 'FINE_MOTOR' | 'LANGUAGE' | 'SOCIAL_EMOTIONAL' | 'COGNITIVE';
export type MilestoneStatus = 'PENDING' | 'ACHIEVED' | 'NEEDS_REVIEW';
export type FlagSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type FlagStatus = 'OPEN' | 'REVIEWED' | 'RESOLVED';

export interface Pregnancy {
  id: string;
  patientId: string;
  status: PregnancyStatus;
  lmpDate: string | null;
  eddLmp: string | null;
  eddUltrasound: string | null;
  gestationalWeeksAtBooking: number | null;
  gravida: number | null;
  para: number | null;
  abortions: number | null;
  bloodGroup: string | null;
  rhFactor: string | null;
  highRiskFactors: string[];
  notes: string | null;
  deliveryDate: string | null;
  deliveryType: string | null;
  deliveryOutcome: string | null;
  createdAt: string;
  updatedAt: string;
  // computed
  gestationalWeeks?: number | null;
  trimester?: 1 | 2 | 3 | null;
  edd?: string | null;
  ancVisits?: AncVisit[];
  investigations?: Investigation[];
  safetyFlags?: SafetyFlag[];
}

export interface AncVisit {
  id: string;
  pregnancyId: string;
  visitDate: string;
  gestationalWeek: number | null;
  weight: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseRate: number | null;
  hemoglobin: number | null;
  fetalHeartRate: number | null;
  fundalHeight: number | null;
  urineProtein: string | null;
  urineGlucose: string | null;
  bloodSugarFasting: number | null;
  bloodSugarPp: number | null;
  complaints: string | null;
  clinicalFindings: string | null;
  advice: string | null;
  nextVisitDate: string | null;
  enteredByPatient: boolean;
  verifiedByDoctorId: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  createdAt: string;
  safetyFlags?: SafetyFlag[];
}

export interface Investigation {
  id: string;
  pregnancyId: string;
  testName: string;
  testDate: string | null;
  result: string | null;
  unit: string | null;
  referenceRange: string | null;
  notes: string | null;
  reportId: string | null;
  status: InvestigationStatus;
  enteredByPatient: boolean;
  verifiedByDoctorId: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface Child {
  id: string;
  patientId: string;
  name: string;
  dateOfBirth: string;
  sex: ChildSex;
  bloodGroup: string | null;
  birthWeight: number | null;
  birthLength: number | null;
  birthHeadCirc: number | null;
  notes: string | null;
  createdAt: string;
  vaccinationRecords?: VaccinationRecord[];
  growthMeasurements?: GrowthMeasurement[];
  milestones?: Milestone[];
  safetyFlags?: SafetyFlag[];
}

export interface VaccinationRecord {
  id: string;
  childId: string;
  vaccineName: string;
  doseNumber: number;
  scheduledDate: string;
  administeredDate: string | null;
  status: VaccinationStatus;
  administeredAt: string | null;
  batchNumber: string | null;
  notes: string | null;
  verifiedByDoctorId: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface GrowthMeasurement {
  id: string;
  childId: string;
  measurementDate: string;
  ageMonths: number | null;
  weightKg: number | null;
  heightCm: number | null;
  headCircCm: number | null;
  temperature: number | null;
  pulseRate: number | null;
  spo2: number | null;
  bmi: number | null;
  notes: string | null;
  enteredByPatient: boolean;
  verifiedByDoctorId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  safetyFlags?: SafetyFlag[];
}

export interface Milestone {
  id: string;
  childId: string;
  category: MilestoneCategory;
  milestoneName: string;
  expectedAgeMonths: number;
  expectedAgeMaxMonths: number | null;
  status: MilestoneStatus;
  achievedDate: string | null;
  parentObservation: string | null;
  doctorAssessment: string | null;
  verifiedByDoctorId: string | null;
  verifiedAt: string | null;
  needsReview: boolean;
  notes: string | null;
  createdAt: string;
}

export interface SafetyFlag {
  id: string;
  pregnancyId: string | null;
  ancVisitId: string | null;
  childId: string | null;
  growthMeasurementId: string | null;
  flagCode: string;
  severity: FlagSeverity;
  message: string;
  ruleDescription: string;
  status: FlagStatus;
  reviewedByDoctorId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface MchDocument {
  id: string;
  patientId: string;
  pregnancyId: string | null;
  childId: string | null;
  investigationId: string | null;
  medicalReportId: string | null;
  title: string;
  category: string;
  notes: string | null;
  createdAt: string;
}

export interface MchOverview {
  activePregnancy: (Pregnancy & { gestationalWeeks: number | null; trimester: 1 | 2 | 3 | null; edd: string | null }) | null;
  children: (Child & { vaccinationRecords: VaccinationRecord[]; growthMeasurements: GrowthMeasurement[] })[];
  openFlags: SafetyFlag[];
}

// ─── HTTP helper ────────────────────────────────────────────────────────────

async function mchRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error(i18n.t('errors:authRequired'));
  const url = `${API_BASE_URL}/mch${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.message === 'string' ? body.message : i18n.t('errors:mchRequestFailed'));
  }
  return body as T;
}

// ─── Overview ────────────────────────────────────────────────────────────────

export const getMchOverview = (patientId?: string) =>
  mchRequest<MchOverview>(`/overview${patientId ? `?patientId=${patientId}` : ''}`);

// ─── Pregnancies ─────────────────────────────────────────────────────────────

export const listPregnancies = (patientId?: string) =>
  mchRequest<Pregnancy[]>(`/pregnancies${patientId ? `?patientId=${patientId}` : ''}`);

export const getPregnancy = (id: string) =>
  mchRequest<Pregnancy>(`/pregnancies/${id}`);

export const createPregnancy = (data: Partial<Pregnancy>) =>
  mchRequest<Pregnancy>('/pregnancies', { method: 'POST', body: JSON.stringify(data) });

export const updatePregnancy = (id: string, data: Partial<Pregnancy>) =>
  mchRequest<Pregnancy>(`/pregnancies/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ─── ANC Visits ──────────────────────────────────────────────────────────────

export const listAncVisits = (pregnancyId: string) =>
  mchRequest<AncVisit[]>(`/pregnancies/${pregnancyId}/anc-visits`);

export const createAncVisit = (pregnancyId: string, data: Partial<AncVisit>) =>
  mchRequest<AncVisit>(`/pregnancies/${pregnancyId}/anc-visits`, { method: 'POST', body: JSON.stringify(data) });

export const updateAncVisit = (id: string, data: Partial<AncVisit>) =>
  mchRequest<AncVisit>(`/anc-visits/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ─── Investigations ───────────────────────────────────────────────────────────

export const listInvestigations = (pregnancyId: string) =>
  mchRequest<Investigation[]>(`/pregnancies/${pregnancyId}/investigations`);

export const createInvestigation = (pregnancyId: string, data: Partial<Investigation>) =>
  mchRequest<Investigation>(`/pregnancies/${pregnancyId}/investigations`, { method: 'POST', body: JSON.stringify(data) });

export const updateInvestigation = (id: string, data: Partial<Investigation>) =>
  mchRequest<Investigation>(`/investigations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ─── Children ─────────────────────────────────────────────────────────────────

export const listChildren = (patientId?: string) =>
  mchRequest<Child[]>(`/children${patientId ? `?patientId=${patientId}` : ''}`);

export const getChild = (id: string) =>
  mchRequest<Child>(`/children/${id}`);

export const createChild = (data: Partial<Child>) =>
  mchRequest<Child>('/children', { method: 'POST', body: JSON.stringify(data) });

export const updateChild = (id: string, data: Partial<Child>) =>
  mchRequest<Child>(`/children/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ─── Vaccinations ─────────────────────────────────────────────────────────────

export const listVaccinations = (childId: string) =>
  mchRequest<VaccinationRecord[]>(`/children/${childId}/vaccinations`);

export const recordVaccination = (id: string, data: { administeredDate: string; administeredAt?: string; batchNumber?: string; notes?: string }) =>
  mchRequest<VaccinationRecord>(`/vaccinations/${id}/record`, { method: 'PUT', body: JSON.stringify(data) });

// ─── Growth ───────────────────────────────────────────────────────────────────

export const listGrowthMeasurements = (childId: string) =>
  mchRequest<GrowthMeasurement[]>(`/children/${childId}/growth`);

export const createGrowthMeasurement = (childId: string, data: Partial<GrowthMeasurement>) =>
  mchRequest<GrowthMeasurement>(`/children/${childId}/growth`, { method: 'POST', body: JSON.stringify(data) });

// ─── Milestones ────────────────────────────────────────────────────────────────

export const listMilestones = (childId: string) =>
  mchRequest<Milestone[]>(`/children/${childId}/milestones`);

export const updateMilestone = (id: string, data: Partial<Milestone>) =>
  mchRequest<Milestone>(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ─── Safety Flags ──────────────────────────────────────────────────────────────

export const listSafetyFlags = (patientId?: string) =>
  mchRequest<SafetyFlag[]>(`/safety-flags${patientId ? `?patientId=${patientId}` : ''}`);

// ─── Documents ─────────────────────────────────────────────────────────────────

export const listMchDocuments = (params: { patientId?: string; pregnancyId?: string; childId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.pregnancyId) qs.set('pregnancyId', params.pregnancyId);
  if (params.childId) qs.set('childId', params.childId);
  return mchRequest<MchDocument[]>(`/documents${qs.toString() ? `?${qs}` : ''}`);
};

export const createMchDocument = (data: { medicalReportId: string; title: string; category: string; pregnancyId?: string; childId?: string; notes?: string }) =>
  mchRequest<MchDocument>('/documents', { method: 'POST', body: JSON.stringify(data) });
