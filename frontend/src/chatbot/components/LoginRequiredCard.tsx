import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { LogIn, UserPlus, Search } from 'lucide-react';

interface LoginRequiredCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const LoginRequiredCard: React.FC<LoginRequiredCardProps> = ({ card, onAction }) => {
  return (
    <div className="chat-card chat-card-login">
      <div className="chat-card-header">
        <div className="chat-login-icon" aria-hidden="true">
          <LogIn className="w-6 h-6 text-blue-600" />
        </div>
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title || 'Login required'}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
          {card.message && <p className="chat-card-meta">{card.message}</p>}
        </div>
      </div>

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => {
            const Icon =
              action.type === 'SIGN_IN' ? LogIn :
              action.type === 'CREATE_ACCOUNT' ? UserPlus : Search;
            return (
              <button
                key={action.label}
                className={cn(
                  'chat-action-btn',
                  action.type === 'SIGN_IN' ? 'chat-action-btn-primary' : 'chat-action-btn-secondary',
                )}
                onClick={() => onAction(action)}
                type="button"
              >
                {Icon && <Icon className="w-4 h-4" />}
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

export default LoginRequiredCard;
