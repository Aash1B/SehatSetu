const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { AccountDeletionService } = require('../dist/auth/account-deletion.service.js');

function harness(overrides = {}) {
  const state = { created: null, invalidated: false, mailHtml: '', attempts: 0, userUpdate: null, patientUpdate: null, reportsDeleted: false };
  const user = Object.hasOwn(overrides, 'user') ? overrides.user : {
    id: 'user-1', email: 'patient@example.com', fullName: 'Patient One', role: 'PATIENT',
    emailVerified: true, accountStatus: 'ACTIVE', patient: null, doctor: null,
  };
  const prisma = {
    user: { findUnique: async () => user, update: async ({ data }) => { state.userUpdate = data; return {}; } },
    accountDeletionOtp: {
      findFirst: async () => overrides.verification || null,
      count: async () => 0,
      updateMany: async () => { state.invalidated = true; return { count: 1 }; },
      create: async ({ data }) => { state.created = { id: 'otp-1', ...data }; return state.created; },
      delete: async () => ({}), deleteMany: async () => ({}),
      update: async () => ({ attempts: ++state.attempts }),
    },
    appointment: { count: async () => overrides.activeAppointments || 0, updateMany: async () => ({ count: 0 }) },
    medicalReport: { findMany: async () => overrides.reports || [], deleteMany: async () => { state.reportsDeleted = true; return { count: 0 }; } },
    patient: { update: async ({ data }) => { state.patientUpdate = data; return {}; } }, doctor: { update: async () => ({}) },
    storageCleanupJob: { findMany: async () => [], upsert: async () => ({}), update: async () => ({}) },
    accountDeletionAudit: { create: async () => ({}) },
    $transaction: async (callback) => callback(prisma),
  };
  const mail = { sendMail: async (_to, _subject, html) => { state.mailHtml = html; } };
  const storage = { deleteObject: async () => undefined };
  return { service: new AccountDeletionService(prisma, mail, storage), state, prisma };
}

test('OTP request requires an authenticated active account', async () => {
  const { service } = harness({ user: null });
  await assert.rejects(() => service.requestOtp('missing'), /not active/i);
});

test('OTP request stores only a bcrypt hash and invalidates prior codes', async () => {
  const { service, state } = harness();
  const result = await service.requestOtp('user-1');
  const plaintext = state.mailHtml.match(/<h2[^>]*>(\d{6})<\/h2>/)[1];
  assert.equal(state.invalidated, true);
  assert.notEqual(state.created.otpHash, plaintext);
  assert.equal(await bcrypt.compare(plaintext, state.created.otpHash), true);
  assert.equal(result.maskedDestination.includes('patient@example.com'), false);
});

test('confirmation text must exactly equal DELETE', async () => {
  const { service } = harness();
  await assert.rejects(() => service.confirm('user-1', '123456', 'delete'), /DELETE exactly/);
});

test('expired OTP cannot delete an account', async () => {
  const hash = await bcrypt.hash('123456', 4);
  const { service } = harness({ verification: { id: 'otp-1', otpHash: hash, attempts: 0, expiresAt: new Date(Date.now() - 1000) } });
  await assert.rejects(() => service.confirm('user-1', '123456', 'DELETE'), /expired/i);
});

test('incorrect OTP increments the attempt counter', async () => {
  const hash = await bcrypt.hash('123456', 4);
  const { service, state } = harness({ verification: { id: 'otp-1', otpHash: hash, attempts: 0, expiresAt: new Date(Date.now() + 60000) } });
  await assert.rejects(() => service.confirm('user-1', '654321', 'DELETE'), /Incorrect/);
  assert.equal(state.attempts, 1);
});

test('doctor deletion is blocked while consultations remain active', async () => {
  const hash = await bcrypt.hash('123456', 4);
  const doctor = { id: 'user-2', email: 'doctor@example.com', fullName: 'Doctor', role: 'DOCTOR', emailVerified: true, accountStatus: 'ACTIVE', patient: null, doctor: { id: 'doctor-1', availability: null } };
  const { service } = harness({ user: doctor, verification: { id: 'otp-1', otpHash: hash, attempts: 0, expiresAt: new Date(Date.now() + 60000) }, activeAppointments: 2 });
  await assert.rejects(() => service.confirm('user-2', '123456', 'DELETE'), /Resolve or cancel 2 upcoming consultations/);
});

test('patient deletion anonymizes identity and removes private report metadata', async () => {
  const hash = await bcrypt.hash('123456', 4);
  const patientUser = { id: 'user-3', email: 'person@example.com', fullName: 'Private Person', role: 'PATIENT', emailVerified: true, accountStatus: 'ACTIVE', patient: { id: 'patient-1', profileImagePath: null }, doctor: null };
  const { service, state } = harness({ user: patientUser, verification: { id: 'otp-1', otpHash: hash, attempts: 0, expiresAt: new Date(Date.now() + 60000) } });
  const result = await service.confirm('user-3', '123456', 'DELETE');
  assert.equal(result.deleted, true);
  assert.equal(state.userUpdate.accountStatus, 'DELETED');
  assert.match(state.userUpdate.email, /^deleted-/);
  assert.equal(state.patientUpdate.phone, null);
  assert.equal(state.reportsDeleted, true);
});
