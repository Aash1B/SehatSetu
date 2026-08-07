import React from 'react';

interface TypingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ size = 'md' }) => {
  const dots = Array.from({ length: 3 });
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <div className="typing-indicator" role="status" aria-label="AI is typing">
      {dots.map((_, i) => (
        <span
          key={i}
          className={`typing-dot ${sizeClass} animate-bounce`}
          style={{ animationDelay: `${i * 0.15}s` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export default TypingIndicator;
