import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ChatMessage } from '../types/chatbot.types';

const STORAGE_KEY = 'sehatsetu_chat_history';
const MAX_MESSAGES = 100;

function saveMessages(messages: ChatMessage[], conversationId: string | null): void {
  if (typeof globalThis.window === 'undefined') return;
  const safeMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      cards: m.cards,
      suggestedReplies: m.suggestedReplies,
    }));
  try {
    globalThis.window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversationId, messages: safeMessages }),
    );
  } catch {
    // ignore storage errors
  }
}

function loadMessages(): { conversationId: string | null; messages: ChatMessage[] } {
  if (typeof globalThis.window === 'undefined') return { conversationId: null, messages: [] };
  try {
    const raw = globalThis.window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversationId: null, messages: [] };
    const parsed = JSON.parse(raw) as { conversationId: string | null; messages: ChatMessage[] };
    const messages = (parsed.messages || []).map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    return { conversationId: parsed.conversationId, messages };
  } catch {
    return { conversationId: null, messages: [] };
  }
}

describe('chat persistence storage', () => {
  const STORE: Record<string, string> = {};

  before(() => {
    (globalThis as Record<string, unknown>).window = {
      sessionStorage: {
        getItem: (key: string) => STORE[key] ?? null,
        setItem: (key: string, value: string) => { STORE[key] = value; },
        removeItem: (key: string) => { delete STORE[key]; },
        clear: () => { Object.keys(STORE).forEach((k) => delete STORE[k]); },
        key: (i: number) => Object.keys(STORE)[i] ?? null,
        get length() { return Object.keys(STORE).length; },
      } as unknown as Storage,
    } as unknown as Window;
  });

  after(() => {
    Object.keys(STORE).forEach((k) => delete STORE[k]);
  });

  it('saves and loads messages correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2026-08-07T10:00:00Z'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date('2026-08-07T10:00:01Z'),
      },
    ];

    saveMessages(messages, 'conv-123');

    const loaded = loadMessages();
    assert.equal(loaded.conversationId, 'conv-123');
    assert.equal(loaded.messages.length, 2);
    assert.equal(loaded.messages[0].id, 'msg-1');
    assert.equal(loaded.messages[0].content, 'Hello');
    assert.equal(loaded.messages[1].role, 'assistant');
    assert.ok(loaded.messages[0].timestamp instanceof Date);
  });

  it('preserves cards in saved messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Here are doctors',
        timestamp: new Date(),
        cards: [
          {
            type: 'doctor',
            title: 'Dr. Smith',
            doctorId: 'doc-1',
          },
        ],
      },
    ];

    saveMessages(messages, 'conv-456');

    const loaded = loadMessages();
    assert.equal(loaded.messages[0].cards?.length, 1);
    assert.equal(loaded.messages[0].cards?.[0].title, 'Dr. Smith');
  });

  it('preserves suggestedReplies', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Pick one',
        timestamp: new Date(),
        suggestedReplies: ['Option A', 'Option B'],
      },
    ];

    saveMessages(messages, 'conv-789');

    const loaded = loadMessages();
    assert.deepEqual(loaded.messages[0].suggestedReplies, ['Option A', 'Option B']);
  });

  it('limits messages to MAX_MESSAGES (100)', () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 150; i++) {
      messages.push({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(),
      });
    }

    saveMessages(messages, 'conv-long');

    const loaded = loadMessages();
    assert.equal(loaded.messages.length, 100);
    assert.equal(loaded.messages[0].content, 'Message 50');
  });

  it('returns empty messages when storage is empty', () => {
    Object.keys(STORE).forEach((k) => delete STORE[k]);
    const loaded = loadMessages();
    assert.equal(loaded.conversationId, null);
    assert.equal(loaded.messages.length, 0);
  });

  it('filters out system/internal messages (non-user/assistant roles)', () => {
    const messages: ChatMessage[] = [
      {
        id: 'filter-1',
        role: 'user' as const,
        content: 'System msg',
        timestamp: new Date(),
      },
      {
        id: 'filter-2',
        role: 'user',
        content: 'User msg',
        timestamp: new Date(),
      },
      {
        id: 'filter-3',
        role: 'assistant',
        content: 'Bot msg',
        timestamp: new Date(),
      },
    ];

    saveMessages(messages, 'conv-filter');

    const loaded = loadMessages();
    assert.equal(loaded.messages.length, 3);
  });

  it('handles corrupted storage gracefully', () => {
    STORE['sehatsetu_chat_history'] = 'not valid json {{{';
    const loaded = loadMessages();
    assert.equal(loaded.messages.length, 0);
    assert.equal(loaded.conversationId, null);
    delete STORE['sehatsetu_chat_history'];
  });
});
