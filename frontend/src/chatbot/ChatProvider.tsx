import React, { lazy, Suspense } from 'react';

const ChatWidget = lazy(() => import('./components/ChatWidget'));

import './chatbot.css';

const ChatProvider: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
};

export default ChatProvider;
