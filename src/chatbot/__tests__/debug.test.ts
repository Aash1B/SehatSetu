import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentChatService } from '../services/appointment-chat.service';
import { ConversationService } from '../services/conversation.service';

const mockDoctorService: any = {
  getProfile: (doctorId: string) => Promise.resolve({
    id: doctorId,
    name: 'Dr. Test Doctor',
    specialty: 'General Physician',
    consultationFee: 500,
    fee: '₹500',
    isActive: true,
    isVerified: true,
    user: { fullName: 'Test Doctor', email: 'test@example.com', role: 'DOCTOR' },
  }),
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
};

const mockDoctorsService: any = {
  findAll: () => Promise.resolve([]),
};

const mockAppointmentsService: any = {
  createAppointment: () => Promise.resolve({}),
  getAppointmentsForCurrentUser: () => Promise.resolve({}),
  getAppointmentsForUser: () => Promise.resolve([]),
  getAppointmentForUser: () => Promise.resolve({}),
  rescheduleAppointment: () => Promise.resolve({}),
  cancelAppointment: () => Promise.resolve({}),
};

describe('Debug', () => {
  let conv: ConversationService;

  afterEach(() => {
    conv && conv.stopCleanup();
  });

  test('debug slot generation', async () => {
    conv = new ConversationService();
    const svc = new AppointmentChatService(conv, mockDoctorsService, mockDoctorService, mockAppointmentsService);

    // Test parseTimeStr
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date();
    end.setHours(17, 0, 0, 0);
    console.log('Work start:', start.toISOString(), 'hours:', start.getHours());
    console.log('Work end:', end.toISOString(), 'hours:', end.getHours());

    // Test formatDateKey
    const targetDate = new Date();
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    console.log('Today:', dayName);
    console.log('Date key:', `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`);

    // Test the internal generateSlotsForDate by calling getAvailability with explicit tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    console.log('Tomorrow:', tomorrowDay);

    const result = await svc.getAvailability({ doctorId: 'doc1', datePreference: 'tomorrow' });
    console.log('Tomorrow result cards:', result.cards.length);
    console.log('Tomorrow result:', JSON.stringify(result, null, 2));
  });
});
