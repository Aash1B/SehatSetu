import React, { useCallback } from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { Phone, MapPin, ExternalLink } from 'lucide-react';

interface EmergencyCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const EmergencyChatCard: React.FC<EmergencyCardProps> = ({ card, onAction }) => {
  const handleAction = useCallback(
    (action: ChatCardAction) => {
      if (action.value?.startsWith('tel:')) {
        window.location.href = action.value;
        return;
      }
      onAction(action);
    },
    [onAction],
  );

  return (
    <div className="chat-card chat-card-emergency" role="alert">
      <div className="chat-emergency-header">
        <div className="chat-emergency-icon" aria-hidden="true">
          🚨
        </div>
        <h4 className="chat-emergency-title">Medical Emergency</h4>
      </div>

      {card.message && <p className="chat-emergency-message">{card.message}</p>}

      {card.phone && (
        <div className="chat-detail-row">
          <Phone className="w-4 h-4 chat-detail-icon" />
          <span>{card.phone}</span>
        </div>
      )}

      {card.latitude !== undefined && card.longitude !== undefined && (
        <div className="chat-detail-row">
          <MapPin className="w-4 h-4 chat-detail-icon" />
          <span>
            {card.latitude.toFixed(4)}, {card.longitude.toFixed(4)}
          </span>
          <button
            className="chat-action-link"
            onClick={() =>
              window.open(
                `https://maps.google.com/maps?q=${card.latitude},${card.longitude}`,
                '_blank',
                'noopener noreferrer',
              )
            }
            type="button"
            aria-label="Open in maps"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => (
            <button
              key={action.label}
              className="chat-action-btn chat-action-btn-emergency"
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

export default EmergencyChatCard;
