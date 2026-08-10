import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { Calendar, Clock, Video, MapPin, Phone } from 'lucide-react';

interface AppointmentCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-slate-100 text-slate-800',
  CANCELLED: 'bg-red-100 text-red-800',
  WAITING: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

const AppointmentChatCard: React.FC<AppointmentCardProps> = ({ card, onAction }) => {
  const status = (card.status || 'SCHEDULED').toUpperCase();
  const statusClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const modeIcon = card.consultationMode?.includes('VIDEO') ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />;

  return (
    <div className="chat-card chat-card-appointment">
      <div className="chat-card-header">
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.doctorName || card.title}</h4>
          <p className="chat-card-subtitle">{card.specialty || 'Consultation'}</p>
        </div>
        <span className={`chat-status-badge ${statusClass}`}>{status}</span>
      </div>

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
            {modeIcon}
            <span>{card.consultationMode}</span>
          </div>
        )}
        {card.phone && (
          <div className="chat-detail-row">
            <Phone className="w-4 h-4 chat-detail-icon" />
            <span>{card.phone}</span>
          </div>
        )}
      </div>

      {card.actions && card.actions.length > 0 && (
        <div className="chat-card-actions">
          {card.actions.map((action) => (
            <button
              key={action.label}
              className={cn(
                'chat-action-btn',
                action.type === 'CANCEL_APPOINTMENT'
                  ? 'chat-action-btn-danger'
                  : action.type === 'JOIN_CONSULTATION'
                    ? 'chat-action-btn-primary'
                    : 'chat-action-btn-secondary',
              )}
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

const cn = (base: string, ...classes: (string | false | undefined)[]) =>
  [base, ...classes.filter(Boolean)].join(' ');

export default AppointmentChatCard;
