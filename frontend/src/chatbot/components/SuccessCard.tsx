import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { CheckCircle, Calendar, Clock, Video } from 'lucide-react';

interface SuccessCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const SuccessCard: React.FC<SuccessCardProps> = ({ card, onAction }) => {
  return (
    <div className="chat-card chat-card-success">
      <div className="chat-card-header">
        <div className="chat-success-icon" aria-hidden="true">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title || 'Success!'}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
        </div>
      </div>

      {(card.date || card.time || card.consultationMode) && (
        <div className="chat-card-details">
          {card.date && (
            <div className="chat-detail-row">
              <Calendar className="w-4 h-4 chat-detail-icon" />
              <span>{card.date}</span>
            </div>
          )}
          {card.time && (
            <div className="chat-detail-row">
              <Clock className="w-4 h-4 chat-detail-icon" />
              <span>{card.time}</span>
            </div>
          )}
          {card.consultationMode && (
            <div className="chat-detail-row">
              <Video className="w-4 h-4 chat-detail-icon" />
              <span>{card.consultationMode}</span>
            </div>
          )}
        </div>
      )}

      {card.actions && card.actions.length > 0 && (
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

export default SuccessCard;
