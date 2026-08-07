import { useState, useEffect, useCallback, useRef } from 'react';
import { sendChatMessage, ChatRequest, ChatApiError } from '../services/chatApi';
import { ChatMessage, ChatCard, ChatCardAction, ChatError } from '../types/chatbot.types';
import { useChatPersistence } from './useChatPersistence';
import { useNetworkStatus } from '../../common/hooks/useNetworkStatus';

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

const WELCOME_REPLIES = ['Find a doctor', 'Book appointment', 'Nearby hospitals', 'Lab tests', 'Emergency help'];

interface UseChatbotResult {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  error: ChatError | null;
  sendMessage: (message: string, opts?: { location?: { latitude: number; longitude: number } }) => void;
  clearChat: () => void;
  retryLastMessage: () => void;
  handleQuickReply: (reply: string) => void;
  handleCardAction: (action: ChatCardAction, card: ChatCard) => void;
  useLocation: () => void;
  sendOnEnterBehavior: boolean;
  setSendOnEnterBehavior: (v: boolean) => void;
}

export function useChatbot(): UseChatbotResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const isOnline = useNetworkStatus();
  const { saveMessages, loadMessages, clearMessages: clearPersistence } = useChatPersistence();

  const pendingRequestRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ text: string; request: ChatRequest } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const { conversationId: savedConvId, messages: savedMessages } = loadMessages();
    if (savedMessages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(savedMessages);
      if (savedConvId) setConversationId(savedConvId);
    }
  }, [loadMessages]);

  useEffect(() => {
    saveMessages(messages, conversationId);
  }, [messages, conversationId, saveMessages]);

  useEffect(() => {
    if (!isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError({
        type: 'offline',
        message: 'You are currently offline. Please check your internet connection.',
        canRetry: true,
      });
    } else if (error?.type === 'offline') {
      setError(null);
    }
  }, [isOnline, error]);

  const appendUserMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const startProgressiveReply = useCallback(
    (fullText: string, cards?: ChatCard[], replies?: string[]) => {
      const startTime = performance.now();
      const duration = Math.max(800, Math.min(fullText.length * 30, 5000));

      setIsTyping(true);
      setIsLoading(false);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const chars = Math.floor(fullText.length * progress);
        const partial = fullText.slice(0, chars);

        setMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.isTyping);
          if (progress < 1) {
            return [
              ...withoutTyping,
              {
                id: 'typing',
                role: 'assistant',
                content: partial,
                timestamp: new Date(),
                isTyping: true,
              },
            ];
          }
          const finalMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullText,
            timestamp: new Date(),
            cards,
            suggestedReplies: replies,
          };
          return [...withoutTyping, finalMsg];
        });

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsTyping(false);
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string, opts?: { location?: { latitude: number; longitude: number } }) => {
      if (isLoading) return;

      pendingRequestRef.current?.abort();
      setError(null);

      appendUserMessage(text);
      setIsLoading(true);

      const request: ChatRequest = {
        message: text,
        conversationId: conversationId || undefined,
        ...(opts?.location ? { location: opts.location } : {}),
      };
      lastRequestRef.current = { text, request };

      try {
        const response = await sendChatMessage(request);

        setConversationId(response.conversationId || null);

        startProgressiveReply(
          response.message || '',
          response.cards,
          response.suggestedReplies,
        );
      } catch (err) {
        const chatError =
          err instanceof ChatApiError
            ? { type: err.errorType, message: err.message, canRetry: err.canRetry }
            : ({ type: 'unknown', message: 'Something went wrong. Please try again.', canRetry: true } as ChatError);

        setError(chatError);
        setIsLoading(false);
        setIsTyping(false);

        setMessages((prev) => prev.filter((m) => !m.isTyping));
        const fallbackMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: chatError.message,
          timestamp: new Date(),
          isError: true,
          suggestedReplies: WELCOME_REPLIES,
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    },
    [isLoading, conversationId, appendUserMessage, startProgressiveReply],
  );

  const retryLastMessage = useCallback(() => {
    if (lastRequestRef.current) {
      sendMessage(lastRequestRef.current.text);
    }
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setMessages([]);
    setConversationId(null);
    setError(null);
    clearPersistence();
  }, [clearPersistence]);

  const handleQuickReply = useCallback(
    (reply: string) => {
      sendMessage(reply);
    },
    [sendMessage],
  );

  const handleCardAction = useCallback(
    (action: ChatCardAction, card: ChatCard) => {
      const actionType = (action.type || '').toLowerCase();
      const label = action.label || '';
      const value = action.value || '';

      if (actionType.includes('signin') || actionType.includes('sign_in')) {
        window.location.href = '/patient/login';
        return;
      }

      if (actionType.includes('create_account')) {
        window.location.href = '/patient/signup';
        return;
      }

      if (actionType.includes('browse')) {
        window.location.href = '/';
        return;
      }

      if (value.startsWith('tel:')) return;
      if (value.startsWith('directions:')) return;
      if (value.startsWith('view_profile:')) {
        const doctorId = value.split(':')[1];
        if (doctorId) window.location.href = `/patient/search#doctor-${doctorId}`;
        return;
      }

      if (actionType === 'CONFIRM' || value === 'confirm') {
        sendMessage('confirm');
        return;
      }

      if (actionType === 'CANCEL_ACTION' || value === 'cancel') {
        sendMessage('cancel');
        return;
      }

      if (actionType === 'SELECT_SLOT' || actionType === 'VIEW_SLOTS') {
        if (card.doctorId) {
          sendMessage(`Check availability for ${card.doctorName || card.doctorId}`);
        }
        return;
      }

      if (actionType === 'action' || actionType === 'USE_BROWSER_LOCATION' || actionType === 'ENTER_CITY') {
        return;
      }

      if (value === 'all' || value === 'book' || label.toLowerCase().includes('appointments')) {
        sendMessage(label || 'show my appointments');
        return;
      }

      if (label) {
        sendMessage(label);
      }
    },
    [sendMessage],
  );

  const useLocation = useCallback(async () => {
    if (!isOnline) {
      setError({
        type: 'offline',
        message: 'You are offline. Connect to the internet to use location services.',
        canRetry: false,
      });
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          (e) => reject(e),
          { timeout: 8000, enableHighAccuracy: false },
        );
      });

      sendMessage('Find nearby hospitals', {
        location: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
      });
    } catch {
      setError({
        type: 'location_denied',
        message: 'Location access was denied. You can still search manually or enter a city name.',
        canRetry: false,
      });
    }
  }, [isOnline, sendMessage]);

  const [sendOnEnterBehavior, setSendOnEnterBehavior] = useState(true);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
    handleQuickReply,
    handleCardAction,
    useLocation,
    sendOnEnterBehavior,
    setSendOnEnterBehavior,
  };
}
