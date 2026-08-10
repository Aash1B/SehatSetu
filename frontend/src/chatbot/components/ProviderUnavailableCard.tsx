import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ProviderUnavailableCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const ProviderUnavailableCard: React.FC<ProviderUnavailableCardProps> = ({ card, onAction }) => {
  return (
    <div className="chat-card chat-card-provider-unavailable" role="status">
      <div className="chat-card-header">
        <div className="chat-warning-icon" aria-hidden="true">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title || 'Temporarily unavailable'}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
          {card.message && <p className="chat-card-meta">{card.message}</p>}
        </div>
      </div>

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => {
            const isRetry = action.label.toLowerCase().includes('try again') || action.label.toLowerCase().includes('retry');
            return (
              <button
                key={action.label}
                className={cn(
                  'chat-action-btn',
                  isRetry ? 'chat-action-btn-primary' : 'chat-action-btn-secondary',
                )}
                onClick={() => onAction(action)}
                type="button"
              >
                {isRetry && <RefreshCw className="w-4 h-4" />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const cn = (base: string, ...classes: (string | false | undefined)[]) =>
  [base, ...classes.filter(Boolean)].join(' ');

export default ProviderUnavailableCard;
