const test = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');

process.env.GOOGLE_CLIENT_ID ||= 'test-google-client-id.apps.googleusercontent.com';

const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;

function createService(overrides = {}) {
  const state = { userCreate: null, userUpdate: null, patientCreated: false, doctorCreated: false };
  const prisma = {
    user: {
      findUnique: async ({ where }) => {
        if (where.googleId && overrides.byGoogleId) return overrides.byGoogleId;
        if (where.email && overrides.byEmail) return overrides.byEmail;
        return null;
      },
      update: async ({ data, include }) => {
        state.userUpdate = data;
        const base = overrides.byEmail || overrides.byGoogleId;
        return { ...base, ...data, doctor: base?.doctor ?? null, patient: base?.patient ?? null, include };
      },
      create: async ({ data }) => {
        state.userCreate = data;
        return {
          id: 'user-google',
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          tokenVersion: 0,
          accountStatus: 'ACTIVE',
          doctor: null,
          patient: null,
          ...data,
        };
      },
      findUniqueOrThrow: async ({ where }) => ({
        id: where.id,
        email: state.userCreate?.email || overrides.byEmail?.email || overrides.byGoogleId?.email,
        fullName: state.userCreate?.fullName || overrides.byEmail?.fullName || overrides.byGoogleId?.fullName,
        role: state.userCreate?.role || overrides.byEmail?.role || overrides.byGoogleId?.role,
        tokenVersion: 0,
        accountStatus: 'ACTIVE',
        doctor: overrides.byEmail?.doctor || overrides.byGoogleId?.doctor || null,
        patient: overrides.byEmail?.patient || overrides.byGoogleId?.patient || null,
      }),
    },
    patient: { create: async () => { state.patientCreated = true; return {}; } },
    doctor: { create: async () => { state.doctorCreated = true; return {}; } },
    $transaction: async (callback) => callback(prisma),
  };

  const { AuthService } = require('../dist/auth/auth.service.js');
  const authService = new AuthService({ sign: () => 'jwt-token' }, prisma, { sendMail: async () => {} });
  return { authService, state };
}

test('google login creates a new patient account and returns the normal auth shape', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: 'google-sub-1',
      email: 'patient.google@example.com',
      email_verified: true,
      name: 'Google Patient',
      picture: 'https://example.com/avatar.png',
    }),
  });

  const { authService, state } = createService();
  const result = await authService.googleLogin('credential-1', 'PATIENT');

  assert.equal(result.role, 'PATIENT');
  assert.equal(result.accessToken, 'jwt-token');
  assert.equal(result.onboardingCompleted, true);
  assert.equal(state.patientCreated, true);
  assert.equal(state.userCreate.authProvider, 'GOOGLE');
});

test('google login rejects tokens with the wrong audience', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => {
    throw new Error('Wrong audience');
  };

  const { authService } = createService();
  await assert.rejects(() => authService.googleLogin('credential-2', 'PATIENT'), /Wrong audience/);
});

test('google login rejects unverified Google emails', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: 'google-sub-2',
      email: 'doctor.google@example.com',
      email_verified: false,
      name: 'Google Doctor',
    }),
  });

  const { authService } = createService();
  await assert.rejects(() => authService.googleLogin('credential-3', 'DOCTOR'), /not verified/);
});

test('google login rejects expired tokens', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => {
    throw new Error('Token expired');
  };

  const { authService } = createService();
  await assert.rejects(() => authService.googleLogin('credential-3-expired', 'PATIENT'), /Token expired/);
});

test('google login links an existing same-role account by email', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: 'google-sub-3',
      email: 'doctor@example.com',
      email_verified: true,
      name: 'Linked Doctor',
    }),
  });

  const existingDoctor = {
    id: 'user-doctor',
    email: 'doctor@example.com',
    fullName: 'Dr. Existing',
    role: 'DOCTOR',
    tokenVersion: 0,
    accountStatus: 'ACTIVE',
    doctor: { degrees: null, experience: null, hospital: null, availability: null },
    patient: null,
  };

  const { authService } = createService({ byEmail: existingDoctor });
  const result = await authService.googleLogin('credential-4', 'DOCTOR');

  assert.equal(result.role, 'DOCTOR');
  assert.equal(result.onboardingCompleted, false);
});

test('google login blocks role conflicts', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: 'google-sub-4',
      email: 'patient@example.com',
      email_verified: true,
      name: 'Role Conflict',
    }),
  });

  const existingPatient = {
    id: 'user-patient',
    email: 'patient@example.com',
    fullName: 'Patient Existing',
    role: 'PATIENT',
    tokenVersion: 0,
    accountStatus: 'ACTIVE',
    doctor: null,
    patient: { id: 'patient-1' },
  };

  const { authService } = createService({ byEmail: existingPatient });
  await assert.rejects(() => authService.googleLogin('credential-5', 'DOCTOR'), /registered as a Patient/);
});

test('google signup rejects explicit consent refusal', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: 'google-sub-5',
      email: 'new-doctor@example.com',
      email_verified: true,
      name: 'Consent Doctor',
    }),
  });

  const { authService } = createService();
  await assert.rejects(() => authService.googleLogin('credential-6', 'DOCTOR', false), /consent to data processing/);
});

test('google login creates a doctor account with onboarding pending', async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: 'google-sub-6',
      email: 'fresh-doctor@example.com',
      email_verified: true,
      name: 'Fresh Doctor',
    }),
  });

  const { authService, state } = createService();
  const result = await authService.googleLogin('credential-7', 'DOCTOR');

  assert.equal(result.role, 'DOCTOR');
  assert.equal(result.onboardingCompleted, false);
  assert.equal(state.doctorCreated, true);
});

test.after(() => {
  OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
});