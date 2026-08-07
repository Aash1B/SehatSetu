import { useEffect, useCallback } from 'react';
import { ChatMessage } from '../types/chatbot.types';

const STORAGE_KEY = 'sehatsetu_chat_history';
const MAX_MESSAGES = 100;

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cards?: ChatMessage['cards'];
  suggestedReplies?: string[];
}

interface StoredData {
  conversationId: string | null;
  messages: StoredMessage[];
}

export function useChatPersistence() {
  const saveMessages = useCallback((messages: ChatMessage[], conversationId: string | null) => {
    if (typeof window === 'undefined') return;
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
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversationId, messages: safeMessages }),
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadMessages = useCallback((): { conversationId: string | null; messages: ChatMessage[] } => {
    if (typeof window === 'undefined') return { conversationId: null, messages: [] };
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return { conversationId: null, messages: [] };
      const parsed = JSON.parse(raw) as StoredData;
      const messages: ChatMessage[] = (parsed.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        cards: m.cards,
        suggestedReplies: m.suggestedReplies,
      }));
      return { conversationId: parsed.conversationId, messages };
    } catch {
      return { conversationId: null, messages: [] };
    }
  }, []);

  const clearMessages = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        clearMessages();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clearMessages]);

  return { saveMessages, loadMessages, clearMessages };
}
