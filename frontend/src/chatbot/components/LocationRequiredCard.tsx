import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { MapPin, Locate, Navigation } from 'lucide-react';

interface LocationRequiredCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
  onUseLocation?: () => void;
}

const LocationRequiredCard: React.FC<LocationRequiredCardProps> = ({ card, onAction, onUseLocation }) => {
  return (
    <div className="chat-card chat-card-location">
      <div className="chat-card-header">
        <div className="chat-location-icon" aria-hidden="true">
          <MapPin className="w-6 h-6 text-amber-600" />
        </div>
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title || 'Location needed'}</h4>
          {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
          {card.message && <p className="chat-card-meta">{card.message}</p>}
        </div>
      </div>

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => {
            const isLocationAction =
              action.type === 'USE_BROWSER_LOCATION' ||
              action.label.toLowerCase().includes('location');
            return (
              <button
                key={action.label}
                className={cn(
                  'chat-action-btn',
                  isLocationAction ? 'chat-action-btn-primary' : 'chat-action-btn-secondary',
                )}
                onClick={(e) => {
                  if (isLocationAction) {
                    e.preventDefault();
                    e.stopPropagation();
                    onUseLocation?.();
                    return;
                  }
                  onAction(action);
                }}
                type="button"
              >
                {isLocationAction ? <Locate className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
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

export default LocationRequiredCard;
