import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatbot } from '../hooks/useChatbot';
import MessageBubble from './MessageBubble';
import QuickReplies from './QuickReplies';
import TypingIndicator from './TypingIndicator';
import {
  Send,
  X,
  Maximize2,
  Minimize2,
  Paperclip,
  FileText,
  RefreshCw,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import { ChatMessage } from '../types/chatbot.types';
import { useTranslation } from 'react-i18next';
import { useChatbotWelcomeReplies } from '../hooks/useChatbotTranslations';
import BrandLogo from '../../common/components/BrandLogo';

const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf';
const ACCEPTED_ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

interface SelectedAttachment {
  file: File;
  previewUrl?: string;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useTranslation('chatbot');
  const welcomeReplies = useChatbotWelcomeReplies();

  const {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    retryLastMessage,
    handleQuickReply,
    handleCardAction,
    useLocation,
  } = useChatbot();

  const handleSend = useCallback(() => {
    if (isLoading || isTyping) return;
    if (attachment) {
      setAttachmentError('Attachments are not supported by the chatbot yet. Remove the attachment before sending.');
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue('');
  }, [attachment, inputValue, isLoading, isTyping, sendMessage]);

  const handleAttachmentChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_ATTACHMENT_TYPES.has(file.type)) {
      setAttachmentError('Unsupported file type. Choose a PNG, JPG, JPEG, WEBP, or PDF file.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setAttachmentError('File is too large. Attachments must be 10 MB or smaller.');
      return;
    }

    setAttachment({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    });
    setAttachmentError(null);
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachment(null);
    setAttachmentError(null);
  }, []);

  useEffect(() => {
    const previewUrl = attachment?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [attachment?.previewUrl]);

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
    const handleOpenSetuAI = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('open-setu-ai', handleOpenSetuAI);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('open-setu-ai', handleOpenSetuAI);
    };
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
        <BrandLogo
          showWordmark={false}
          markWrapperClassName=""
          markClassName="chat-toggle-logo"
          alt=""
        />
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
            <BrandLogo showWordmark={false} markWrapperClassName="" alt="" />
          </div>
          <div className="chat-header-text">
            <h3 className="chat-header-title">Setu AI</h3>
            <p className="chat-header-subtitle">
              <span
                className={`chat-status-dot ${isLoading || isTyping ? 'chat-status-dot-typing' : ''}`}
                aria-hidden="true"
              />
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
                <BrandLogo showWordmark={false} markWrapperClassName="" alt="" />
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
        {attachmentError && (
          <div className="chat-attachment-error" role="alert">
            {attachmentError}
          </div>
        )}
        {attachment && (
          <div className="chat-attachment-preview" role="status">
            {attachment.previewUrl ? (
              <img
                className="chat-attachment-thumbnail"
                src={attachment.previewUrl}
                alt=""
              />
            ) : (
              <FileText className="chat-attachment-file-icon w-5 h-5" aria-hidden="true" />
            )}
            <span className="chat-attachment-name" title={attachment.file.name}>
              {attachment.file.name}
            </span>
            <button
              type="button"
              className="chat-attachment-remove"
              onClick={removeAttachment}
              aria-label={`Remove ${attachment.file.name}`}
              title="Remove attachment"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="chat-composer-row">
          <button
            type="button"
            className="chat-composer-btn chat-composer-btn-attachment"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isTyping}
            aria-label="Attach file"
            title="Attach file"
          >
            <Paperclip className="w-6 h-6" aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={handleAttachmentChange}
            hidden
          />
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
            disabled={isLoading || isTyping || (!inputValue.trim() && !attachment)}
            aria-label={t('sendMessage')}
            title={t('sendMessageTitle')}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
