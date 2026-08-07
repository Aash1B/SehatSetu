import React from 'react';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';
import { Star, IndianRupee } from 'lucide-react';

interface DoctorCardProps {
  card: ChatCard;
  onAction: (action: ChatCardAction) => void;
}

const DoctorChatCard: React.FC<DoctorCardProps> = ({ card, onAction }) => {
  const rating = card.rating;
  const fee = card.fee || (card.consultationFee ? `₹${card.consultationFee}` : '—');

  return (
    <div className="chat-card chat-card-doctor">
      <div className="chat-card-header">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.title} className="chat-card-avatar" loading="lazy" />
        ) : (
          <div className="chat-card-avatar-placeholder">
            {card.title?.charAt(0) || 'D'}
          </div>
        )}
        <div className="chat-card-info">
          <h4 className="chat-card-title">{card.title}</h4>
          <p className="chat-card-subtitle">{card.specialty || 'General Physician'}</p>
          {card.experience && <p className="chat-card-meta">{card.experience}</p>}
          <div className="chat-card-ratings">
            {typeof rating === 'number' && (
              <span className="chat-card-rating">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
            {fee && fee !== '—' && (
              <span className="chat-card-fee">
                <IndianRupee className="w-4 h-4" />
                {fee.replace(/₹/, '').replace(/₹/g, '').trim()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="chat-card-actions">
        {card.actions?.map((action) => (
          <button
            key={action.label}
            className="chat-action-btn chat-action-btn-primary"
            onClick={() => onAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DoctorChatCard;
