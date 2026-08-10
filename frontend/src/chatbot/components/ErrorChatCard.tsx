import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorCardProps {
  card: ChatCard;
  onAction?: (action: ChatCardAction) => void;
  onRetry?: () => void;
}

const ErrorChatCard: React.FC<ErrorCardProps> = ({ card, onAction, onRetry }) => {
  const isNetworkError =
    card.message?.toLowerCase().includes('offline') ||
    card.message?.toLowerCase().includes('connection');

  return (
    <div className="chat-card chat-card-error" role="alert">
      <div className="chat-card-header">
        <div className="chat-error-icon" aria-hidden="true">
          {isNetworkError ? <WifiOff className="w-6 h-6 text-amber-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
        </div>
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title || 'Something went wrong'}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
          {card.message && <p className="chat-error-message">{card.message}</p>}
        </div>
      </div>

      {onRetry && (
        <div className="chat-card-actions">
          <button
            className="chat-action-btn chat-action-btn-secondary"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )}

      {card.actions && card.actions.length > 0 && onAction && (
        <div className="chat-card-actions">
          {card.actions.map((action) => (
            <button
              key={action.label}
              className="chat-action-btn chat-action-btn-secondary"
              onClick={() => onAction(action)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrorChatCard;
