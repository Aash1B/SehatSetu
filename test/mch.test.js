/**
 * MCH Tracking — Backend Unit Tests
 * Pattern: node:test + assert/strict, mocking prisma via prototype patching.
 * Tests run against compiled dist/ (npm run build must pass first).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// ─── Inline service under test (unit — no DB) ─────────────────────────────────
// We test the pure utility functions and service methods by constructing minimal
// instances with stubbed prisma, following the existing security-flows pattern.

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';

// ─── 1. Gestational calculation utilities ─────────────────────────────────────

test('MchService.calculateEddFromLmp adds 280 days to LMP', () => {
  const { MchService } = require('../dist/mch/mch.service.js');
  const lmp = new Date('2026-01-01');
  const edd = MchService.calculateEddFromLmp(lmp);
  const expected = new Date('2026-10-08'); // 2026-01-01 + 280 days
  assert.equal(edd.toISOString().slice(0, 10), expected.toISOString().slice(0, 10));
});

test('MchService.calculateGestationalWeeks returns correct weeks', () => {
  const { MchService } = require('../dist/mch/mch.service.js');
  const lmp = new Date(Date.now() - 14 * 7 * 24 * 3600 * 1000); // 14 weeks ago
  const weeks = MchService.calculateGestationalWeeks(lmp);
  assert.ok(weeks >= 13 && weeks <= 15, `Expected ~14 weeks, got ${weeks}`);
});

test('MchService.calculateTrimester: ≤13w → 1, 14-26w → 2, >26w → 3', () => {
  const { MchService } = require('../dist/mch/mch.service.js');
  assert.equal(MchService.calculateTrimester(8), 1);
  assert.equal(MchService.calculateTrimester(13), 1);
  assert.equal(MchService.calculateTrimester(14), 2);
  assert.equal(MchService.calculateTrimester(26), 2);
  assert.equal(MchService.calculateTrimester(27), 3);
  assert.equal(MchService.calculateTrimester(40), 3);
});

// ─── 2. Vaccination schedule generation ───────────────────────────────────────

test('buildVaccinationSchedule generates BCG at birth (offset 0)', () => {
  const { buildVaccinationSchedule } = require('../dist/mch/mch.vaccination-schedule.js');
  const dob = new Date('2026-06-01');
  const schedule = buildVaccinationSchedule(dob);
  const bcg = schedule.find(d => d.vaccineName === 'BCG' && d.doseNumber === 1);
  assert.ok(bcg, 'BCG dose 1 must exist');
  assert.equal(bcg.scheduledDate.toISOString().slice(0, 10), '2026-06-01');
});

test('buildVaccinationSchedule generates DPT dose 1 at 6 weeks (42 days)', () => {
  const { buildVaccinationSchedule } = require('../dist/mch/mch.vaccination-schedule.js');
  const dob = new Date('2026-01-01');
  const schedule = buildVaccinationSchedule(dob);
  const dpt1 = schedule.find(d => d.vaccineName === 'DPT' && d.doseNumber === 1);
  assert.ok(dpt1, 'DPT dose 1 must exist');
  const expected = new Date('2026-02-12'); // Jan 1 + 42 days
  assert.equal(dpt1.scheduledDate.toISOString().slice(0, 10), expected.toISOString().slice(0, 10));
});

test('buildVaccinationSchedule produces at least 30 scheduled doses', () => {
  const { buildVaccinationSchedule } = require('../dist/mch/mch.vaccination-schedule.js');
  const schedule = buildVaccinationSchedule(new Date('2025-01-01'));
  assert.ok(schedule.length >= 30, `Expected ≥30 doses, got ${schedule.length}`);
});

test('buildVaccinationSchedule all scheduled dates are Date instances', () => {
  const { buildVaccinationSchedule } = require('../dist/mch/mch.vaccination-schedule.js');
  const schedule = buildVaccinationSchedule(new Date('2025-06-15'));
  for (const dose of schedule) {
    assert.ok(dose.scheduledDate instanceof Date, `${dose.vaccineName} dose ${dose.doseNumber} scheduledDate is not a Date`);
    assert.ok(!isNaN(dose.scheduledDate.getTime()), `${dose.vaccineName} scheduledDate is invalid`);
  }
});

// ─── 3. Milestone definitions ──────────────────────────────────────────────────

test('MILESTONE_DEFINITIONS contains entries for all 5 categories', () => {
  const { MILESTONE_DEFINITIONS } = require('../dist/mch/mch.milestones-schedule.js');
  const cats = new Set(MILESTONE_DEFINITIONS.map(m => m.category));
  for (const required of ['GROSS_MOTOR', 'FINE_MOTOR', 'LANGUAGE', 'SOCIAL_EMOTIONAL', 'COGNITIVE']) {
    assert.ok(cats.has(required), `Missing category: ${required}`);
  }
});

test('MILESTONE_DEFINITIONS each entry has valid expectedAgeMonths ≥ 0', () => {
  const { MILESTONE_DEFINITIONS } = require('../dist/mch/mch.milestones-schedule.js');
  for (const m of MILESTONE_DEFINITIONS) {
    assert.ok(typeof m.expectedAgeMonths === 'number' && m.expectedAgeMonths >= 0, `${m.milestoneName} has invalid expectedAgeMonths`);
    assert.ok(typeof m.milestoneName === 'string' && m.milestoneName.length > 0, 'Milestone name must be non-empty');
  }
});

test('MILESTONE_DEFINITIONS has at least 20 entries', () => {
  const { MILESTONE_DEFINITIONS } = require('../dist/mch/mch.milestones-schedule.js');
  assert.ok(MILESTONE_DEFINITIONS.length >= 20, `Expected ≥20 milestones, got ${MILESTONE_DEFINITIONS.length}`);
});

// ─── 4. Clinical rules config ──────────────────────────────────────────────────

test('MCH_CLINICAL_RULES has numeric ANC thresholds', () => {
  const { MCH_CLINICAL_RULES } = require('../dist/mch/mch.clinical-rules.js');
  const { anc } = MCH_CLINICAL_RULES;
  assert.ok(typeof anc.systolicBpWarning === 'number' && anc.systolicBpWarning > 0);
  assert.ok(typeof anc.systolicBpCritical === 'number' && anc.systolicBpCritical > anc.systolicBpWarning,
    'Critical threshold must be > warning threshold');
  assert.ok(typeof anc.diastolicBpWarning === 'number' && anc.diastolicBpWarning > 0);
  assert.ok(typeof anc.hemoglobinLowWarning === 'number' && anc.hemoglobinLowWarning > 0);
  assert.ok(anc.hemoglobinLowCritical < anc.hemoglobinLowWarning,
    'Critical Hb threshold must be lower than warning threshold');
});

test('MCH_CLINICAL_RULES growth thresholds are valid percentages', () => {
  const { MCH_CLINICAL_RULES } = require('../dist/mch/mch.clinical-rules.js');
  const { growth } = MCH_CLINICAL_RULES;
  assert.ok(growth.weightBelowMedianWarningPct > 0 && growth.weightBelowMedianWarningPct < 100);
  assert.ok(growth.weightBelowMedianCriticalPct > growth.weightBelowMedianWarningPct,
    'Critical % must be higher than warning %');
});

// ─── 5. Authorization — patient cannot access another patient's records ─────────

test('MchService.assertPatientAccess rejects wrong patient (patient role)', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origFindUnique = prisma.patient.findUnique;
  // Actor user-B resolves to patient-B, but target patientId is patient-A
  prisma.patient.findUnique = async ({ where }) => {
    if (where.userId === 'user-B') return { id: 'patient-B', userId: 'user-B' };
    if (where.id === 'patient-A') return { id: 'patient-A', userId: 'user-A' };
    return null;
  };

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    // user-B owns patient-B, trying to access patient-A — must be rejected
    await assert.rejects(
      () => svc.assertPatientAccess({ userId: 'user-B', role: 'PATIENT' }, 'patient-A'),
      (err) => {
        assert.ok(err.status === 403 || err.constructor?.name?.includes('Forbidden'), `Expected ForbiddenException, got: ${err.constructor?.name}: ${err.message}`);
        return true;
      }
    );
  } finally {
    prisma.patient.findUnique = origFindUnique;
  }
});

test('MchService.assertPatientAccess allows correct patient (patient role)', async () => {
  const { prisma } = require('../dist/prisma.js');

  const orig = prisma.patient.findUnique;
  prisma.patient.findUnique = async () => ({ id: 'patient-A', userId: 'user-A' });

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    // Should resolve without throwing
    await svc.assertPatientAccess({ userId: 'user-A', role: 'PATIENT' }, 'patient-A');
  } finally {
    prisma.patient.findUnique = orig;
  }
});

// ─── 6. Authorization — doctor without appointment cannot access records ────────

test('MchService.assertPatientAccess rejects doctor with no appointment link', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origAppointment = prisma.appointment.findFirst;
  prisma.appointment.findFirst = async () => null; // no linking appointment

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    await assert.rejects(
      () => svc.assertPatientAccess({ userId: 'doctor-user', role: 'DOCTOR' }, 'patient-X'),
      (err) => {
        assert.ok(err.status === 403 || err.constructor?.name?.includes('Forbidden'), `Expected 403, got: ${err.constructor?.name}: ${err.message}`);
        return true;
      }
    );
  } finally {
    prisma.appointment.findFirst = origAppointment;
  }
});

test('MchService.assertPatientAccess allows doctor with appointment link', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origAppointment = prisma.appointment.findFirst;
  prisma.appointment.findFirst = async ({ where }) => {
    if (where?.doctor?.is?.userId === 'doctor-user' && where?.patientId === 'patient-X') {
      return { id: 'appt-1' };
    }
    return null;
  };

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    // Should not throw
    await svc.assertPatientAccess({ userId: 'doctor-user', role: 'DOCTOR' }, 'patient-X');
  } finally {
    prisma.appointment.findFirst = origAppointment;
  }
});

// ─── 7. Active pregnancy conflict ─────────────────────────────────────────────

test('createPregnancy rejects a second active pregnancy', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origPatient = prisma.patient.findUnique;
  const origPregnancy = prisma.pregnancy.findFirst;

  prisma.patient.findUnique = async () => ({ id: 'patient-1', userId: 'user-1' });
  prisma.pregnancy.findFirst = async () => ({ id: 'existing-preg', status: 'ACTIVE' });

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    await assert.rejects(
      () => svc.createPregnancy({ userId: 'user-1', role: 'PATIENT' }, {}),
      (err) => {
        assert.ok(err.status === 409 || err.constructor?.name?.includes('Conflict'), `Expected ConflictException, got ${err.constructor?.name}: ${err.message}`);
        return true;
      }
    );
  } finally {
    prisma.patient.findUnique = origPatient;
    prisma.pregnancy.findFirst = origPregnancy;
  }
});

test('createPregnancy succeeds when no active pregnancy exists', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origPatient = prisma.patient.findUnique;
  const origFind = prisma.pregnancy.findFirst;
  const origCreate = prisma.pregnancy.create;

  prisma.patient.findUnique = async () => ({ id: 'patient-1', userId: 'user-1' });
  prisma.pregnancy.findFirst = async () => null;
  prisma.pregnancy.create = async (args) => ({ id: 'new-preg', ...args.data, status: 'ACTIVE' });

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    const result = await svc.createPregnancy({ userId: 'user-1', role: 'PATIENT' }, { lmpDate: '2026-01-01' });
    assert.equal(result.status, 'ACTIVE');
    assert.ok(result.lmpDate);
  } finally {
    prisma.patient.findUnique = origPatient;
    prisma.pregnancy.findFirst = origFind;
    prisma.pregnancy.create = origCreate;
  }
});

// ─── 8. EDD calculation from LMP ─────────────────────────────────────────────

test('createPregnancy calculates eddLmp as LMP + 280 days', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origPatient = prisma.patient.findUnique;
  const origFind = prisma.pregnancy.findFirst;
  const origCreate = prisma.pregnancy.create;

  let capturedData = null;
  prisma.patient.findUnique = async () => ({ id: 'p1', userId: 'u1' });
  prisma.pregnancy.findFirst = async () => null;
  prisma.pregnancy.create = async (args) => { capturedData = args.data; return { id: 'new', ...args.data }; };

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    await svc.createPregnancy({ userId: 'u1', role: 'PATIENT' }, { lmpDate: '2026-01-01' });
    assert.ok(capturedData?.eddLmp, 'eddLmp must be set');
    const eddDate = capturedData.eddLmp;
    const lmpDate = new Date('2026-01-01');
    const diffDays = Math.round((eddDate.getTime() - lmpDate.getTime()) / (24 * 3600 * 1000));
    assert.equal(diffDays, 280, `EDD must be 280 days after LMP, got ${diffDays}`);
  } finally {
    prisma.patient.findUnique = origPatient;
    prisma.pregnancy.findFirst = origFind;
    prisma.pregnancy.create = origCreate;
  }
});

// ─── 9. Child DOB validation ──────────────────────────────────────────────────

test('createChild rejects future date of birth', async () => {
  const { prisma } = require('../dist/prisma.js');
  const origPatient = prisma.patient.findUnique;
  prisma.patient.findUnique = async () => ({ id: 'p1', userId: 'u1' });

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    await assert.rejects(
      () => svc.createChild({ userId: 'u1', role: 'PATIENT' }, { name: 'Test', dateOfBirth: futureDate, sex: 'MALE' }),
      (err) => {
        assert.ok(err.status === 400 || err.constructor?.name?.includes('BadRequest'), `Expected 400, got ${err.constructor?.name}: ${err.message}`);
        return true;
      }
    );
  } finally {
    prisma.patient.findUnique = origPatient;
  }
});

// ─── 10. Vaccination status auto-update (UPCOMING → DUE) ──────────────────────

test('listVaccinations marks UPCOMING records as DUE when scheduledDate is past', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origChild = prisma.child.findUnique;
  const origVaccFindMany1 = prisma.vaccinationRecord.findMany;
  const origUpdateMany = prisma.vaccinationRecord.updateMany;

  const pastDate = new Date(Date.now() - 3 * 24 * 3600 * 1000); // 3 days ago
  const upcomingId = 'vacc-1';

  let updateManyCalled = false;
  let updateManyWhere = null;

  prisma.child.findUnique = async () => ({ id: 'child-1', patientId: 'p1' });

  // First call returns UPCOMING with past date; second call (after update) returns DUE
  let callCount = 0;
  prisma.vaccinationRecord.findMany = async () => {
    callCount++;
    if (callCount === 1) {
      return [{ id: upcomingId, childId: 'child-1', status: 'UPCOMING', scheduledDate: pastDate, vaccineName: 'DPT', doseNumber: 1 }];
    }
    return [{ id: upcomingId, childId: 'child-1', status: 'DUE', scheduledDate: pastDate, vaccineName: 'DPT', doseNumber: 1 }];
  };
  prisma.vaccinationRecord.updateMany = async (args) => {
    updateManyCalled = true;
    updateManyWhere = args.where;
    return { count: 1 };
  };

  // Also need to mock patient access check
  const origAppt = prisma.appointment.findFirst;
  prisma.appointment.findFirst = async () => ({ id: 'appt-1' });

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    const result = await svc.listVaccinations({ userId: 'doctor-u', role: 'DOCTOR' }, 'child-1');
    assert.ok(updateManyCalled, 'updateMany must be called to transition UPCOMING → DUE');
    assert.ok(updateManyWhere?.id?.in?.includes(upcomingId), 'updateMany must target the past UPCOMING record');
    assert.ok(result.some(v => v.status === 'DUE'), 'Result must include a DUE record');
  } finally {
    prisma.child.findUnique = origChild;
    prisma.vaccinationRecord.findMany = origVaccFindMany1;
    prisma.vaccinationRecord.updateMany = origUpdateMany;
    prisma.appointment.findFirst = origAppt;
  }
});

// ─── 11. Reminder idempotency — duplicate reminders not created ───────────────

test('scheduleVaccinationReminders skips already-existing reminders (idempotent)', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origFind = prisma.mchReminder.findFirst;
  const origCreate = prisma.mchReminder.create;

  let createCount = 0;
  // Simulate that ALL reminder types already exist
  prisma.mchReminder.findFirst = async () => ({ id: 'existing-reminder' });
  prisma.mchReminder.create = async () => { createCount++; return { id: 'new' }; };

  // Stub mchQueue on service prototype
  const { MchService } = require('../dist/mch/mch.service.js');
  const svc = Object.create(MchService.prototype);
  svc.mchQueue = { add: async () => ({}) };

  const futureDate = new Date(Date.now() + 10 * 24 * 3600 * 1000);

  try {
    await svc.scheduleVaccinationReminders('patient-1', 'child-1', 'vacc-1', futureDate);
    assert.equal(createCount, 0, 'No new reminders should be created when all already exist');
  } finally {
    prisma.mchReminder.findFirst = origFind;
    prisma.mchReminder.create = origCreate;
  }
});

test('scheduleVaccinationReminders creates 3 reminder records for new vaccination', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origFind = prisma.mchReminder.findFirst;
  const origCreate = prisma.mchReminder.create;

  let createCount = 0;
  // No existing reminders
  prisma.mchReminder.findFirst = async () => null;
  prisma.mchReminder.create = async (args) => { createCount++; return { id: `r-${createCount}`, ...args.data }; };

  const { MchService } = require('../dist/mch/mch.service.js');
  const svc = Object.create(MchService.prototype);
  svc.mchQueue = { add: async () => ({}) };

  const futureDate = new Date(Date.now() + 14 * 24 * 3600 * 1000); // 14 days from now

  try {
    await svc.scheduleVaccinationReminders('patient-1', 'child-1', 'vacc-1', futureDate);
    assert.equal(createCount, 3, `Expected 3 reminder records (7d, 3d, due), got ${createCount}`);
  } finally {
    prisma.mchReminder.findFirst = origFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ─── 12. ANC reminder idempotency ─────────────────────────────────────────────

test('scheduleAncReminders creates 3 reminders for a new next-visit date', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origFind = prisma.mchReminder.findFirst;
  const origCreate = prisma.mchReminder.create;

  let createCount = 0;
  prisma.mchReminder.findFirst = async () => null;
  prisma.mchReminder.create = async () => { createCount++; return { id: `a-${createCount}` }; };

  const { MchService } = require('../dist/mch/mch.service.js');
  const svc = Object.create(MchService.prototype);
  svc.mchQueue = { add: async () => ({}) };

  const futureVisit = new Date(Date.now() + 20 * 24 * 3600 * 1000);

  try {
    await svc.scheduleAncReminders('patient-1', 'anc-visit-1', futureVisit);
    assert.equal(createCount, 3, `Expected 3 ANC reminder records, got ${createCount}`);
  } finally {
    prisma.mchReminder.findFirst = origFind;
    prisma.mchReminder.create = origCreate;
  }
});

test('scheduleAncReminders skips past reminder dates silently', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origFind = prisma.mchReminder.findFirst;
  const origCreate = prisma.mchReminder.create;
  const { Queue } = require('bullmq');

  let queueAddCount = 0;
  prisma.mchReminder.findFirst = async () => null;
  prisma.mchReminder.create = async () => ({ id: 'r1' });

  const { MchService } = require('../dist/mch/mch.service.js');
  const svc = Object.create(MchService.prototype);
  // Mock queue — only jobs with delay>0 should be queued
  svc.mchQueue = { add: async (name, data, opts) => { if ((opts?.delay ?? 0) > 0) queueAddCount++; return {}; } };

  // Visit date is 1 day in the future — so 7d and 3d reminders are already past
  const nearFutureVisit = new Date(Date.now() + 1 * 24 * 3600 * 1000);

  try {
    await svc.scheduleAncReminders('patient-1', 'anc-1', nearFutureVisit);
    // Only the "due" reminder (offset 0) lands in the future; 7d and 3d are past → delay <= 0
    assert.ok(queueAddCount <= 1, `At most 1 future job should be queued; got ${queueAddCount}`);
  } finally {
    prisma.mchReminder.findFirst = origFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ─── 13. MCH processor reminder idempotency ───────────────────────────────────

test('MchProcessor skips already-sent reminder (idempotent)', async () => {
  const { prisma } = require('../dist/prisma.js');
  const { MchProcessor } = require('../dist/mch/mch.processor.js');

  const origFind = prisma.mchReminder.findUnique;
  prisma.mchReminder.findUnique = async () => ({
    id: 'r1',
    status: 'SENT',  // already sent
    reminderType: 'VACCINATION_7D',
    eventDate: new Date(),
    patient: { user: { email: 'p@test.com', fullName: 'Patient' } },
    child: { name: 'Baby' },
  });

  const mailSpy = { sendMail: async () => { throw new Error('Should not send mail for already-sent reminder'); } };
  const proc = new MchProcessor(mailSpy);

  try {
    const result = await proc.process({ name: 'send-mch-reminder', data: { reminderId: 'r1', type: 'VACCINATION_7D', patientId: 'p1' } });
    assert.equal(result.status, 'skipped');
    assert.ok(result.reason?.toLowerCase().includes('already'), `Unexpected skip reason: ${result.reason}`);
  } finally {
    prisma.mchReminder.findUnique = origFind;
  }
});

test('MchProcessor sends email and marks reminder SENT', async () => {
  const { prisma } = require('../dist/prisma.js');
  const { MchProcessor } = require('../dist/mch/mch.processor.js');

  const origFind = prisma.mchReminder.findUnique;
  const origUpdate = prisma.mchReminder.update;

  let mailSent = false;
  let updatedStatus = null;

  prisma.mchReminder.findUnique = async () => ({
    id: 'r2',
    status: 'PENDING',
    reminderType: 'VACCINATION_DUE',
    eventDate: new Date(),
    patient: { user: { email: 'parent@test.com', fullName: 'Priya' } },
    child: { name: 'Arjun' },
  });
  prisma.mchReminder.update = async (args) => { updatedStatus = args.data.status; return {}; };

  const mailSpy = { sendMail: async () => { mailSent = true; } };
  const proc = new MchProcessor(mailSpy);

  try {
    const result = await proc.process({ name: 'send-mch-reminder', data: { reminderId: 'r2', type: 'VACCINATION_DUE', patientId: 'p1' } });
    assert.equal(result.status, 'sent');
    assert.ok(mailSent, 'Email must be sent');
    assert.equal(updatedStatus, 'SENT', 'Reminder status must be updated to SENT');
  } finally {
    prisma.mchReminder.findUnique = origFind;
    prisma.mchReminder.update = origUpdate;
  }
});

// ─── 14. Safety flag evaluation — ANC BP threshold ────────────────────────────

test('evaluateAncSafetyFlags creates CRITICAL flag for very high systolic BP', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origCreate = prisma.mchSafetyFlag.createMany;
  let capturedFlags = null;
  prisma.mchSafetyFlag.createMany = async (args) => { capturedFlags = args.data; return { count: args.data.length }; };

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    // evaluateAncSafetyFlags is a private method; call it directly via prototype
    await svc.evaluateAncSafetyFlags('visit-1', { systolicBp: 170, diastolicBp: 100, hemoglobin: 12 });
    assert.ok(capturedFlags !== null, 'createMany must have been called');
    const criticalFlags = capturedFlags.filter(f => f.severity === 'CRITICAL');
    assert.ok(criticalFlags.length >= 1, 'At least one CRITICAL flag expected for systolic 170');
    assert.ok(capturedFlags.some(f => f.flagCode.includes('SYSTOLIC')), 'SYSTOLIC flag code expected');
  } finally {
    prisma.mchSafetyFlag.createMany = origCreate;
  }
});

test('evaluateAncSafetyFlags creates WARNING flag for elevated Hb (low)', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origCreate = prisma.mchSafetyFlag.createMany;
  let capturedFlags = null;
  prisma.mchSafetyFlag.createMany = async (args) => { capturedFlags = args.data; return { count: args.data.length }; };

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    // Hb = 8.5 (below warning threshold of 10, above critical of 7)
    await svc.evaluateAncSafetyFlags('visit-2', { hemoglobin: 8.5 });
    assert.ok(capturedFlags !== null && capturedFlags.length >= 1, 'At least one flag expected for low Hb');
    const hbFlag = capturedFlags.find(f => f.flagCode.includes('HB'));
    assert.ok(hbFlag, 'HB flag must be raised');
    assert.equal(hbFlag.severity, 'WARNING', `Expected WARNING for Hb 8.5, got ${hbFlag.severity}`);
  } finally {
    prisma.mchSafetyFlag.createMany = origCreate;
  }
});

test('evaluateAncSafetyFlags does NOT create flags for normal vitals', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origCreate = prisma.mchSafetyFlag.createMany;
  let createManyCalled = false;
  prisma.mchSafetyFlag.createMany = async () => { createManyCalled = true; return { count: 0 }; };

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    // Normal values: systolic 120, diastolic 80, Hb 12
    await svc.evaluateAncSafetyFlags('visit-3', { systolicBp: 120, diastolicBp: 80, hemoglobin: 12 });
    assert.equal(createManyCalled, false, 'createMany must NOT be called for normal vitals');
  } finally {
    prisma.mchSafetyFlag.createMany = origCreate;
  }
});

// ─── 15. assertDoctorRole rejects non-doctor actor ────────────────────────────

test('assertDoctorRole rejects PATIENT role', async () => {
  const { MchService } = require('../dist/mch/mch.service.js');
  const svc = Object.create(MchService.prototype);
  await assert.rejects(
    () => svc.assertDoctorRole({ userId: 'patient-user', role: 'PATIENT' }),
    (err) => {
      assert.ok(err.status === 403 || err.constructor?.name?.includes('Forbidden'), `Expected ForbiddenException, got ${err.constructor?.name}: ${err.message}`);
      return true;
    }
  );
});

test('assertDoctorRole returns doctor id for DOCTOR role', async () => {
  const { prisma } = require('../dist/prisma.js');
  const origFind = prisma.doctor.findUnique;
  prisma.doctor.findUnique = async () => ({ id: 'doctor-id-1', userId: 'doctor-user' });

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    const doctorId = await svc.assertDoctorRole({ userId: 'doctor-user', role: 'DOCTOR' });
    assert.equal(doctorId, 'doctor-id-1');
  } finally {
    prisma.doctor.findUnique = origFind;
  }
});

// ─── 16. Overview returns correct structure ───────────────────────────────────

test('getMchOverview returns activePregnancy, children, openFlags', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origPatient = prisma.patient.findUnique;
  const origAppt = prisma.appointment.findFirst;
  const origPregnancy = prisma.pregnancy.findFirst;
  const origChildren = prisma.child.findMany;
  const origFlags = prisma.mchSafetyFlag.findMany;

  prisma.patient.findUnique = async () => ({ id: 'p1', userId: 'u1' });
  prisma.appointment.findFirst = async () => ({ id: 'a1' });
  prisma.pregnancy.findFirst = async () => ({
    id: 'preg-1', patientId: 'p1', status: 'ACTIVE',
    lmpDate: new Date(Date.now() - 20 * 7 * 24 * 3600 * 1000), // 20 weeks ago
    eddLmp: null, eddUltrasound: null, ancVisits: [],
  });
  prisma.child.findMany = async () => [
    { id: 'c1', name: 'Baby', dateOfBirth: new Date('2025-01-01'), patientId: 'p1', sex: 'MALE', vaccinationRecords: [], growthMeasurements: [] }
  ];
  prisma.mchSafetyFlag.findMany = async () => [];

  try {
    const { MchService } = require('../dist/mch/mch.service.js');
    const svc = Object.create(MchService.prototype);
    const overview = await svc.getMchOverview({ userId: 'u1', role: 'PATIENT' });
    assert.ok(overview.activePregnancy !== undefined, 'activePregnancy must be in overview');
    assert.ok(Array.isArray(overview.children), 'children must be an array');
    assert.ok(Array.isArray(overview.openFlags), 'openFlags must be an array');
    assert.ok(typeof overview.activePregnancy.gestationalWeeks === 'number', 'gestationalWeeks must be computed');
    assert.ok(overview.activePregnancy.trimester >= 1 && overview.activePregnancy.trimester <= 3, 'trimester must be 1, 2, or 3');
  } finally {
    prisma.patient.findUnique = origPatient;
    prisma.appointment.findFirst = origAppt;
    prisma.pregnancy.findFirst = origPregnancy;
    prisma.child.findMany = origChildren;
    prisma.mchSafetyFlag.findMany = origFlags;
  }
});
