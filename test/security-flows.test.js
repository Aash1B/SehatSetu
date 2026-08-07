const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
const { AuthService } = require('../dist/auth/auth.service.js');
const { LivekitService } = require('../dist/livekit/livekit.service.js');
const { AppointmentsService } = require('../dist/appointments/appointments.service.js');
const { prisma } = require('../dist/prisma.js');

test('login reports completed doctor onboarding from persisted profile data', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const prismaMock = {
    user: {
      findUnique: async () => ({
        id: 'user-doctor', email: 'doctor@example.com', fullName: 'Dr. Test', role: 'DOCTOR',
        passwordHash, emailVerified: true, accountStatus: 'ACTIVE', tokenVersion: 0, patient: null,
        doctor: {
          degrees: 'MBBS', experience: '5 Years', hospital: 'Clinic',
          availability: { medicalLicenseNumber: 'MED-1' },
        },
      }),
    },
  };
  const service = new AuthService({ sign: () => 'jwt' }, prismaMock, {});
  const result = await service.login('doctor@example.com', 'correct-password');
  assert.equal(result.onboardingCompleted, true);
});

test('new doctor login reports onboarding incomplete', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const prismaMock = {
    user: {
      findUnique: async () => ({
        id: 'new-doctor', email: 'new@example.com', fullName: 'New Doctor', role: 'DOCTOR',
        passwordHash, emailVerified: true, accountStatus: 'ACTIVE', tokenVersion: 0, patient: null,
        doctor: { degrees: null, experience: null, hospital: null, availability: null },
      }),
    },
  };
  const service = new AuthService({ sign: () => 'jwt' }, prismaMock, {});
  const result = await service.login('new@example.com', 'correct-password');
  assert.equal(result.onboardingCompleted, false);
});

test('video token rejects a user who is not assigned to the appointment', async () => {
  const original = prisma.appointment.findUnique;
  prisma.appointment.findUnique = async () => ({
    id: 'appointment-1', patient: { userId: 'patient-1', user: { fullName: 'Patient' } },
    doctor: { userId: 'doctor-1', user: { fullName: 'Doctor' } },
  });
  process.env.LIVEKIT_API_KEY = 'test-key';
  process.env.LIVEKIT_API_SECRET = 'test-secret';
  try {
    const service = new LivekitService({ add: async () => ({ id: 'job' }) });
    await assert.rejects(
      () => service.createTokenForAppointment('appointment-1', 'intruder', 'PATIENT'),
      /not a participant/i,
    );
  } finally {
    prisma.appointment.findUnique = original;
  }
});

test('appointment lookup scopes doctor access and supplies persisted demographics', async () => {
  const original = prisma.appointment.findFirst;
  let receivedWhere;
  prisma.appointment.findFirst = async ({ where }) => {
    receivedWhere = where;
    return {
      id: 'appointment-1', patientAge: null, patientGender: null, patientHeight: null,
      patientWeight: null, patientBloodGroup: null, patientPhone: null,
      patient: {
        age: '29', gender: 'Female', height: '165', weight: '60', bloodGroup: 'O+', phone: '123',
        dateOfBirth: null, user: { fullName: 'Patient' },
      },
      doctor: { userId: 'doctor-user', user: { fullName: 'Doctor' } },
      prescription: null, ehrRecord: null,
    };
  };
  try {
    const service = new AppointmentsService({ add: async () => ({}) });
    const result = await service.getAppointmentForUser('appointment-1', 'doctor-user', 'DOCTOR');
    assert.deepEqual(receivedWhere.doctor, { is: { userId: 'doctor-user' } });
    assert.equal(result.patientAge, '29');
    assert.equal(result.patientGender, 'Female');
  } finally {
    prisma.appointment.findFirst = original;
  }
});
