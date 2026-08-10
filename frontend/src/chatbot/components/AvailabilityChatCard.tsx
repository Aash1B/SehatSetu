import React from 'react';
import { ChatCard, ChatCardAction, ChatSlot } from '../types/chatbot.types';
import { Clock, Video, Calendar } from 'lucide-react';

interface AvailabilityCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
  onSelectSlot?: (slot: ChatSlot, card: ChatCard) => void;
}

const AvailabilityChatCard: React.FC<AvailabilityCardProps> = ({ card, onAction, onSelectSlot }) => {
  return (
    <div className="chat-card chat-card-availability">
      <div className="chat-card-header">
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
          {card.date && (
            <p className="chat-card-meta">
              <Calendar className="w-4 h-4 inline mr-1" />
              {card.date}
            </p>
          )}
        </div>
      </div>

      {card.slots && card.slots.length > 0 && (
        <div className="chat-slots-grid">
          {card.slots.map((slot, idx) => (
            <button
              key={idx}
              className="chat-slot-btn"
              onClick={() => onSelectSlot?.(slot, card)}
              type="button"
            >
              <Clock className="w-4 h-4" />
              <span className="chat-slot-time">{slot.displayTime}</span>
              <span className="chat-slot-mode">
                {slot.mode === 'ONLINE' || slot.mode === 'VIDEO' ? <Video className="w-4 h-4" /> : null}
                {slot.mode}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-card-actions">
        {card.actions?.map((action) => (
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
    </div>
  );
};

export default AvailabilityChatCard;
