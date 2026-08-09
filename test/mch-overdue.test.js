'use strict';
/**
 * MCH Overdue Worker — focused tests.
 * Follows the existing node:test + assert/strict + dist/ pattern.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';

// ── Shared stubs ─────────────────────────────────────────────────────────────

function makeWorker(overrides = {}) {
  const { MchOverdueWorker } = require('../dist/mch/mch.overdue-worker.js');
  const svc = Object.create(MchOverdueWorker.prototype);
  svc.logger = { log: () => {}, error: () => {}, debug: () => {}, warn: () => {} };
  svc.BATCH_SIZE = 200;
  svc.mchQueue = { add: async () => ({}) };
  Object.assign(svc, overrides);
  return svc;
}

// ── 1. Creates vaccination overdue reminder ───────────────────────────────────

test('runOverdueScan creates VACCINATION_OVERDUE for past DUE vaccination', async () => {
  const { prisma } = require('../dist/prisma.js');

  const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000);

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;
  const origEnqueue  = prisma.mchReminder.create; // reused below

  let createdReminder = null;
  let enqueuedJobName = null;

  prisma.vaccinationRecord.findMany = async () => [{
    id: 'vacc-1', childId: 'child-1', scheduledDate: pastDate,
    status: 'DUE', child: { id: 'child-1', patientId: 'patient-1' },
  }];
  prisma.ancVisit.findMany = async () => [];
  prisma.mchReminder.create = async (args) => {
    createdReminder = args.data;
    return { id: 'rem-1', ...args.data };
  };

  const svc = makeWorker({
    mchQueue: { add: async (name) => { enqueuedJobName = name; return {}; } },
  });

  try {
    const result = await svc.runOverdueScan();
    assert.equal(result.vaccinations, 1, 'Should create 1 vaccination overdue reminder');
    assert.equal(result.anc, 0);
    assert.ok(createdReminder, 'Reminder must be created');
    assert.equal(createdReminder.reminderType, 'VACCINATION_OVERDUE');
    assert.equal(createdReminder.vaccinationRecordId, 'vacc-1');
    assert.equal(createdReminder.patientId, 'patient-1');
    assert.equal(enqueuedJobName, 'send-mch-reminder', 'Job must be enqueued on mch-queue');
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 2. Creates ANC overdue reminder ──────────────────────────────────────────

test('runOverdueScan creates ANC_OVERDUE for past nextVisitDate in active pregnancy', async () => {
  const { prisma } = require('../dist/prisma.js');

  const pastDate = new Date(Date.now() - 3 * 24 * 3600 * 1000);

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;

  let createdReminder = null;

  prisma.vaccinationRecord.findMany = async () => [];
  prisma.ancVisit.findMany = async () => [{
    id: 'anc-1', nextVisitDate: pastDate,
    pregnancy: { patientId: 'patient-2' },
  }];
  prisma.mchReminder.create = async (args) => {
    createdReminder = args.data;
    return { id: 'rem-2', ...args.data };
  };

  const svc = makeWorker();

  try {
    const result = await svc.runOverdueScan();
    assert.equal(result.anc, 1, 'Should create 1 ANC overdue reminder');
    assert.equal(result.vaccinations, 0);
    assert.ok(createdReminder, 'Reminder must be created');
    assert.equal(createdReminder.reminderType, 'ANC_OVERDUE');
    assert.equal(createdReminder.ancVisitId, 'anc-1');
    assert.equal(createdReminder.patientId, 'patient-2');
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 3. Does NOT create reminder for COMPLETED vaccination ─────────────────────

test('runOverdueScan skips COMPLETED vaccinations', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;

  let createCalled = false;
  // The query filter already excludes COMPLETED — simulate by returning empty set
  prisma.vaccinationRecord.findMany = async ({ where }) => {
    // Verify the query itself excludes COMPLETED
    const statuses = where?.status?.in ?? [];
    assert.ok(!statuses.includes('COMPLETED'), 'Query must exclude COMPLETED status');
    assert.ok(!statuses.includes('MISSED'), 'Query must exclude MISSED status');
    return []; // nothing returned
  };
  prisma.ancVisit.findMany = async () => [];
  prisma.mchReminder.create = async () => { createCalled = true; return { id: 'x' }; };

  const svc = makeWorker();

  try {
    const result = await svc.runOverdueScan();
    assert.equal(result.vaccinations, 0);
    assert.equal(createCalled, false, 'No reminder should be created');
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 4. Does NOT create reminder for completed/resolved ANC (non-active pregnancy) ──

test('runOverdueScan skips ANC visits in non-active pregnancies', async () => {
  const { prisma } = require('../dist/prisma.js');

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;

  let createCalled = false;
  prisma.vaccinationRecord.findMany = async () => [];
  // Query filters on pregnancy.status = ACTIVE — simulate empty result for non-active
  prisma.ancVisit.findMany = async ({ where }) => {
    assert.equal(where?.pregnancy?.status, 'ACTIVE', 'Query must filter to ACTIVE pregnancies only');
    return []; // nothing returned
  };
  prisma.mchReminder.create = async () => { createCalled = true; return { id: 'x' }; };

  const svc = makeWorker();

  try {
    const result = await svc.runOverdueScan();
    assert.equal(result.anc, 0);
    assert.equal(createCalled, false);
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 5. Does NOT create duplicate vaccination overdue reminder (P2002 skip) ───

test('runOverdueScan silently skips when vaccination overdue reminder already exists (P2002)', async () => {
  const { prisma } = require('../dist/prisma.js');

  const pastDate = new Date(Date.now() - 2 * 24 * 3600 * 1000);

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;

  let queueAddCalled = false;
  prisma.vaccinationRecord.findMany = async () => [{
    id: 'vacc-2', childId: 'c2', scheduledDate: pastDate,
    status: 'DUE', child: { id: 'c2', patientId: 'p2' },
  }];
  prisma.ancVisit.findMany = async () => [];
  // Simulate unique constraint violation
  prisma.mchReminder.create = async () => { const err = new Error('Unique'); err.code = 'P2002'; throw err; };

  const svc = makeWorker({
    mchQueue: { add: async () => { queueAddCalled = true; return {}; } },
  });

  try {
    const result = await svc.runOverdueScan();
    // P2002 means reminder already exists — count stays 0
    assert.equal(result.vaccinations, 0, 'Duplicate should not be counted');
    assert.equal(queueAddCalled, false, 'Queue should not be called when reminder already exists');
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 6. Does NOT create duplicate ANC overdue reminder (P2002 skip) ───────────

test('runOverdueScan silently skips when ANC overdue reminder already exists (P2002)', async () => {
  const { prisma } = require('../dist/prisma.js');

  const pastDate = new Date(Date.now() - 1 * 24 * 3600 * 1000);

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;

  prisma.vaccinationRecord.findMany = async () => [];
  prisma.ancVisit.findMany = async () => [{
    id: 'anc-2', nextVisitDate: pastDate,
    pregnancy: { patientId: 'p3' },
  }];
  prisma.mchReminder.create = async () => { const err = new Error('Unique'); err.code = 'P2002'; throw err; };

  const svc = makeWorker();

  try {
    const result = await svc.runOverdueScan();
    assert.equal(result.anc, 0, 'Duplicate ANC reminder should not be counted');
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 7. Running the batch twice is idempotent ──────────────────────────────────

test('runOverdueScan is idempotent — running twice creates no extra reminders', async () => {
  const { prisma } = require('../dist/prisma.js');

  const pastDate = new Date(Date.now() - 4 * 24 * 3600 * 1000);

  const origVaccFind = prisma.vaccinationRecord.findMany;
  const origAncFind  = prisma.ancVisit.findMany;
  const origCreate   = prisma.mchReminder.create;

  let totalCreated = 0;
  let callCount = 0;

  prisma.vaccinationRecord.findMany = async () => [{
    id: 'vacc-idem', childId: 'ci', scheduledDate: pastDate,
    status: 'DUE', child: { id: 'ci', patientId: 'pi' },
  }];
  prisma.ancVisit.findMany = async () => [];

  // First call succeeds; second call throws P2002 (already exists)
  prisma.mchReminder.create = async () => {
    callCount++;
    if (callCount > 1) {
      const err = new Error('Unique'); err.code = 'P2002'; throw err;
    }
    totalCreated++;
    return { id: `rem-idem-${callCount}` };
  };

  const svc = makeWorker();

  try {
    const first = await svc.runOverdueScan();
    const second = await svc.runOverdueScan();
    assert.equal(first.vaccinations, 1, 'First run must create 1 reminder');
    assert.equal(second.vaccinations, 0, 'Second run must create 0 (idempotent)');
    assert.equal(totalCreated, 1, 'Only 1 reminder should ever be created');
  } finally {
    prisma.vaccinationRecord.findMany = origVaccFind;
    prisma.ancVisit.findMany = origAncFind;
    prisma.mchReminder.create = origCreate;
  }
});

// ── 8. MchProcessor sends overdue email correctly ─────────────────────────────

test('MchProcessor handles VACCINATION_OVERDUE job and sends overdue email', async () => {
  const { prisma } = require('../dist/prisma.js');
  const { MchProcessor } = require('../dist/mch/mch.processor.js');

  const origFind = prisma.mchReminder.findUnique;
  const origUpdate = prisma.mchReminder.update;

  let emailSubject = '';
  let emailBody = '';
  let statusUpdated = null;

  const pastDate = new Date(Date.now() - 2 * 24 * 3600 * 1000);

  prisma.mchReminder.findUnique = async () => ({
    id: 'rem-ov-1',
    status: 'PENDING',
    reminderType: 'VACCINATION_OVERDUE',
    eventDate: pastDate,
    patient: { user: { email: 'parent@test.com', fullName: 'Kavya' } },
    child: { name: 'Aryan' },
  });
  prisma.mchReminder.update = async (args) => { statusUpdated = args.data.status; return {}; };

  const mailSpy = { sendMail: async (to, subject, html) => { emailSubject = subject; emailBody = html; } };
  const proc = new MchProcessor(mailSpy);

  try {
    const result = await proc.process({
      name: 'send-mch-reminder',
      data: { reminderId: 'rem-ov-1', type: 'VACCINATION_OVERDUE', patientId: 'p1', childId: 'c1' },
    });
    assert.equal(result.status, 'sent');
    assert.equal(statusUpdated, 'SENT');
    assert.ok(emailSubject.includes('Vaccination'), `Email subject must mention Vaccination, got: ${emailSubject}`);
    // The email body should indicate overdue (timing = 'is overdue')
    assert.ok(emailBody.includes('overdue'), `Email body must contain 'overdue', got: ${emailBody.slice(0, 200)}`);
  } finally {
    prisma.mchReminder.findUnique = origFind;
    prisma.mchReminder.update = origUpdate;
  }
});

test('MchProcessor handles ANC_OVERDUE job and sends overdue email', async () => {
  const { prisma } = require('../dist/prisma.js');
  const { MchProcessor } = require('../dist/mch/mch.processor.js');

  const origFind = prisma.mchReminder.findUnique;
  const origUpdate = prisma.mchReminder.update;

  let emailSubject = '';

  prisma.mchReminder.findUnique = async () => ({
    id: 'rem-anc-ov',
    status: 'PENDING',
    reminderType: 'ANC_OVERDUE',
    eventDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    patient: { user: { email: 'priya@test.com', fullName: 'Priya' } },
    child: null,
  });
  prisma.mchReminder.update = async () => ({});

  const mailSpy = { sendMail: async (to, subject) => { emailSubject = subject; } };
  const proc = new MchProcessor(mailSpy);

  try {
    const result = await proc.process({
      name: 'send-mch-reminder',
      data: { reminderId: 'rem-anc-ov', type: 'ANC_OVERDUE', patientId: 'p2' },
    });
    assert.equal(result.status, 'sent');
    assert.ok(emailSubject.includes('ANC'), `Subject must mention ANC, got: ${emailSubject}`);
  } finally {
    prisma.mchReminder.findUnique = origFind;
    prisma.mchReminder.update = origUpdate;
  }
});

// ── 9. Existing 7d/3d/due reminder behavior is unchanged ─────────────────────

test('MchProcessor still handles VACCINATION_7D correctly (existing behavior unchanged)', async () => {
  const { prisma } = require('../dist/prisma.js');
  const { MchProcessor } = require('../dist/mch/mch.processor.js');

  const origFind = prisma.mchReminder.findUnique;
  const origUpdate = prisma.mchReminder.update;

  let emailSubject = '';
  const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  prisma.mchReminder.findUnique = async () => ({
    id: 'rem-7d',
    status: 'PENDING',
    reminderType: 'VACCINATION_7D',
    eventDate: futureDate,
    patient: { user: { email: 'test@test.com', fullName: 'Test' } },
    child: { name: 'Baby' },
  });
  prisma.mchReminder.update = async () => ({});

  const mailSpy = { sendMail: async (to, subject) => { emailSubject = subject; } };
  const proc = new MchProcessor(mailSpy);

  try {
    const result = await proc.process({
      name: 'send-mch-reminder',
      data: { reminderId: 'rem-7d', type: 'VACCINATION_7D', patientId: 'p1' },
    });
    assert.equal(result.status, 'sent');
    assert.ok(emailSubject.includes('7 days') || emailSubject.includes('Vaccination'), `7D email subject unexpected: ${emailSubject}`);
  } finally {
    prisma.mchReminder.findUnique = origFind;
    prisma.mchReminder.update = origUpdate;
  }
});

test('MchProcessor still handles ANC_DUE correctly (existing behavior unchanged)', async () => {
  const { prisma } = require('../dist/prisma.js');
  const { MchProcessor } = require('../dist/mch/mch.processor.js');

  const origFind = prisma.mchReminder.findUnique;
  const origUpdate = prisma.mchReminder.update;

  let emailSubject = '';

  prisma.mchReminder.findUnique = async () => ({
    id: 'rem-anc-due',
    status: 'PENDING',
    reminderType: 'ANC_DUE',
    eventDate: new Date(),
    patient: { user: { email: 'x@test.com', fullName: 'X' } },
    child: null,
  });
  prisma.mchReminder.update = async () => ({});

  const mailSpy = { sendMail: async (to, subject) => { emailSubject = subject; } };
  const proc = new MchProcessor(mailSpy);

  try {
    const result = await proc.process({
      name: 'send-mch-reminder',
      data: { reminderId: 'rem-anc-due', type: 'ANC_DUE', patientId: 'p1' },
    });
    assert.equal(result.status, 'sent');
    assert.ok(emailSubject.includes('ANC'), `ANC_DUE subject unexpected: ${emailSubject}`);
  } finally {
    prisma.mchReminder.findUnique = origFind;
    prisma.mchReminder.update = origUpdate;
  }
});
