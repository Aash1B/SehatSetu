import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { Phone, Navigation, TestTube } from 'lucide-react';

interface LabCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const LabChatCard: React.FC<LabCardProps> = ({ card, onAction }) => {
  const handleAction = (action: ChatCardAction) => {
    if (action.type === 'action' && action.value?.startsWith('tel:')) {
      const href = action.value;
      window.location.assign(href);
      return;
    }
    if (action.type === 'action' && action.value?.startsWith('directions:')) {
      if (card.latitude !== undefined && card.longitude !== undefined) {
        const url = `https://maps.google.com/maps?q=${card.latitude},${card.longitude}`;
        window.open(url, '_blank', 'noopener noreferrer');
      }
      onAction(action);
      return;
    }
    onAction(action);
  };

  return (
    <div className="chat-card chat-card-lab">
      <div className="chat-card-header">
        <div className="chat-card-info">
          <h4 className="chat-card-title">
            <TestTube className="w-5 h-5 inline mr-2 text-teal-600" />
            {card.title}
          </h4>
          {card.subtitle && <p className="chat-card-meta">{card.subtitle}</p>}
          <div className="chat-card-tags">
            {card.distance !== undefined && (
              <span className="chat-tag">
                <Navigation className="w-4 h-4" />
                {card.distance.toFixed(1)} km
              </span>
            )}
            {card.homeCollection && (
              <span className="chat-tag bg-purple-100 text-purple-800">
                Home collection
              </span>
            )}
          </div>
        </div>
      </div>

      {card.phone && (
        <div className="chat-detail-row">
          <Phone className="w-4 h-4 chat-detail-icon" />
          <span>{card.phone}</span>
        </div>
      )}

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => (
            <button
              key={action.label}
              className="chat-action-btn chat-action-btn-secondary"
              onClick={() => handleAction(action)}
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

export default LabChatCard;
