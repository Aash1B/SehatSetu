import React from 'react';
import { cn } from '../../lib/utils';

interface QuickRepliesProps {
  replies: string[];
  onReplyClick: (reply: string) => void;
  maxVisible?: number;
  disabled?: boolean;
}

const QuickReplies: React.FC<QuickRepliesProps> = ({ replies, onReplyClick, maxVisible = 8, disabled }) => {
  if (!replies || replies.length === 0) return null;

  const visible = replies.slice(0, maxVisible);

  return (
    <div className="quick-replies" role="group" aria-label="Suggested replies">
      {visible.map((reply, idx) => (
        <button
          key={`${reply}-${idx}`}
          className={cn('quick-reply-chip', disabled && 'quick-reply-chip-disabled')}
          onClick={() => !disabled && onReplyClick(reply)}
          disabled={disabled}
          type="button"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
