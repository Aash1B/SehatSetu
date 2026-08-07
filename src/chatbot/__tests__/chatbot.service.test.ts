import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChatbotService } from '../chatbot.service';
import { IntentRouterService } from '../services/intent-router.service';
import { ConversationService } from '../services/conversation.service';
import { DoctorChatService } from '../services/doctor-chat.service';
import { AppointmentChatService } from '../services/appointment-chat.service';
import { HospitalChatService } from '../services/hospital-chat.service';
import { LabChatService } from '../services/lab-chat.service';
import { EmergencyHandlingService } from '../services/emergency-handling.service';
import { LabTestGuidanceService } from '../services/lab-test-guidance.service';
import { AiChatService } from '../services/ai-chat.service';
import { ChatIntent } from '../types/chatbot.types';

describe('ChatbotService', () => {
  let chatbotService: ChatbotService;
  let conversationService: ConversationService;

  beforeEach(() => {
    conversationService = new ConversationService();
    const intentRouter = new IntentRouterService();
    const doctorChatService = new DoctorChatService({ findAll: () => Promise.resolve([]) } as any);
    const appointmentChatService = {
      getAvailability: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'No availability.' }),
      getAppointmentsForCurrentUser: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'No appointments.' }),
      prepareBooking: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: 'Booking prepared.' }),
      confirmBooking: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: 'Booking confirmed.' }),
      prepareCancellation: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: 'Cancellation prepared.' }),
      confirmCancellation: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: 'Cancellation confirmed.' }),
      prepareReschedule: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: 'Reschedule prepared.' }),
      confirmReschedule: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: 'Reschedule confirmed.' }),
    } as unknown as AppointmentChatService;
    const hospitalChatService = {
      searchNearbyHospitals: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'No hospitals.' }),
    } as unknown as HospitalChatService;
    const labChatService = {
      searchNearbyLabs: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'No labs.' }),
    } as unknown as LabChatService;
    const emergencyHandlingService = new EmergencyHandlingService();
    const labTestGuidanceService = new LabTestGuidanceService();
    const aiChatService = {
      isEligibleForAI: () => false,
      processChat: () => Promise.resolve({
        message: 'Hello! How can I help you today?',
        suggestedReplies: ['Find a doctor', 'Book an appointment'],
        confidence: 0.8,
        provider: 'fastapi-generate-summary',
      }),
    } as unknown as AiChatService;
    chatbotService = new ChatbotService(intentRouter, conversationService, doctorChatService, appointmentChatService, hospitalChatService, labChatService, emergencyHandlingService, labTestGuidanceService, aiChatService);
  });

  afterEach(() => {
    conversationService.stopCleanup();
  });

  test('should return a conversationId in every response', async () => {
    const res = await chatbotService.processMessage({ message: 'hello' });
    assert.ok(res.conversationId);
  });

  test('should return cards as undefined when no doctor matches', async () => {
    const res = await chatbotService.processMessage({ message: 'hello' });
    assert.ok(!res.cards || res.cards.length === 0);
  });

  test('should return suggested replies', async () => {
    const res = await chatbotService.processMessage({ message: 'hello' });
    assert.ok(Array.isArray(res.suggestedReplies));
    assert.ok(res.suggestedReplies.length > 0);
  });

  test('should reuse the same conversation across turns', async () => {
    const first = await chatbotService.processMessage({ message: 'hello' });
    const second = await chatbotService.processMessage({
      message: 'Find a doctor',
      conversationId: first.conversationId,
    });
    assert.equal(second.conversationId, first.conversationId);
  });

  test('multi-turn context example: symptoms retained + timePreference + intent', async () => {
    const first = await chatbotService.processMessage({ message: 'I have headaches' });
    const second = await chatbotService.processMessage({
      message: 'Show available doctors tomorrow',
      conversationId: first.conversationId,
    });

    assert.equal(second.conversationId, first.conversationId);
    assert.equal(second.intent, ChatIntent.DOCTOR_AVAILABILITY);

    const conversation = await conversationService.getOrCreateConversation(
      first.conversationId,
    );
    assert.deepEqual(conversation.entities.symptoms, ['headache']);
    assert.equal(conversation.entities.timePreference, 'tomorrow');
    assert.equal(conversation.lastIntent, ChatIntent.DOCTOR_AVAILABILITY);
  });

  test('should keep recent messages to a maximum of 10', async () => {
    let conversationId: string | undefined;
    for (let i = 0; i < 12; i++) {
      const res = await chatbotService.processMessage({
        message: `message-${i}`,
        conversationId,
      });
      conversationId = res.conversationId;
    }
    const conversation = await conversationService.getOrCreateConversation(conversationId);
    assert.equal(conversation.recentMessages.length, 10);
  });

  test('should handle appointment status intent for authenticated user', async () => {
    const mockAppointmentChatService = {
      getAvailability: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'Check availability.' }),
      getAppointmentsForCurrentUser: () =>
        Promise.resolve({
          cards: [
            {
              type: 'appointment',
              title: 'Dr. Smith • Cardiology',
              appointmentId: 'apt-1',
              doctorId: 'doc-1',
              date: '2026-08-07',
              time: '10:00 AM',
              status: 'SCHEDULED',
              actions: [],
            },
          ],
          suggestedReplies: ['Upcoming appointments'],
          message: 'You have 1 appointment.',
        }),
      prepareBooking: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: '' }),
      confirmBooking: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: '' }),
      prepareCancellation: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: '' }),
      confirmCancellation: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: '' }),
      prepareReschedule: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: '' }),
      confirmReschedule: () => Promise.resolve({ pendingConfirmation: false, cards: [], suggestedReplies: [], message: '' }),
    } as unknown as AppointmentChatService;

    const mockIntentRouter = new IntentRouterService();
    const mockConversation = new ConversationService();
    const mockDoctorChat = new DoctorChatService({ findAll: () => Promise.resolve([]) } as any);
    const mockHospitalChatService = {
      searchNearbyHospitals: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'No hospitals.' }),
    } as unknown as HospitalChatService;
    const mockLabChatService = {
      searchNearbyLabs: () => Promise.resolve({ cards: [], suggestedReplies: [], message: 'No labs.' }),
    } as unknown as LabChatService;
    const mockEmergency = new EmergencyHandlingService();
    const mockLabGuidance = new LabTestGuidanceService();
    const mockAiChatService = {
      isEligibleForAI: () => false,
      processChat: () => Promise.resolve({
        message: 'AI response',
        suggestedReplies: [],
        confidence: 0.8,
        provider: 'fastapi-generate-summary',
      }),
    } as unknown as AiChatService;
    const service = new ChatbotService(mockIntentRouter, mockConversation, mockDoctorChat, mockAppointmentChatService, mockHospitalChatService, mockLabChatService, mockEmergency, mockLabGuidance, mockAiChatService);

    try {
      const res = await service.processMessage(
        { message: 'my appointment' },
        { userId: 'user-1', role: 'PATIENT' },
      );

      assert.equal(res.intent, ChatIntent.APPOINTMENT_STATUS);
      assert.ok(res.cards);
      assert.equal(res.cards.length, 1);
      assert.equal(res.cards[0].type, 'appointment');
      assert.equal(res.cards[0].appointmentId, 'apt-1');
    } finally {
      mockConversation.stopCleanup();
    }
  });

  test('should return login-required card for appointment status without auth', async () => {
    const res = await chatbotService.processMessage({ message: 'my appointment' });
    assert.equal(res.intent, ChatIntent.APPOINTMENT_STATUS);
    assert.ok(res.cards);
    assert.equal(res.cards[0].type, 'login-required');
  });

  test('should handle structured action for doctor selection', async () => {
    const res = await chatbotService.processMessage({
      message: 'Confirm booking',
      action: { type: 'CONFIRM_BOOKING', doctorId: 'doc-1' },
    });
    assert.ok(res.conversationId);
  });
});
