import React from 'react';
import { ChatCard, ChatCardAction, ChatMessage, ChatSlot } from '../types/chatbot.types';
import DoctorChatCard from './DoctorChatCard';
import AvailabilityChatCard from './AvailabilityChatCard';
import AppointmentChatCard from './AppointmentChatCard';
import HospitalChatCard from './HospitalChatCard';
import LabChatCard from './LabChatCard';
import EmergencyChatCard from './EmergencyChatCard';
import LocationRequiredCard from './LocationRequiredCard';
import LoginRequiredCard from './LoginRequiredCard';
import SuccessCard from './SuccessCard';
import ErrorChatCard from './ErrorChatCard';
import ProviderUnavailableCard from './ProviderUnavailableCard';
import ConfirmationCard from './ConfirmationCard';

export interface CardRendererProps {
  message: ChatMessage;
  onAction: (action: ChatCardAction, card: ChatCard) => void;
  onUseLocation?: () => void;
  onRetry?: () => void;
  onSelectSlot?: (slot: ChatSlot, card: ChatCard) => void;
}

const CardRenderer: React.FC<CardRendererProps> = ({ message, onAction, onUseLocation, onRetry, onSelectSlot }) => {
  if (!message.cards || message.cards.length === 0) return null;

  const handleAction = (action: ChatCardAction, card: ChatCard) => {
    onAction(action, card);
  };

  return (
    <div className="chat-card-container">
      {message.cards.map((card, idx) => {
        const cardKey = `${card.type}-${card.title}-${idx}`;
        const content = renderCard(card, handleAction, onUseLocation, onRetry, onSelectSlot);
        return (
          <div key={cardKey} className="chat-card-wrapper">
            {content}
          </div>
        );
      })}
    </div>
  );
};

function renderCard(
  card: ChatCard,
  onAction: (action: ChatCardAction, card: ChatCard) => void,
  onUseLocation?: () => void,
  onRetry?: () => void,
  onSelectSlot?: (slot: ChatSlot, card: ChatCard) => void,
): React.ReactNode {
  const actionWrapper = (action: ChatCardAction) => onAction(action, card);

  switch (card.type) {
    case 'doctor':
      return <DoctorChatCard key={card.doctorId} card={card} onAction={actionWrapper} />;
    case 'availability':
      return <AvailabilityChatCard key={card.doctorId} card={card} onAction={actionWrapper} onSelectSlot={onSelectSlot} />;
    case 'appointment':
      return <AppointmentChatCard key={card.appointmentId} card={card} onAction={actionWrapper} />;
    case 'hospital':
      return <HospitalChatCard key={card.hospitalId} card={card} onAction={actionWrapper} />;
    case 'lab':
      return <LabChatCard key={card.labId} card={card} onAction={actionWrapper} />;
    case 'emergency':
      return <EmergencyChatCard key="emergency" card={card} onAction={actionWrapper} />;
    case 'location-required':
      return <LocationRequiredCard key="location" card={card} onAction={actionWrapper} onUseLocation={onUseLocation} />;
    case 'login-required':
      return <LoginRequiredCard key="login" card={card} onAction={actionWrapper} />;
    case 'success':
      return <SuccessCard key={card.appointmentId || 'success'} card={card} onAction={actionWrapper} />;
    case 'confirmation':
      return <ConfirmationCard key={card.actionType || 'confirmation'} card={card} onAction={actionWrapper} />;
    case 'error':
      return <ErrorChatCard key="error" card={card} onRetry={onRetry} />;
    case 'provider-unavailable':
      return <ProviderUnavailableCard key="provider-unavailable" card={card} onAction={actionWrapper} />;
    default:
      if (card.message && !card.title && !card.actions) {
        return <InfoCard key="info" card={card} />;
      }
      return <UnknownCard key="unknown" card={card} onAction={actionWrapper} />;
  }
}

function InfoCard({ card }: { card: ChatCard }) {
  return (
    <div className="chat-card chat-card-info">
      {card.message && <p className="chat-card-meta">{card.message}</p>}
    </div>
  );
}

function UnknownCard({ card, onAction }: { card: ChatCard; onAction: (action: ChatCardAction) => void }) {
  return (
    <div className="chat-card chat-card-default">
      <h4 className="chat-card-title">{card.title || 'Card'}</h4>
      {card.subtitle && <p className="chat-card-subtitle">{card.subtitle}</p>}
      {card.message && <p className="chat-card-meta">{card.message}</p>}
      {card.actions && (
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
}

export default CardRenderer;
