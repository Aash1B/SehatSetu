import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { CheckCircle, XCircle } from 'lucide-react';

interface ConfirmationCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const ConfirmationCard: React.FC<ConfirmationCardProps> = ({ card, onAction }) => {
  return (
    <div className="chat-card chat-card-confirmation">
      <div className="chat-card-header">
        <div className="chat-confirm-icon" aria-hidden="true">
          <CheckCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
          {card.message && <p className="chat-card-meta">{card.message}</p>}
        </div>
      </div>

      {card.fee && (
        <div className="chat-confirm-fee">
          <span className="chat-confirm-fee-label">Fee</span>
          <span className="chat-confirm-fee-amount">{card.fee}</span>
        </div>
      )}

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => {
            const isConfirm = action.type === 'CONFIRM';
            const isCancel = action.type === 'CANCEL_ACTION';
            return (
              <button
                key={action.label}
                className={cn(
                  'chat-action-btn',
                  isConfirm ? 'chat-action-btn-primary' :
                  isCancel ? 'chat-action-btn-danger' : 'chat-action-btn-secondary',
                )}
                onClick={() => onAction(action)}
                type="button"
              >
                {isConfirm && <CheckCircle className="w-4 h-4" />}
                {isCancel && <XCircle className="w-4 h-4" />}
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

export default ConfirmationCard;
