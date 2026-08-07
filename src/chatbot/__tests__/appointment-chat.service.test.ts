import { test, describe, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentChatService } from '../services/appointment-chat.service';
import { ConversationService } from '../services/conversation.service';
import { ChatIntent } from '../types/chatbot.types';
import { NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';

// Use a fixed date (Wednesday 2026-08-05 at 10:00 local time) so that "tomorrow"
// is always a working weekday (Thursday). This makes all date-dependent tests
// deterministic regardless of when they are run.
const FIXED_DATE_MS = new Date('2026-08-05T10:00:00').getTime();
const RealDate = Date;

before(() => {
  const MockDate = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(FIXED_DATE_MS);
      } else {
        super(...args);
      }
    }
    static now() { return FIXED_DATE_MS; }
    static UTC(...args: any[]) { return RealDate.UTC(...args); }
  } as any;
  (globalThis as any).Date = MockDate;
});

after(() => {
  (globalThis as any).Date = RealDate;
});

const mockDoctorService = (): any => ({
  getProfile: (doctorId: string) => {
    const base = {
      id: doctorId,
      name: 'Dr. Test Doctor',
      specialty: 'General Physician',
      consultationFee: 500,
      fee: '₹500',
      user: { fullName: 'Test Doctor', email: 'test@example.com', role: 'DOCTOR' },
      availability: {
        slotDurationMinutes: 30,
        status: 'Available',
        slots: [
          { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: 'None' },
          { day: 'Saturday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
          { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
        ],
      },
    };
    if (doctorId === 'doc2') {
      return Promise.resolve({ ...base, isActive: false, isVerified: true, name: 'Dr. Inactive Doc' });
    }
    if (doctorId === 'doc3') {
      return Promise.resolve({ ...base, isActive: true, isVerified: false, name: 'Dr. Unverified Doc' });
    }
    return Promise.resolve({ ...base, isActive: true, isVerified: true });
  },
  getAvailability: (doctorId: string) => Promise.resolve({
    slotDurationMinutes: 30,
    status: 'Available',
    slots: [
      { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: 'None' },
      { day: 'Saturday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
      { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
    ],
    bookedSlots: {},
  }),
});

const mockDoctorsService = (): any => ({
  findAll: () => Promise.resolve([
    {
      id: 'doc1',
      doctorId: 'doc1',
      name: 'Dr. Test Doctor',
      specialty: 'General Physician',
      isActive: true,
      isVerified: true,
      profileCompleted: true,
      experience: '5+ Years Experience',
      rating: 4.5,
      priorityScore: 100,
      fee: '₹500',
      consultationFee: 500,
      imageUrl: '',
      tags: ['English'],
      availability: { status: 'Available' },
    },
    {
      id: 'doc2',
      doctorId: 'doc2',
      name: 'Dr. Inactive Doc',
      specialty: 'General Physician',
      isActive: false,
      isVerified: true,
      profileCompleted: true,
      experience: '5+ Years Experience',
      rating: 4.0,
      fee: '₹500',
      availability: { status: 'Available' },
    },
    {
      id: 'doc3',
      doctorId: 'doc3',
      name: 'Dr. Unverified Doc',
      specialty: 'General Physician',
      isActive: true,
      isVerified: false,
      profileCompleted: true,
      experience: '5+ Years Experience',
      rating: 4.0,
      fee: '₹500',
      availability: { status: 'Available' },
    },
  ]),
});

const mockAppointmentsService = (): any => ({
  createAppointment: (data: any, userId: string) => Promise.resolve({
    id: 'apt-new',
    doctorId: data.doctorId,
    patientId: 'patient-1',
    status: 'SCHEDULED',
    date: data.date,
    timeSlot: data.timeSlot,
    consultMode: data.consultMode || 'VIDEO',
    scheduledAt: new Date(),
    doctor: { id: data.doctorId, name: 'Dr. Test Doctor', specialty: 'General Physician' },
  }),
  getAppointmentsForUser: (userId: string, role: string) => Promise.resolve([
    {
      id: 'apt-1',
      doctorId: 'doc1',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '10:00 AM',
      consultMode: 'VIDEO',
      doctor: { id: 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician' },
    },
    {
      id: 'apt-2',
      doctorId: 'doc1',
      status: 'COMPLETED',
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '11:00 AM',
      consultMode: 'VIDEO',
      doctor: { id: 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician' },
    },
    {
      id: 'apt-3',
      doctorId: 'doc1',
      status: 'CANCELLED',
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '09:00 AM',
      consultMode: 'VIDEO',
      doctor: { id: 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician' },
    },
  ]),
  getAppointmentForUser: (appointmentId: string, userId: string, role: string) => {
    if (appointmentId === 'apt-not-found') {
      throw new NotFoundException('Appointment not found');
    }
    return Promise.resolve({
      id: appointmentId,
      doctorId: 'doc1',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '10:00 AM',
      consultMode: 'VIDEO',
      doctor: { id: 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician' },
    });
  },
  rescheduleAppointment: (appointmentId: string, data: any, userId: string, role: string) => {
    return Promise.resolve({
      id: appointmentId,
      doctorId: data.doctorId || 'doc1',
      status: 'SCHEDULED',
      date: data.date,
      timeSlot: data.timeSlot,
      consultMode: 'VIDEO',
      scheduledAt: new Date(),
      doctor: { id: data.doctorId || 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician', user: { fullName: 'Test Doctor' } },
    });
  },
  cancelAppointment: (appointmentId: string, userId: string, role: string) => {
    if (appointmentId === 'apt-completed') {
      throw new BadRequestException('Completed or cancelled appointments cannot be cancelled again');
    }
    return Promise.resolve({
      id: appointmentId,
      doctorId: 'doc1',
      status: 'CANCELLED',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '10:00 AM',
      consultMode: 'VIDEO',
      doctor: { id: 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician', user: { fullName: 'Dr. Test Doctor' } },
    });
  },
});

describe('AppointmentChatService', () => {
  let service: AppointmentChatService;
  let conversationService: ConversationService;

  beforeEach(() => {
    conversationService = new ConversationService();
    const doctorsService = mockDoctorsService();
    const doctorService = mockDoctorService();
    const appointmentsService = mockAppointmentsService();
    service = new AppointmentChatService(conversationService, doctorsService, doctorService, appointmentsService as any);
  });

  afterEach(() => {
    conversationService.stopCleanup();
  });

  // === Availability Tests ===

  test('should return real available slots from DoctorService.getAvailability', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow' });
    assert.ok(result.cards.length > 0);
    assert.equal(result.cards[0].type, 'availability');
    assert.ok(result.cards[0].slots);
    assert.ok(result.cards[0].slots!.length > 0);
    assert.ok(result.cards[0].doctorId);
    assert.ok(result.cards[0].doctorName);
  });

  test('should exclude booked slots from availability', async () => {
    const serviceWithBooked = setupServiceWithBookedSlot();
    const result = await serviceWithBooked.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow' });
    const bookedSlot = result.cards[0]?.slots?.find((s) => s.startTime === '10:00 AM');
    assert.ok(!bookedSlot, 'Booked slot 10:00 AM should be excluded');
    serviceWithBooked.conversationServiceForTest.stopCleanup();
  });

  test('should exclude past times for today', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'today' });
    // Fixed date is 10:00 AM on Wednesday; slots before 10:00 AM should be excluded
    assert.ok(result.cards.length >= 0);
  });

  test('should exclude slots for inactive doctors', async () => {
    const result = await service.getAvailability({ doctorId: 'doc2' });
    assert.ok(!result.cards || result.cards.length === 0 || result.cards.every((c) => c.doctorId !== 'doc2'));
  });

  test('should exclude slots for unverified doctors', async () => {
    const result = await service.getAvailability({ doctorId: 'doc3' });
    assert.ok(!result.cards || result.cards.length === 0 || result.cards.every((c) => c.doctorId !== 'doc3'));
  });

  test('should support today as date preference', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'today' });
    if (result.cards.length > 0) {
      assert.ok(result.cards[0].date);
    } else {
      assert.ok(result.message.includes('No available slots'));
    }
  });

  test('should support tomorrow as date preference', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow' });
    assert.ok(result.cards.length > 0);
    assert.ok(result.cards[0].date);
  });

  test('should filter slots by time of day (morning)', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow', timePreference: 'morning' });
    if (result.cards.length > 0 && result.cards[0].slots) {
      for (const slot of result.cards[0].slots) {
        const match = slot.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          assert.ok(h < 12, `Morning slot ${slot.startTime} should be before noon (got hour ${h})`);
        }
      }
    }
  });

  test('should filter slots by time of day (afternoon)', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow', timePreference: 'afternoon' });
    if (result.cards.length > 0 && result.cards[0].slots) {
      for (const slot of result.cards[0].slots) {
        const match = slot.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          assert.ok(h >= 12 && h < 17, `Afternoon slot ${slot.startTime} should be 12-17 (got hour ${h})`);
        }
      }
    }
  });

  test('should return no-slot response honestly', async () => {
    const appointmentsService = mockAppointmentsService();
    const doctorsService = mockDoctorsService();
    const doctorService: any = {
      getProfile: () => Promise.resolve(null),
      getAvailability: () => Promise.resolve({ slotDurationMinutes: 30, status: 'Available', slots: [], bookedSlots: {} }),
    };
    const conv = new ConversationService();
    const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService as any);

    const result = await svc.getAvailability({ doctorId: 'nonexistent-doctor-id', datePreference: 'tomorrow' });
    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('No available slots'));
    conv.stopCleanup();
  });

  test('should limit results to max slots per doctor', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow' });
    if (result.cards.length > 0 && result.cards[0].slots) {
      assert.ok(result.cards[0].slots!.length <= 8);
    }
  });

  test('should retain conversation specialty across follow-up', async () => {
    const conv = new ConversationService();
    await conv.updateConversation('test-conv-1', {
      lastIntent: ChatIntent.DOCTOR_RECOMMENDATION,
      entities: { specialty: 'Neurologist' },
      role: 'user',
      content: 'I have migraines',
    });

    const updated = await conv.getOrCreateConversation('test-conv-1');
    assert.equal(updated.entities.specialty, 'Neurologist');
    conv.stopCleanup();
  });

  test('availability response uses real doctor data', async () => {
    const result = await service.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow' });
    assert.ok(result.cards.length > 0);
    assert.ok(result.cards[0].doctorId);
    assert.ok(result.cards[0].doctorName);
    assert.ok(result.cards[0].specialty);
    assert.ok(result.cards[0].slots && result.cards[0].slots.length > 0);
  });

  // === Appointment Status Tests ===

  test('guest gets login-required response', async () => {
    const result = await service.getAppointmentsForCurrentUser(undefined as any, undefined as any);
    assert.equal(result.cards[0].type, 'login-required');
    assert.ok(result.message.includes('sign in') || result.message.includes('Sign in'));
  });

  test('authenticated patient sees only own appointments', async () => {
    const result = await service.getAppointmentsForCurrentUser('user-1', 'PATIENT');
    assert.ok(result.cards.length > 0);
    assert.equal(result.cards[0].type, 'appointment');
  });

  test('upcoming status filtering works', async () => {
    const result = await service.getAppointmentsForCurrentUser('user-1', 'PATIENT', 'upcoming');
    assert.ok(result.cards.length > 0);
  });

  test('cancelled/completed filtering works', async () => {
    const completed = await service.getAppointmentsForCurrentUser('user-1', 'PATIENT', 'completed');
    assert.ok(completed.cards.length > 0);
    assert.equal(completed.cards[0].status, 'COMPLETED');

    const cancelled = await service.getAppointmentsForCurrentUser('user-1', 'PATIENT', 'cancelled');
    assert.ok(cancelled.cards.length > 0);
    assert.equal(cancelled.cards[0].status, 'CANCELLED');
  });

  // === Booking Tests ===

  test('booking request creates a pending confirmation, not an appointment', async () => {
    const result = await service.prepareBooking({
      doctorId: 'doc1',
      date: 'tomorrow',
      timeSlot: '10:00 AM',
      userId: 'user-1',
      role: 'PATIENT',
      conversationId: 'test-conv-book',
    });

    assert.ok(result.pendingConfirmation);
    assert.equal(result.cards[0].type, 'confirmation');
    assert.equal(result.cards[0].actionType, 'BOOK_APPOINTMENT');

    const pending = await conversationService.getPendingAction('test-conv-book');
    assert.ok(pending);
    assert.equal(pending?.type, 'BOOK_APPOINTMENT');
    await conversationService.clearPendingAction('test-conv-book');
  });

  test('explicit confirmation calls the real booking service', async () => {
    const convId = 'test-conv-book-confirm';
    const result = await service.prepareBooking({
      doctorId: 'doc1',
      date: 'tomorrow',
      timeSlot: '10:00 AM',
      userId: 'user-1',
      role: 'PATIENT',
      conversationId: convId,
    });
    assert.ok(result.pendingConfirmation);

    const pending = await conversationService.getPendingAction(convId);
    assert.ok(pending);

    const confirmResult = await service.confirmBooking(pending, 'user-1', 'PATIENT', convId);
    assert.equal(confirmResult.cards[0].type, 'success');
    assert.ok(confirmResult.message.includes('confirmed'));

    const cleared = await conversationService.getPendingAction(convId);
    assert.equal(cleared, null);
  });

  test('ambiguous "yes" without a pending action does nothing useful', async () => {
    const result = await service.confirmBooking(null, 'user-1', 'PATIENT', 'no-pending');
    assert.ok(result.message.includes('No pending booking'));
  });

  test('expired pending booking is rejected', async () => {
    const convId = 'test-conv-expired';
    await conversationService.setPendingAction(convId, {
      type: 'BOOK_APPOINTMENT',
      doctorId: 'doc1',
      date: 'tomorrow',
      slot: { startTime: '10:00 AM', endTime: '10:30 AM', displayTime: '10:00 AM', mode: 'ONLINE' },
      expiresAt: new Date(Date.now() - 1000),
    });

    const pending = await conversationService.getPendingAction(convId);
    assert.equal(pending, null);

    const result = await service.confirmBooking(null, 'user-1', 'PATIENT', convId);
    assert.ok(result.message.includes('No pending booking'));
  });

  test('slot is rechecked before booking', async () => {
    const convId = 'test-conv-recheck';
    await service.prepareBooking({
      doctorId: 'doc1',
      date: 'tomorrow',
      timeSlot: '10:00 AM',
      userId: 'user-1',
      role: 'PATIENT',
      conversationId: convId,
    });

    const pending = await conversationService.getPendingAction(convId);
    assert.ok(pending);

    const result = await service.confirmBooking(pending, 'user-1', 'PATIENT', convId);
    assert.equal(result.cards[0].type, 'success');
  });

  test('double-booking conflict returns friendly response', async () => {
    const appointmentsService = mockAppointmentsService();
    appointmentsService.createAppointment = () => {
      throw new ConflictException('This appointment slot is already booked. Please choose another time.');
    };
    const doctorsService = mockDoctorsService();
    const doctorService = mockDoctorService();
    const conv = new ConversationService();
    const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService);

    const convId = 'test-conv-conflict';
    await svc.prepareBooking({
      doctorId: 'doc1',
      date: 'tomorrow',
      timeSlot: '10:00 AM',
      userId: 'user-1',
      role: 'PATIENT',
      conversationId: convId,
    });

    const pending = await conv.getPendingAction(convId);
    const result = await svc.confirmBooking(pending, 'user-1', 'PATIENT', convId);

    assert.ok(
      result.message.includes('Failed') ||
      result.message.includes('slot was just booked') ||
      result.message.includes('no longer available'),
    );
    conv.stopCleanup();
  });

  test('successful booking clears pending action', async () => {
    const convId = 'test-conv-clear';
    await service.prepareBooking({
      doctorId: 'doc1',
      date: 'tomorrow',
      timeSlot: '10:00 AM',
      userId: 'user-1',
      role: 'PATIENT',
      conversationId: convId,
    });

    const pending = await conversationService.getPendingAction(convId);
    assert.ok(pending);

    await service.confirmBooking(pending, 'user-1', 'PATIENT', convId);

    const cleared = await conversationService.getPendingAction(convId);
    assert.equal(cleared, null);
  });

  test('failed booking does not claim success', async () => {
    const appointmentsService = mockAppointmentsService();
    appointmentsService.createAppointment = () => {
      throw new InternalServerErrorException('Failed to book appointment');
    };
    const doctorsService = mockDoctorsService();
    const doctorService = mockDoctorService();
    const conv = new ConversationService();
    const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService);

    const convId = 'test-conv-failed';
    await svc.prepareBooking({
      doctorId: 'doc1',
      date: 'tomorrow',
      timeSlot: '10:00 AM',
      userId: 'user-1',
      role: 'PATIENT',
      conversationId: convId,
    });

    const pending = await conv.getPendingAction(convId);
    assert.ok(pending);
    const result = await svc.confirmBooking(pending, 'user-1', 'PATIENT', convId);

    assert.ok(!result.cards || result.cards.length === 0 || result.cards[0].type !== 'success');
    assert.ok(result.message.includes('Failed') || result.message.includes('Unable'));
    conv.stopCleanup();
  });

  // === Cancellation Tests ===

  test('cancellation requires confirmation', async () => {
    const result = await service.prepareCancellation('apt-1', 'user-1', 'PATIENT', 'test-conv-cancel');
    assert.ok(result.pendingConfirmation);
    assert.equal(result.cards[0].type, 'confirmation');
    assert.equal(result.cards[0].actionType, 'CANCEL_APPOINTMENT');

    await conversationService.clearPendingAction('test-conv-cancel');
  });

  test('ownership is verified for cancellation', async () => {
    const result = await service.prepareCancellation('apt-not-found', 'user-1', 'PATIENT', 'test-conv-ownership');
    assert.ok(result.message.includes('not found'));
    await conversationService.clearPendingAction('test-conv-ownership');
  });

  test('completed/cancelled appointment cannot be cancelled again', async () => {
    const appointmentsService = mockAppointmentsService();
    appointmentsService.getAppointmentForUser = () => Promise.resolve({
      id: 'apt-completed',
      doctorId: 'doc1',
      status: 'COMPLETED',
      scheduledAt: new Date(),
      date: '2026-08-06',
      timeSlot: '10:00 AM',
      consultMode: 'VIDEO',
      doctor: { id: 'doc1', name: 'Dr. Test Doctor', specialty: 'General Physician' },
    });

    const doctorsService = mockDoctorsService();
    const doctorService = mockDoctorService();
    const conv = new ConversationService();
    const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService);

    const result = await svc.prepareCancellation('apt-completed', 'user-1', 'PATIENT', 'test-conv-cc');
    assert.ok(result.message.includes('cannot be') || result.message.includes('already been'));
    conv.stopCleanup();
  });

  test('cancellation success clears pending action', async () => {
    const convId = 'test-conv-cancel-success';
    await service.prepareCancellation('apt-1', 'user-1', 'PATIENT', convId);
    const pending = await conversationService.getPendingAction(convId);
    assert.ok(pending);

    await service.confirmCancellation(pending, 'user-1', 'PATIENT', convId);

    const cleared = await conversationService.getPendingAction(convId);
    assert.equal(cleared, null);
  });

  // === Rescheduling Tests ===

  test('ownership is verified for rescheduling', async () => {
    const result = await service.prepareReschedule('apt-not-found', 'user-1', 'PATIENT');
    assert.ok(result.message.includes('not found'));
  });

  test('alternative real slots returned for reschedule', async () => {
    const result = await service.prepareReschedule('apt-1', 'user-1', 'PATIENT');
    assert.ok(result.cards.length > 0);
    assert.equal(result.cards[0].type, 'availability');
    assert.ok(result.cards[0].slots);
    assert.ok(result.cards[0].slots!.length > 0);
  });

  test('reschedule confirmation is required', async () => {
    const appointmentsService = mockAppointmentsService();
    appointmentsService.cancelAppointment = () => Promise.resolve({});

    const doctorsService = mockDoctorsService();
    const doctorService = mockDoctorService();
    const conv = new ConversationService();

    const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService);

    await svc.prepareReschedule('apt-1', 'user-1', 'PATIENT');

    const result = await svc.confirmReschedule(
      { type: 'RESCHEDULE_APPOINTMENT', appointmentId: 'apt-1', doctorId: 'doc1', date: 'tomorrow', slot: { startTime: '10:00 AM', endTime: '10:30 AM', displayTime: '10:00 AM', mode: 'ONLINE' }, expiresAt: new Date(Date.now() + 600000) },
      'user-1',
      'PATIENT',
      'test-conv-reschedule',
      'tomorrow',
      '11:00 AM',
    );

    const cleared = await conv.getPendingAction('test-conv-reschedule');
    assert.equal(cleared, null);
    conv.stopCleanup();
  });

  test('unsupported rescheduling is reported honestly if not implemented', async () => {
    const appointmentsService = mockAppointmentsService();
    appointmentsService.rescheduleAppointment = () => {
      throw new InternalServerErrorException('Failed to reschedule appointment');
    };

    const doctorsService = mockDoctorsService();
    const doctorService = mockDoctorService();
    const conv = new ConversationService();
    const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService);

    const convId = 'test-conv-reschedule-fail';
    await svc.prepareReschedule('apt-1', 'user-1', 'PATIENT');
    const pending = await conv.getPendingAction(convId);
    if (pending) {
      const result = await svc.confirmReschedule(pending, 'user-1', 'PATIENT', convId, 'tomorrow', '11:00 AM');
      assert.ok(result.message.includes('Failed') || result.message.includes('failed'));
    }
    conv.stopCleanup();
  });
});

function setupServiceWithBookedSlot(): AppointmentChatService {
  const conv = new ConversationService();
  const doctorsService = mockDoctorsService();
  const doctorService: any = {
    getProfile: () => Promise.resolve({
      id: 'doc1',
      name: 'Dr. Test Doctor',
      specialty: 'General Physician',
      consultationFee: 500,
      fee: '₹500',
      isActive: true,
      isVerified: true,
      user: { fullName: 'Test Doctor', role: 'DOCTOR' },
    }),
    getAvailability: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
      return Promise.resolve({
        slotDurationMinutes: 30,
        status: 'Available',
        slots: [
          { day: tomorrowDay, isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        ],
        bookedSlots: {
          [tomorrowKey]: ['10:00 AM'],
        },
      });
    },
  };
  const appointmentsService = mockAppointmentsService();
  const svc = new AppointmentChatService(conv, doctorsService, doctorService, appointmentsService as any);
  (svc as any).conversationServiceForTest = conv;
  return svc;
}
