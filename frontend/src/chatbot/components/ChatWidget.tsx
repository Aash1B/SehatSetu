import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatbot } from '../hooks/useChatbot';
import MessageBubble from './MessageBubble';
import QuickReplies from './QuickReplies';
import TypingIndicator from './TypingIndicator';
import {
  MessageCircle,
  Send,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import { ChatMessage } from '../types/chatbot.types';
import { useTranslation } from 'react-i18next';
import { useChatbotWelcomeReplies } from '../hooks/useChatbotTranslations';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { t } = useTranslation('chatbot');
  const welcomeReplies = useChatbotWelcomeReplies();

  const {
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
  } = useChatbot();

  const handleSend = useCallback(() => {
    if (isLoading || isTyping) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue('');
  }, [inputValue, isLoading, isTyping, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsExpanded(false);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const lastMsg = messages[messages.length - 1];

  if (!isOpen) {
    return (
      <button
        type="button"
        className="chat-toggle-btn"
        onClick={() => setIsOpen(true)}
        aria-label={t('openChat')}
        title={t('openChatTitle')}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`chat-window ${isExpanded ? 'chat-window-expanded' : 'chat-window-collapsed'}`}
       role="dialog"
       aria-label={t('chatLabel')}
       aria-modal="false"
     >
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="chat-header-text">
            <h3 className="chat-header-title">{t('title')}</h3>
            <p className="chat-header-subtitle">
              {isLoading || isTyping ? t('typing') : t('online')}
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-header-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? t('collapseChat') : t('expandChat')}
            title={isExpanded ? t('collapseChat') : t('expandChat')}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            className="chat-header-btn"
            onClick={() => {
              setIsOpen(false);
              setIsExpanded(false);
            }}
             aria-label={t('closeChat')}
             title={t('closeChatTitle')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="chat-messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
           aria-label={t('messagesLabel')}
         >
        <div className="chat-messages-content">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <MessageCircle className="w-8 h-8" />
              </div>
              <p className="chat-welcome-text">
                {t('welcomeMessage')}
              </p>
              <QuickReplies replies={welcomeReplies} onReplyClick={handleQuickReply} />
            </div>
          ) : (
            messages.map((msg: ChatMessage) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onAction={handleCardAction}
                onUseLocation={useLocation}
                onRetry={retryLastMessage}
                onQuickReplyClick={handleQuickReply}
              />
            ))
          )}
          {(isTyping || isLoading) && lastMsg?.role === 'user' && (
            <div className="typing-container">
              <TypingIndicator size="md" />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="chat-error-bar" role="alert">
          <div className="chat-error-content">
            {error.type === 'offline' ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{error.message}</span>
          </div>
          {error.canRetry && (
            <button
              type="button"
              className="chat-error-retry"
              onClick={retryLastMessage}
              aria-label={t('retry')}
            >
               <RefreshCw className="w-4 h-4" />
               {t('retry')}
            </button>
          )}
        </div>
      )}

      <div className="chat-composer">
        {messages.length > 0 && (
          <button
            type="button"
            className="chat-composer-btn chat-composer-btn-secondary"
            onClick={clearChat}
            aria-label={t('clearConversationTitle')}
            title={t('clearConversationTitle')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <textarea
          ref={inputRef}
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('typeMessage')}
          disabled={isLoading || isTyping}
          rows={1}
          aria-label={t('typeMessageAria')}
          maxLength={2000}
        />
        <button
          type="button"
          className="chat-composer-btn chat-composer-btn-primary"
          onClick={handleSend}
          disabled={isLoading || isTyping || !inputValue.trim()}
          aria-label={t('sendMessage')}
          title={t('sendMessageTitle')}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
