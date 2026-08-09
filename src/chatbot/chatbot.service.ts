import { Injectable, Logger } from '@nestjs/common';
import { ChatbotMessageDto, StructuredAction } from './dto/chatbot-message.dto';
import { ChatbotResponse, ChatIntent, ChatCard, PendingAction } from './types/chatbot.types';
import {
  IntentRouterService,
  IntentResponse,
  EntityExtraction as RouterEntityExtraction,
} from './services/intent-router.service';
import { ConversationService } from './services/conversation.service';
import { DoctorChatService, DoctorChatCard, DoctorSearchResult } from './services/doctor-chat.service';
import { AppointmentChatService } from './services/appointment-chat.service';
import { HospitalChatService, HospitalSearchResult } from './services/hospital-chat.service';
import { LabChatService } from './services/lab-chat.service';
import { EmergencyHandlingService } from './services/emergency-handling.service';
import { LabTestGuidanceService } from './services/lab-test-guidance.service';
import { AiChatService, AiChatContext } from './services/ai-chat.service';
import { MedicalConditionService, MedicalConditionResult } from './services/medical-condition.service';

interface AuthenticatedUser {
  userId: string;
  role: string;
}

type ChatbotEntityExtraction = RouterEntityExtraction;

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly intentRouterService: IntentRouterService,
    private readonly conversationService: ConversationService,
    private readonly doctorChatService: DoctorChatService,
    private readonly appointmentChatService: AppointmentChatService,
    private readonly hospitalChatService: HospitalChatService,
    private readonly labChatService: LabChatService,
    private readonly emergencyHandlingService: EmergencyHandlingService,
    private readonly labTestGuidanceService: LabTestGuidanceService,
    private readonly aiChatService: AiChatService,
    private readonly medicalConditionService: MedicalConditionService,
  ) {
    this.conversationService.startCleanup();
  }

  async processMessage(
    dto: ChatbotMessageDto,
    user?: AuthenticatedUser | null,
  ): Promise<ChatbotResponse> {
    const conversation = await this.conversationService.getOrCreateConversation(
      dto.conversationId,
    );

    this.logger.log(
      `Processing message for conversation ${conversation.conversationId} at ${new Date().toISOString()}`,
    );

    const intentResponse: IntentResponse = this.intentRouterService.route(dto.message);
    const textEntities: RouterEntityExtraction =
      this.intentRouterService.extractEntities(dto.message);

    const actionEntities = this.extractActionEntities(dto.action);
    const entities: ChatbotEntityExtraction = { ...textEntities, ...actionEntities };

    await this.conversationService.updateConversation(conversation.conversationId, {
      lastIntent: intentResponse.intent,
      entities,
      role: 'user',
      content: dto.message,
    });

    this.logger.log(
      `Detected intent ${intentResponse.intent} for conversation ${conversation.conversationId}`,
    );

    const latitude = dto.location?.latitude ?? conversation.entities.latitude;
    const longitude = dto.location?.longitude ?? conversation.entities.longitude;

    const suggestedReplies: string[] = [...(intentResponse.suggestedReplies ?? [])];
    const cards: ChatCard[] = [];

    // EMERGENCY handling — always runs first, overrides all other intents
    if (
      intentResponse.intent === ChatIntent.EMERGENCY ||
      this.emergencyHandlingService.detectEmergency(dto.message)
    ) {
      const emergencyResult = this.emergencyHandlingService.buildEmergencyResponse({
        latitude,
        longitude,
      });

      if (latitude !== undefined && longitude !== undefined) {
        const hospitalResult: HospitalSearchResult =
          await this.hospitalChatService.searchNearbyHospitals({
            latitude,
            longitude,
          });
        cards.push(...hospitalResult.cards);
        suggestedReplies.push(...hospitalResult.suggestedReplies);
      }

      cards.push(...emergencyResult.cards);
      suggestedReplies.push(...emergencyResult.suggestedReplies);
      suggestedReplies.push('Call 108');

      const uniqueReplies = [...new Set(suggestedReplies)];
      return await this.buildResponse(
        conversation,
        intentResponse,
        cards,
        uniqueReplies,
        emergencyResult.message,
      );
    }

    // MEDICAL CONDITION handling — runs after emergency, before AI fallback
    const medicalCondition = this.medicalConditionService.detectMedicalCondition(dto.message);
    if (medicalCondition.detected && medicalCondition.specialty) {
      // Update conversation with disease entity
      await this.conversationService.updateConversation(conversation.conversationId, {
        lastIntent: intentResponse.intent,
        entities: { ...entities, disease: medicalCondition.condition ?? undefined, specialty: medicalCondition.specialty },
        role: 'user',
        content: dto.message,
      });

      // Build response that guides user to appropriate care
      const conditionResponse = this.medicalConditionService.buildConditionResponse(
        medicalCondition.condition || '',
        medicalCondition.specialty,
      );

      // Check if user also has emergency symptoms
      const hasEmergency = this.emergencyHandlingService.detectEmergency(dto.message);
      // Note: intentResponse.intent will not be EMERGENCY here since emergency handling
      // runs first. The comparison is type-safe but will always be false for medical condition messages.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      const hasEmergencyIntent = false;

      if (hasEmergency || hasEmergencyIntent) {
        // If both condition AND emergency, prioritize emergency
        const emergencyResult = this.emergencyHandlingService.buildEmergencyResponse({
          latitude,
          longitude,
        });
        if (latitude !== undefined && longitude !== undefined) {
          const hospitalResult: HospitalSearchResult =
            await this.hospitalChatService.searchNearbyHospitals({
              latitude,
              longitude,
            });
          cards.push(...hospitalResult.cards);
          suggestedReplies.push(...hospitalResult.suggestedReplies);
        }
        cards.push(...emergencyResult.cards);
        suggestedReplies.push(...emergencyResult.suggestedReplies);
        suggestedReplies.push('Call 108');
        return await this.buildResponse(
          conversation,
          intentResponse,
          cards,
          [...new Set(suggestedReplies)],
          emergencyResult.message,
        );
      }

      // Add doctor search suggestion for the specialty
      suggestedReplies.push(...medicalCondition.suggestedReplies);
      suggestedReplies.push(`Find a ${medicalCondition.specialty}`, 'Book appointment');

      return await this.buildResponse(
        conversation,
        intentResponse,
        cards,
        [...new Set(suggestedReplies)],
        `${conditionResponse} You can find ${medicalCondition.specialty} doctors in our directory, book appointments, or search for specialists.`,
      );
    }

    // Check for pending action confirmation first
    const pendingAction = await this.conversationService.getPendingAction(conversation.conversationId);
    if (pendingAction) {
      const isConfirm = this.isConfirmation(dto.message);
      if (isConfirm) {
        const result = await this.handlePendingConfirmation(pendingAction, conversation.conversationId, user);
        await this.conversationService.updateConversation(conversation.conversationId, {
          lastIntent: intentResponse.intent,
          entities: {},
          role: 'assistant',
          content: result.message,
        });
        return {
          conversationId: conversation.conversationId,
          intent: intentResponse.intent,
          message: result.message,
          cards: result.cards.length > 0 ? result.cards : undefined,
          suggestedReplies: result.suggestedReplies.length > 0 ? result.suggestedReplies : undefined,
        };
      }
    }

    if (
      intentResponse.intent === ChatIntent.DOCTOR_SEARCH ||
      intentResponse.intent === ChatIntent.DOCTOR_RECOMMENDATION
    ) {
      const fallbackSpecialty = entities.specialty || conversation.entities.specialty || undefined;
      const doctorResult: DoctorSearchResult =
        await this.doctorChatService.searchDoctors(dto.message, intentResponse.intent, fallbackSpecialty);
      suggestedReplies.push(...doctorResult.suggestedReplies);
      cards.push(...doctorResult.cards.map((card: DoctorChatCard) => ({
        type: 'doctor',
        title: card.name,
        subtitle: [card.specialty, card.experience, card.consultationFee]
          .filter(Boolean)
          .join(' • '),
        imageUrl: card.profileImage,
        doctorId: card.doctorId,
        doctorName: card.name,
        specialty: card.specialty,
        actions: card.actions.map((a) => ({ type: 'action', label: a.label, value: a.value })),
      })));
    }

    if (intentResponse.intent === ChatIntent.DOCTOR_AVAILABILITY) {
      const doctorId = entities.doctorId || conversation.entities.doctorId;
      const specialty = entities.specialty || conversation.entities.specialty;
      const datePreference = entities.timePreference || conversation.entities.timePreference;
      const timePreference = this.extractTimeOfDay(dto.message) || undefined;

      const result = await this.appointmentChatService.getAvailability({
        doctorId,
        specialty,
        datePreference,
        timePreference,
        conversationId: conversation.conversationId,
      });

      cards.push(...result.cards);
      suggestedReplies.push(...result.suggestedReplies);
    }

    if (intentResponse.intent === ChatIntent.APPOINTMENT_STATUS) {
      if (!user || !user.userId || user.role !== 'PATIENT') {
        cards.push(this.createLoginRequiredCard());
        suggestedReplies.push('Sign in', 'Create account', 'Continue browsing doctors');
        return await this.buildResponse(conversation, intentResponse, cards, suggestedReplies, 'You need to sign in to view your appointments.');
      }

      const filter = this.extractStatusFilter(dto.message);
      const result = await this.appointmentChatService.getAppointmentsForCurrentUser(
        user.userId,
        user.role,
        filter,
      );
      cards.push(...result.cards);
      suggestedReplies.push(...result.suggestedReplies);
    }

    if (intentResponse.intent === ChatIntent.APPOINTMENT_BOOKING) {
      if (!user || !user.userId || user.role !== 'PATIENT') {
        cards.push(this.createLoginRequiredCard());
        suggestedReplies.push('Sign in', 'Create account', 'Continue browsing doctors');
        return await this.buildResponse(conversation, intentResponse, cards, suggestedReplies, 'You need to sign in to book an appointment.');
      }

      const hasBookingIntent = this.isBookingIntent(dto.message);
      const hasCancellationIntent = /cancel/i.test(dto.message);
      const hasRescheduleIntent = /reschedule/i.test(dto.message);

      if (hasCancellationIntent) {
        const appointmentId = entities.appointmentId || conversation.entities.appointmentId;
        if (appointmentId) {
          const result = await this.appointmentChatService.prepareCancellation(
            appointmentId,
            user.userId,
            user.role,
            conversation.conversationId,
          );
          cards.push(...result.cards);
          suggestedReplies.push(...result.suggestedReplies);
        } else {
          const appointmentsResult = await this.appointmentChatService.getAppointmentsForCurrentUser(
            user.userId,
            user.role,
          );
          cards.push(...appointmentsResult.cards);
          suggestedReplies.push(...appointmentsResult.suggestedReplies);
        }
      } else if (hasRescheduleIntent) {
        const appointmentId = entities.appointmentId || conversation.entities.appointmentId;
        if (appointmentId) {
          const result = await this.appointmentChatService.prepareReschedule(
            appointmentId,
            user.userId,
            user.role,
          );
          cards.push(...result.cards);
          suggestedReplies.push(...result.suggestedReplies);
        } else {
          const appointmentsResult = await this.appointmentChatService.getAppointmentsForCurrentUser(
            user.userId,
            user.role,
          );
          cards.push(...appointmentsResult.cards);
          suggestedReplies.push(...appointmentsResult.suggestedReplies);
        }
      } else if (hasBookingIntent) {
        const doctorId = entities.doctorId || conversation.entities.doctorId;
        const date = entities.date || entities.timePreference || 'today';
        const timeSlot = entities.timeSlot;

        if (doctorId && date && timeSlot) {
          const result = await this.appointmentChatService.prepareBooking({
            doctorId,
            date,
            timeSlot,
            userId: user.userId,
            role: user.role,
            conversationId: conversation.conversationId,
          });
          cards.push(...result.cards);
          suggestedReplies.push(...result.suggestedReplies);
        } else {
          suggestedReplies.push('Check availability', 'Available tomorrow morning', 'Find a doctor');
          return await this.buildResponse(conversation, intentResponse, [], suggestedReplies,
            'To book an appointment, I need to know which doctor and time slot you prefer. First, let me show you available doctors.');
        }
      } else {
        // APPOINTMENT_BOOKING intent without specific booking/cancel/reschedule keywords
        suggestedReplies.push('Check availability', 'Available tomorrow morning', 'Find a doctor');
      }
    }

    if (intentResponse.intent === ChatIntent.NEARBY_HOSPITALS) {
      const hospitalResult: HospitalSearchResult =
        await this.hospitalChatService.searchNearbyHospitals({
          latitude,
          longitude,
        });
      cards.push(...hospitalResult.cards);
      suggestedReplies.push(...hospitalResult.suggestedReplies);
    }

    if (intentResponse.intent === ChatIntent.NEARBY_LABS) {
      const labResult = await this.labChatService.searchNearbyLabs({
        latitude,
        longitude,
      });
      cards.push(...labResult.cards);
      suggestedReplies.push(...labResult.suggestedReplies);
    }

    if (intentResponse.intent === ChatIntent.LAB_TEST_GUIDANCE) {
      const guidanceResult = this.labTestGuidanceService.getGuidance(dto.message);
      suggestedReplies.push(...guidanceResult.suggestedReplies);
      return await this.buildResponse(
        conversation,
        intentResponse,
        cards,
        suggestedReplies,
        guidanceResult.message,
      );
    }

    if (
      this.aiChatService.isEligibleForAI(intentResponse.intent) &&
      (intentResponse.intent === ChatIntent.GENERAL_CHAT ||
        intentResponse.intent === ChatIntent.UNKNOWN)
    ) {
      const aiContext: AiChatContext = {
        conversationId: conversation.conversationId,
        intent: intentResponse.intent,
        entities: conversation.entities as Record<string, unknown>,
        recentMessages: conversation.recentMessages,
        location: dto.location,
        userRole: user?.role,
      };

      const aiResponse = await this.aiChatService.processChat(aiContext, dto.message);

      if (aiResponse.confidence < (Number(process.env.AI_CHAT_MIN_CONFIDENCE) || 0.6)) {
        return await this.buildResponse(conversation, intentResponse, cards, suggestedReplies);
      }

      const aiSuggestedReplies = [...suggestedReplies, ...aiResponse.suggestedReplies];
      return await this.buildResponse(
        conversation,
        intentResponse,
        cards,
        aiSuggestedReplies,
        aiResponse.message,
      );
    }

    return await this.buildResponse(conversation, intentResponse, cards, suggestedReplies);
  }

  private async handlePendingConfirmation(
    pendingAction: PendingAction,
    conversationId: string,
    user?: AuthenticatedUser | null,
  ): Promise<{ cards: ChatCard[]; suggestedReplies: string[]; message: string }> {
    const userId = user?.userId;
    const role = user?.role;

    if (pendingAction.type === 'BOOK_APPOINTMENT') {
      const result = await this.appointmentChatService.confirmBooking(pendingAction, userId || '', role || 'PATIENT', conversationId);
      return { cards: result.cards, suggestedReplies: result.suggestedReplies, message: result.message };
    }

    if (pendingAction.type === 'CANCEL_APPOINTMENT') {
      const result = await this.appointmentChatService.confirmCancellation(pendingAction, userId || '', role || 'PATIENT', conversationId);
      return { cards: result.cards, suggestedReplies: result.suggestedReplies, message: result.message };
    }

    if (pendingAction.type === 'RESCHEDULE_APPOINTMENT') {
      const result = await this.appointmentChatService.confirmReschedule(pendingAction, userId || '', role || 'PATIENT', conversationId);
      return { cards: result.cards, suggestedReplies: result.suggestedReplies, message: result.message };
    }

    return { cards: [], suggestedReplies: [], message: 'Unknown pending action.' };
  }

  private isConfirmation(message: string): boolean {
    const normalized = (message || '').toLowerCase().trim();
    return /^(confirm|yes|ok|okay|yep|sure)\b/.test(normalized);
  }

  private isBookingIntent(message: string): boolean {
    const normalized = (message || '').toLowerCase();
    return /book/i.test(normalized) && !/cancel/i.test(normalized) && !/reschedule/i.test(normalized);
  }

  private extractTimeOfDay(message: string): string | undefined {
    const normalized = (message || '').toLowerCase();
    if (/morning/i.test(normalized)) return 'morning';
    if (/afternoon/i.test(normalized)) return 'afternoon';
    if (/evening/i.test(normalized)) return 'evening';
    return undefined;
  }

  private extractStatusFilter(message: string): 'upcoming' | 'today' | 'completed' | 'cancelled' | undefined {
    const normalized = (message || '').toLowerCase();
    if (/completed/i.test(normalized)) return 'completed';
    if (/cancelled/i.test(normalized)) return 'cancelled';
    if (/today/i.test(normalized)) return 'today';
    if (/upcoming/i.test(normalized)) return 'upcoming';
    return undefined;
  }

  private extractActionEntities(action?: StructuredAction): ChatbotEntityExtraction {
    if (!action) return {};

    return {
      doctorId: action.doctorId,
      appointmentId: action.appointmentId,
      date: action.date,
      timeSlot: action.timeSlot,
      confirmation: action.confirmation,
    };
  }

  private createLoginRequiredCard(): ChatCard {
    return {
      type: 'login-required',
      title: 'Login required',
      subtitle: 'You need to sign in to access this feature',
      message: 'Sign in to your account to manage appointments.',
      actions: [
        { type: 'SIGN_IN', label: 'Sign in', value: 'sign_in' },
        { type: 'CREATE_ACCOUNT', label: 'Create account', value: 'create_account' },
        { type: 'CONTINUE_BROWSING', label: 'Continue browsing doctors', value: 'browse_doctors' },
      ],
    };
  }

  private async buildResponse(
    conversation: any,
    intentResponse: IntentResponse,
    cards: ChatCard[],
    suggestedReplies: string[],
    message?: string,
  ): Promise<ChatbotResponse> {
    const response: ChatbotResponse = {
      conversationId: conversation.conversationId,
      intent: intentResponse.intent,
      message: message || intentResponse.message,
      cards: cards.length > 0 ? cards : undefined,
      suggestedReplies: suggestedReplies.length > 0 ? suggestedReplies : undefined,
    };

    await this.conversationService.updateConversation(conversation.conversationId, {
      lastIntent: intentResponse.intent,
      entities: {},
      role: 'assistant',
      content: response.message,
    });

    return response;
  }
}
