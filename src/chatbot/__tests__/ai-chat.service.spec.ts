import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GatewayTimeoutException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiChatService, AiChatContext, AiChatResult, AiChatFallback } from '../services/ai-chat.service';
import { ChatIntent } from '../types/chatbot.types';
import { AiService } from '../../ai/ai.service';

interface MockAiService {
  post: <T>(path: string, body: unknown) => Promise<T>;
  delay: (ms: number) => Promise<void>;
}

function createMockAiService(): MockAiService {
  return {
    post: async () => ({}),
    delay: async () => {},
  };
}

function createContext(overrides: Partial<AiChatContext> = {}): AiChatContext {
  return {
    conversationId: 'conv-test-123',
    intent: ChatIntent.UNKNOWN,
    entities: {},
    recentMessages: [],
    ...overrides,
  };
}

describe('AiChatService', () => {
  let mockAiService: MockAiService;
  let service: AiChatService;

  beforeEach(() => {
    mockAiService = createMockAiService();
    service = new AiChatService(mockAiService as unknown as AiService);
    process.env.AI_CHAT_MAX_RETRIES = '1';
    process.env.AI_CHAT_MIN_CONFIDENCE = '0.6';
  });

  afterEach(() => {
    delete process.env.AI_CHAT_MAX_RETRIES;
    delete process.env.AI_CHAT_MIN_CONFIDENCE;
  });

  test('should be defined', () => {
    assert.ok(service);
  });

  test('should not be eligible for deterministic intents', () => {
    assert.equal(service.isEligibleForAI(ChatIntent.EMERGENCY), false);
    assert.equal(service.isEligibleForAI(ChatIntent.DOCTOR_SEARCH), false);
    assert.equal(service.isEligibleForAI(ChatIntent.APPOINTMENT_BOOKING), false);
    assert.equal(service.isEligibleForAI(ChatIntent.NEARBY_HOSPITALS), false);
    assert.equal(service.isEligibleForAI(ChatIntent.LAB_TEST_GUIDANCE), false);
  });

  test('should be eligible for GENERAL_CHAT and UNKNOWN', () => {
    assert.equal(service.isEligibleForAI(ChatIntent.GENERAL_CHAT), true);
    assert.equal(service.isEligibleForAI(ChatIntent.UNKNOWN), true);
  });

  test('should return AI response on successful FastAPI call', async () => {
    mockAiService.post = async () => ({
      success: true,
      message: 'Summary generated',
      data: {
        clinical_summary: 'You mentioned you have a headache. Drinking water and resting may help.',
        chief_complaint: 'headache',
        doctor_advice: ['Stay hydrated', 'Get well soon'],
      },
    });

    const result = await service.processChat(createContext(), 'I have a headache');
    const typed = result as AiChatResult;

    assert.equal(typed.confidence, 0.7);
    assert.equal(typed.provider, 'fastapi-generate-summary');
    assert.ok(typed.message.includes('headache') || typed.message.includes('headache'));
    assert.ok(typed.suggestedReplies.length > 0);
  });

  test('should return AI response using clinical_summary when chief_complaint is empty', async () => {
    mockAiService.post = async () => ({
      success: true,
      data: {
        clinical_summary: 'Take care and let me know if you need anything else.',
      },
    });

    const result = await service.processChat(createContext(), 'Thanks');
    const typed = result as AiChatResult;

    assert.ok(typed.message.includes('Take care'));
  });

  test('should use doctor_advice as suggested replies when present', async () => {
    mockAiService.post = async () => ({
      success: true,
      data: {
        clinical_summary: 'A short response.',
        doctor_advice: ['Rest well', 'Drink water', 'Follow up'],
      },
    });

    const result = await service.processChat(createContext(), 'I feel tired');
    const typed = result as AiChatResult;

    assert.ok(typed.suggestedReplies.includes('Rest well'));
    assert.ok(typed.suggestedReplies.includes('Drink water'));
    assert.ok(typed.suggestedReplies.includes('Follow up'));
  });

  test('should fallback when FastAPI returns 500 (BadGatewayException)', async () => {
    mockAiService.post = async () => {
      throw new BadGatewayException('AI service rejected the request');
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.provider, 'fallback-deterministic');
    assert.equal(typed.confidence, 0);
    assert.equal(typed.reason, 'bad_gateway');
    assert.ok(typed.message.includes('trouble connecting'));
  });

  test('should fallback on timeout (GatewayTimeoutException)', async () => {
    mockAiService.post = async () => {
      throw new GatewayTimeoutException('AI service request timed out');
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.provider, 'fallback-deterministic');
    assert.equal(typed.reason, 'timeout');
    assert.ok(typed.suggestedReplies.length > 0);
  });

  test('should fallback on service unavailable (ServiceUnavailableException)', async () => {
    mockAiService.post = async () => {
      throw new ServiceUnavailableException('AI service is unavailable');
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.reason, 'unavailable');
    assert.ok(typed.message.includes('trouble connecting'));
  });

  test('should fallback on network error', async () => {
    mockAiService.post = async () => {
      throw new Error('connect ECONNREFUSED');
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.reason, 'network_error');
    assert.equal(typed.provider, 'fallback-deterministic');
  });

  test('should fallback on bad JSON / invalid response envelope', async () => {
    mockAiService.post = async () => ({
      success: false,
      error: { code: 'BAD', message: 'fail' },
    });

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.reason, 'invalid_response');
  });

  test('should fallback when response has no clinical_summary or chief_complaint', async () => {
    mockAiService.post = async () => ({
      success: true,
      data: { doctor_advice: ['something'] },
    });

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.reason, 'invalid_response');
  });

  test('should fallback when data field is missing', async () => {
    mockAiService.post = async () => ({
      success: true,
      message: 'ok',
    });

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.reason, 'invalid_response');
  });

  test('should retry on first failure then succeed', async () => {
    let callCount = 0;
    mockAiService.post = async () => {
      callCount++;
      if (callCount === 1) {
        throw new BadGatewayException('transient error');
      }
      return {
        success: true,
        data: { clinical_summary: 'Retry succeeded.' },
      };
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatResult;

    assert.equal(callCount, 2);
    assert.equal(typed.message, 'Retry succeeded.');
  });

  test('should fallback after all retries are exhausted', async () => {
    let callCount = 0;
    mockAiService.post = async () => {
      callCount++;
      throw new BadGatewayException('always fails');
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.ok(callCount >= 2);
    assert.equal(typed.provider, 'fallback-deterministic');
  });

  test('should return low_confidence fallback marker when confidence is below threshold', async () => {
    mockAiService.post = async () => ({
      success: true,
      data: {
        clinical_summary: 'Hi.',
      },
    });

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.equal(typed.reason, 'low_confidence');
    assert.equal(typed.provider, 'fastapi-generate-summary');
    assert.ok(typed.confidence < 0.6);
    assert.ok(typed.message.includes('Hi'));
  });

  test('should include conversation context in the prompt', async () => {
    let receivedPayload: unknown = null;
    mockAiService.post = async (_path: string, body: unknown) => {
      receivedPayload = body;
      return {
        success: true,
        data: { clinical_summary: 'Got it.' },
      };
    };

    const context = createContext({
      conversationId: 'conv-abc',
      intent: ChatIntent.GENERAL_CHAT,
      recentMessages: [
        { role: 'user', content: 'I have a fever', timestamp: new Date() },
        { role: 'assistant', content: 'How long?', timestamp: new Date() },
      ],
      entities: { symptoms: ['fever'] },
      location: { latitude: 28.6, longitude: 77.2 },
      userRole: 'PATIENT',
    });

    await service.processChat(context, 'It started yesterday');
    const payload = receivedPayload as Record<string, unknown>;
    const transcript = payload.transcript as string;

    assert.ok(transcript.includes('I have a fever'));
    assert.ok(transcript.includes('It started yesterday'));
    assert.ok(transcript.includes('symptoms: fever'));
    assert.ok(transcript.includes('User role: PATIENT'));
    assert.ok(transcript.includes('GENERAL_CHAT'));
  });

  test('should never send secrets in the payload', async () => {
    let receivedPayload: unknown = null;
    mockAiService.post = async (_path: string, body: unknown) => {
      receivedPayload = body;
      return {
        success: true,
        data: { clinical_summary: 'ok' },
      };
    };

    await service.processChat(createContext(), 'hello');
    const payload = receivedPayload as string;
    const serialized = JSON.stringify(payload);

    assert.ok(!serialized.includes('password'));
    assert.ok(!serialized.includes('token'));
    assert.ok(!serialized.includes('X-Internal-API-Key'));
  });

  test('should handle emergency detection bypass — AI never handles emergencies', () => {
    assert.equal(service.isEligibleForAI(ChatIntent.EMERGENCY), false);
  });

  test('should provide sensible fallback replies', async () => {
    mockAiService.post = async () => {
      throw new ServiceUnavailableException('down');
    };

    const result = await service.processChat(createContext(), 'hello');
    const typed = result as AiChatFallback;

    assert.ok(typed.suggestedReplies.includes('Find a doctor'));
    assert.ok(typed.suggestedReplies.includes('Book an appointment'));
    assert.ok(typed.suggestedReplies.includes('Nearby hospitals'));
    assert.ok(typed.suggestedReplies.length >= 3);
  });

  test('should pass medical_entities as null', async () => {
    let receivedPayload: unknown = null;
    mockAiService.post = async (_path: string, body: unknown) => {
      receivedPayload = body;
      return {
        success: true,
        data: { clinical_summary: 'ok' },
      };
    };

    await service.processChat(createContext(), 'hello');
    const payload = receivedPayload as Record<string, unknown>;

    assert.equal(payload.medical_entities, null);
    assert.equal(payload.language, 'auto');
    assert.equal(payload.output_language, 'en');
  });
});
