import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IntentRouterService } from '../services/intent-router.service';
import { ChatIntent } from '../types/chatbot.types';

describe('IntentRouterService', () => {
  const service = new IntentRouterService();

  test('should be defined', () => {
    assert.ok(service);
  });

  test('should detect greeting', () => {
    const result = service.route('hello');
    assert.equal(result.intent, ChatIntent.GREETING);
  });

  test('should detect doctor search', () => {
    const result = service.route('I need to find a cardiologist');
    assert.equal(result.intent, ChatIntent.DOCTOR_SEARCH);
  });

  test('should detect doctor availability', () => {
    const result = service.route('Are you available tomorrow?');
    assert.equal(result.intent, ChatIntent.DOCTOR_AVAILABILITY);
  });

  test('should detect nearby hospitals', () => {
    const result = service.route('Find nearby hospitals');
    assert.equal(result.intent, ChatIntent.NEARBY_HOSPITALS);
  });

  test('should detect nearby labs', () => {
    const result = service.route('Where can I do a blood test?');
    assert.equal(result.intent, ChatIntent.NEARBY_LABS);
  });

  test('should detect emergency', () => {
    const result = service.route('I have chest pain');
    assert.equal(result.intent, ChatIntent.EMERGENCY);
  });

  test('should return unknown intent when nothing matches', () => {
    const result = service.route('xyzrandomtext');
    assert.equal(result.intent, ChatIntent.UNKNOWN);
  });

  test('should prioritize emergency over doctor search', () => {
    const result = service.route('I have chest pain and need a doctor');
    assert.equal(result.intent, ChatIntent.EMERGENCY);
  });

  test('should return suggested replies for greeting', () => {
    const result = service.route('hi');
    assert.ok(result.suggestedReplies.length > 0);
  });

  test('should return message for each intent', () => {
    const intentsToTest: ChatIntent[] = [
      ChatIntent.GREETING,
      ChatIntent.HELP,
      ChatIntent.GENERAL_CHAT,
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
      ChatIntent.EMERGENCY,
      ChatIntent.UNKNOWN,
    ];

    for (const intent of intentsToTest) {
      const messageTxt = `trigger-${intent}`;
      if (intent === ChatIntent.GREETING) {
        const res = service.route('hello');
        assert.ok(res.message);
      } else {
        const res = service.route(messageTxt);
        assert.ok(res.message);
        assert.ok(Array.isArray(res.suggestedReplies));
      }
    }
  });
});
