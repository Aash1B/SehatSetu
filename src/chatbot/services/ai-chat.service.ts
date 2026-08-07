import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { ConversationMessage } from './conversation.service';
import { ChatIntent } from '../types/chatbot.types';

const AI_CHAT_MAX_RETRIES = Number(process.env.AI_CHAT_MAX_RETRIES || 1);
const AI_CHAT_MIN_CONFIDENCE = Number(process.env.AI_CHAT_MIN_CONFIDENCE || 0.6);

export interface AiChatContext {
  conversationId: string;
  intent: ChatIntent;
  entities: Record<string, unknown>;
  recentMessages: ConversationMessage[];
  location?: { latitude?: number; longitude?: number };
  userRole?: string;
}

export interface AiChatResult {
  message: string;
  suggestedReplies: string[];
  confidence: number;
  provider: string;
}

export interface AiChatFallback {
  message: string;
  suggestedReplies: string[];
  confidence: number;
  provider: string;
  reason: string;
}

export type AiChatResponse = AiChatResult | AiChatFallback;

export const AI_CHAT_FALLBACK_REPLIES: string[] = [
  'Find a doctor',
  'Book an appointment',
  'Nearby hospitals',
  'Lab tests',
  'Help',
];

const SYSTEM_PROMPT = [
  'You are SehatSetu, a helpful and safety-conscious health assistant chatbot.',
  'Your primary role is natural, friendly conversation and medical education.',
  '',
  'CRITICAL RULES:',
  '- You are NOT a doctor and MUST NOT diagnose, prescribe, or treat.',
  '- If a user describes a medical emergency (chest pain, severe bleeding, difficulty breathing, stroke, severe headache, unconsciousness, seizure, severe allergic reaction, pregnancy emergency, self-harm), tell them to call 112 or go to the nearest emergency room immediately.',
  '- Do NOT make up doctor names, hospital names, locations, or availability.',
  '- For structured actions (appointments, booking, hospital/lab search, prescriptions, health records, authentication), direct the user to the appropriate service or ask them to rephrase.',
  '- Encourage users to seek in-person care for persistent or worsening symptoms.',
  '',
  'CONVERSATION GUIDANCE:',
  "- Use the conversation history to stay on topic and avoid repeating questions.",
  '- Ask clarifying follow-up questions when the request is ambiguous.',
  '- Explain medical concepts in simple terms; do not hallucinate facts.',
  '- Keep responses concise and conversational.',
  '',
  'OUTPUT FORMAT: Return a concise conversational response grounded in the transcript summary. The summary will include clinical_summary and chief_complaint fields. You may combine or restate them as a friendly, conversational reply.',
].join('\n');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function computeConfidence(message: string, hasSummary: boolean, hasAdvice: boolean): number {
  if (message.length < 20) return 0.3;
  if (message.length < 50) return 0.5;
  if (!hasSummary && !hasAdvice) return 0.4;
  return 0.7;
}

function validateSummaryResponse(payload: unknown): {
  message: string;
  suggestedReplies: string[];
  confidence: number;
} | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.success !== 'boolean' || !payload.success) return null;

  const data = payload.data;
  if (!isRecord(data)) return null;

  const clinicalSummary = typeof data.clinical_summary === 'string'
    ? data.clinical_summary.trim()
    : '';
  const chiefComplaint = typeof data.chief_complaint === 'string'
    ? data.chief_complaint.trim()
    : '';

  const message = clinicalSummary || chiefComplaint;
  if (!message) return null;

  const advice: string[] = Array.isArray(data.doctor_advice)
    ? data.doctor_advice.filter(
        (a): a is string => typeof a === 'string' && a.trim().length > 0,
      )
    : [];

  const suggestedReplies = advice.length > 0
    ? advice.slice(0, 4)
    : [AI_CHAT_FALLBACK_REPLIES[0], AI_CHAT_FALLBACK_REPLIES[1], AI_CHAT_FALLBACK_REPLIES[2]];

  const hasSummary = clinicalSummary.length > 0;
  const confidence = computeConfidence(message, hasSummary, advice.length > 0);

  return {
    message,
    suggestedReplies,
    confidence,
  };
}

function buildTranscriptFromContext(context: AiChatContext, userMessage: string): string {
  const lines: string[] = [];

  for (const msg of context.recentMessages) {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    lines.push(`${role}: ${msg.content}`);
  }

  lines.push(`Current user message: ${userMessage}`);

  const entityParts: string[] = [];
  if (Array.isArray(context.entities.symptoms) && context.entities.symptoms.length > 0) {
    entityParts.push(`Known symptoms: ${(context.entities.symptoms as string[]).join(', ')}`);
  }
  if (context.entities.specialty) {
    entityParts.push(`Specialty context: ${context.entities.specialty}`);
  }
  if (context.entities.disease) {
    entityParts.push(`Condition: ${context.entities.disease}`);
  }
  if (context.location?.latitude !== undefined && context.location?.longitude !== undefined) {
    entityParts.push(`User location: ${context.location.latitude}, ${context.location.longitude}`);
  }
  if (context.userRole) {
    entityParts.push(`User role: ${context.userRole}`);
  }

  if (entityParts.length > 0) {
    lines.push(`Context: ${entityParts.join('; ')}`);
  }

  lines.push(`Detected intent: ${context.intent}. This is a natural conversation message — respond conversationally.`);

  return lines.join('\n');
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(private readonly aiService: AiService) {}

  isEligibleForAI(intent: ChatIntent): boolean {
    const deterministicIntents: ChatIntent[] = [
      ChatIntent.EMERGENCY,
      ChatIntent.DOCTOR_SEARCH,
      ChatIntent.DOCTOR_RECOMMENDATION,
      ChatIntent.DOCTOR_AVAILABILITY,
      ChatIntent.APPOINTMENT_BOOKING,
      ChatIntent.APPOINTMENT_STATUS,
      ChatIntent.NEARBY_HOSPITALS,
      ChatIntent.NEARBY_LABS,
      ChatIntent.LAB_TEST_GUIDANCE,
      ChatIntent.HEALTH_RECORDS,
      ChatIntent.PRESCRIPTIONS,
    ];
    return !deterministicIntents.includes(intent);
  }

  async processChat(
    context: AiChatContext,
    userMessage: string,
  ): Promise<AiChatResponse> {
    const startedAt = Date.now();

    const transcript = buildTranscriptFromContext(context, userMessage);
    const prompt = `${SYSTEM_PROMPT}\n\n${transcript}`;

    const payload = {
      transcript: prompt,
      language: 'auto',
      output_language: 'en',
      medical_entities: null,
    };

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= AI_CHAT_MAX_RETRIES; attempt += 1) {
      try {
        const raw = await this.aiService.post<unknown>(
          'generate-summary',
          payload,
        );

        const validated = validateSummaryResponse(raw);
        if (!validated) {
          lastError = new Error('Response validation failed');
          this.logger.warn(
            `AI response validation failed for conversation ${context.conversationId}`,
          );
          continue;
        }

        const latencyMs = Date.now() - startedAt;
        this.logSuccess(context.conversationId, context.intent, latencyMs, validated.confidence);

        const result: AiChatResult = {
          message: validated.message,
          suggestedReplies: validated.suggestedReplies,
          confidence: validated.confidence,
          provider: 'fastapi-generate-summary',
        };

        if (validated.confidence < AI_CHAT_MIN_CONFIDENCE) {
          return {
            message: result.message,
            suggestedReplies: result.suggestedReplies,
            confidence: result.confidence,
            provider: result.provider,
            reason: 'low_confidence',
          };
        }

        return result;
      } catch (error) {
        lastError = error;
        if (attempt < AI_CHAT_MAX_RETRIES) {
          this.logger.warn(
            `AI chat attempt ${attempt + 1} failed for conversation ${context.conversationId}, retrying...`,
          );
          await this.delay(Math.pow(2, attempt) * 500);
        }
      }
    }

    return this.buildFallback(context, startedAt, lastError);
  }

  private buildFallback(
    context: AiChatContext,
    startedAt: number,
    error?: unknown,
  ): AiChatFallback {
    const latencyMs = Date.now() - startedAt;
    const reason = this.determineFallbackReason(error);

    this.logger.warn(
      `AI chat fallback conversationId=${context.conversationId} ` +
      `intent=${context.intent} latencyMs=${latencyMs} reason=${reason}`,
    );

    return {
      message:
        "I'm sorry, I'm having trouble connecting to my AI service right now. " +
        'How can I help you with doctor searches, appointments, hospitals, or lab tests?',
      suggestedReplies: AI_CHAT_FALLBACK_REPLIES,
      confidence: 0,
      provider: 'fallback-deterministic',
      reason,
    };
  }

  private determineFallbackReason(error?: unknown): string {
    if (!error) return 'unknown';
    if (error instanceof GatewayTimeoutException) return 'timeout';
    if (error instanceof BadGatewayException) return 'bad_gateway';
    if (error instanceof ServiceUnavailableException) return 'unavailable';
    if (error instanceof Error) {
      if (error.message.includes('validation failed')) return 'invalid_response';
      if (error.message.includes('invalid JSON')) return 'bad_json';
      if (error.message.includes('unavailable')) return 'unavailable';
      return 'network_error';
    }
    return 'unknown';
  }

  private logSuccess(
    conversationId: string,
    intent: ChatIntent,
    latencyMs: number,
    confidence: number,
  ): void {
    this.logger.log(
      `AI chat success conversationId=${conversationId} intent=${intent} ` +
      `latencyMs=${latencyMs} provider=fastapi-generate-summary confidence=${confidence}`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
