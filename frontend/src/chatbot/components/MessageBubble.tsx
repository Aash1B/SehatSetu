import React, { useState, useMemo, useCallback } from 'react';
import { ChatMessage, ChatCard, ChatCardAction, ChatSlot } from '../types/chatbot.types';
import { renderMarkdown } from '../utils/markdown';
import { Copy, Check } from 'lucide-react';
import CardRenderer from './CardRenderer';
import QuickReplies from './QuickReplies';
import BrandLogo from '../../common/components/BrandLogo';

interface MessageBubbleProps {
  message: ChatMessage;
  onAction: (action: ChatCardAction, card: ChatCard) => void;
  onUseLocation?: () => void;
  onRetry?: () => void;
  onSelectSlot?: (slot: ChatSlot, card: ChatCard) => void;
  onQuickReplyClick?: (reply: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onAction,
  onUseLocation,
  onRetry,
  onSelectSlot,
  onQuickReplyClick,
}) => {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => renderMarkdown(message.content), [message.content]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [message.content]);

  const formattedTime = useMemo(() => {
    return message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);

  const isUser = message.role === 'user';

  return (
    <div className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'}`}>
      {!isUser && (
        <div className="message-assistant-avatar" aria-hidden="true">
          <BrandLogo showWordmark={false} markWrapperClassName="" alt="" />
        </div>
      )}
      <div
        className={`message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`}
        data-message-id={message.id}
      >
      {message.isTyping ? (
        <div className="message-content" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div
          className="message-content"
          dangerouslySetInnerHTML={{ __html: html }}
          role="text"
          aria-label={isUser ? 'Your message' : 'Assistant reply'}
        />
      )}

      {message.content && message.role === 'assistant' && !message.isTyping && (
        <div className="message-actions">
          <button
            className="message-action-btn"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy message'}
            title={copied ? 'Copied!' : 'Copy'}
            type="button"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {isUser && message.timestamp && (
        <div className="message-timestamp-user" aria-hidden="true">
          {formattedTime}
        </div>
      )}

      {!isUser && message.timestamp && (
        <div className="message-timestamp" aria-hidden="true">
          {formattedTime}
        </div>
      )}

      {message.cards && message.cards.length > 0 && (
        <CardRenderer
          message={message}
          onAction={onAction}
          onUseLocation={onUseLocation}
          onRetry={onRetry}
          onSelectSlot={onSelectSlot}
        />
      )}

      {message.suggestedReplies && message.suggestedReplies.length > 0 && !message.isTyping && (
        <QuickReplies
          replies={message.suggestedReplies}
          onReplyClick={(reply) => onQuickReplyClick?.(reply)}
        />
      )}
      </div>
    </div>
  );
};

export default MessageBubble;
