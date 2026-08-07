import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { Clock, Navigation } from 'lucide-react';

interface HospitalCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const STATUS_BG: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-red-100 text-red-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

const HospitalChatCard: React.FC<HospitalCardProps> = ({ card, onAction }) => {
  const openStatus = card.openStatus || 'UNKNOWN';
  const statusClass = STATUS_BG[openStatus] || STATUS_BG.UNKNOWN;

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
    <div className="chat-card chat-card-hospital">
      <div className="chat-card-header">
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title}</h4>
          {card.subtitle && <p className="chat-card-meta">{card.subtitle}</p>}
          <div className="chat-card-tags">
            {card.distance !== undefined && (
              <span className="chat-tag">
                <Navigation className="w-4 h-4" />
                {card.distance.toFixed(1)} km
              </span>
            )}
            <span className={`chat-tag ${statusClass}`}>
              <Clock className="w-4 h-4" />
              {openStatus}
            </span>
          </div>
        </div>
      </div>

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

export default HospitalChatCard;
