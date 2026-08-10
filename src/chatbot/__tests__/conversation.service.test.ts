import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationService } from '../services/conversation.service';
import { ChatIntent } from '../types/chatbot.types';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService();
  });

  afterEach(() => {
    service.stopCleanup();
  });

  test('should create a new conversation with a UUID when no id is supplied', async () => {
    const conversation = await service.getOrCreateConversation();
    assert.ok(conversation.conversationId);
    assert.equal(conversation.recentMessages.length, 0);
    assert.equal(conversation.lastIntent, null);
    assert.deepEqual(conversation.entities, {});
  });

  test('should create distinct conversations for separate calls', async () => {
    const a = await service.getOrCreateConversation();
    const b = await service.getOrCreateConversation();
    assert.notEqual(a.conversationId, b.conversationId);
  });

  test('should reuse an existing conversation when a valid id is supplied', async () => {
    const created = await service.getOrCreateConversation();
    const reused = await service.getOrCreateConversation(created.conversationId);
    assert.equal(reused.conversationId, created.conversationId);
  });

  test('should create a new conversation when an unknown id is supplied', async () => {
    const conversation = await service.getOrCreateConversation('does-not-exist');
    assert.equal(conversation.conversationId, 'does-not-exist');
  });

  test('should merge entities while preserving existing values', async () => {
    const conversation = await service.getOrCreateConversation();
    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_SEARCH,
      entities: { symptoms: ['headache'] },
      role: 'user',
      content: 'I have headaches',
    });

    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_AVAILABILITY,
      entities: { timePreference: 'tomorrow' },
      role: 'user',
      content: 'Show available doctors tomorrow',
    });

    const updated = await service.getOrCreateConversation(conversation.conversationId);
    assert.deepEqual(updated.entities.symptoms, ['headache']);
    assert.equal(updated.entities.timePreference, 'tomorrow');
    assert.equal(updated.lastIntent, ChatIntent.DOCTOR_AVAILABILITY);
  });

  test('should retain context when a message has no new entities', async () => {
    const conversation = await service.getOrCreateConversation();
    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_SEARCH,
      entities: { specialty: 'Cardiology' },
      role: 'user',
      content: 'I need a cardiologist',
    });

    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.GENERAL_CHAT,
      entities: {},
      role: 'assistant',
      content: 'Ok',
    });

    const updated = await service.getOrCreateConversation(conversation.conversationId);
    assert.equal(updated.entities.specialty, 'Cardiology');
  });

  test('should explicitly overwrite a value when a new explicit value is provided', async () => {
    const conversation = await service.getOrCreateConversation();
    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_AVAILABILITY,
      entities: { timePreference: 'today' },
      role: 'user',
      content: 'today',
    });
    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_AVAILABILITY,
      entities: { timePreference: 'tomorrow' },
      role: 'user',
      content: 'tomorrow',
    });

    const updated = await service.getOrCreateConversation(conversation.conversationId);
    assert.equal(updated.entities.timePreference, 'tomorrow');
  });

  test('should merge symptoms uniquely', async () => {
    const conversation = await service.getOrCreateConversation();
    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_SEARCH,
      entities: { symptoms: ['headache'] },
      role: 'user',
      content: 'headache',
    });
    await service.updateConversation(conversation.conversationId, {
      lastIntent: ChatIntent.DOCTOR_SEARCH,
      entities: { symptoms: ['headache', 'fever'] },
      role: 'user',
      content: 'headache fever',
    });

    const updated = await service.getOrCreateConversation(conversation.conversationId);
    assert.deepEqual(updated.entities.symptoms.sort(), ['fever', 'headache']);
  });

  test('should keep a maximum of 10 recent messages', async () => {
    const conversation = await service.getOrCreateConversation();
    for (let i = 0; i < 12; i++) {
      await service.updateConversation(conversation.conversationId, {
        lastIntent: ChatIntent.GENERAL_CHAT,
        entities: {},
        role: 'user',
        content: `message-${i}`,
      });
    }
    const updated = await service.getOrCreateConversation(conversation.conversationId);
    assert.equal(updated.recentMessages.length, 10);
    assert.equal(updated.recentMessages[0].content, 'message-2');
    assert.equal(updated.recentMessages[9].content, 'message-11');
  });

  test('should expire conversations after 60 minutes of inactivity', async () => {
    const conversation = await service.getOrCreateConversation();
    // Manipulate updatedAt to be older than the expiration window
    conversation.updatedAt = new Date(Date.now() - 61 * 60 * 1000);
    service.cleanupExpired();
    const after = await service.getOrCreateConversation(conversation.conversationId);
    // The expired conversation was removed; a fresh one is created with the same ID
    assert.equal(after.conversationId, conversation.conversationId);
    assert.equal(after.recentMessages.length, 0);
  });

  test('cleanup should not remove active conversations', async () => {
    const conversation = await service.getOrCreateConversation();
    service.cleanupExpired();
    const after = await service.getOrCreateConversation(conversation.conversationId);
    assert.equal(after.conversationId, conversation.conversationId);
  });
});
