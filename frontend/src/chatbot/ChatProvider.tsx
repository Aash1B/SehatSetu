import React, { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

const ChatWidget = lazy(() => import('./components/ChatWidget'));

import './chatbot.css';

/** Routes where the chatbot should NOT appear */
const CHATBOT_HIDDEN_PREFIXES = [
  '/doctor/',
  '/doctor/login',
  '/doctor/signup',
  '/patient/login',
  '/patient/signup',
  '/verify-otp',
  '/forgot-password',
  '/reset-password',
];

const ChatProvider: React.FC = () => {
  const { pathname } = useLocation();

  const isHidden = CHATBOT_HIDDEN_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix),
  );

  if (isHidden) return null;

  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
};

export default ChatProvider;
