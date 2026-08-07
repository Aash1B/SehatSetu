import { useTranslation } from 'react-i18next';

export const useChatbotTranslations = () => {
  const { t } = useTranslation('chatbot');
  return {
    welcomeMessage: t('welcomeMessage'),
    welcomeReplies: t('welcomeReplies', { returnObjects: true }),
    typing: t('typing'),
    online: t('online'),
    title: t('title'),
    openChat: t('openChat'),
    openChatTitle: t('openChatTitle'),
    chatLabel: t('chatLabel'),
    messagesLabel: t('messagesLabel'),
    collapseChat: t('collapseChat'),
    expandChat: t('expandChat'),
    closeChat: t('closeChat'),
    closeChatTitle: t('closeChatTitle'),
    clearConversation: t('clearConversation'),
    clearConversationAria: t('clearConversationAria'),
    clearConversationTitle: t('clearConversationTitle'),
    sendMessage: t('sendMessage'),
    sendMessageTitle: t('sendMessageTitle'),
    typeMessage: t('typeMessage'),
    typeMessageAria: t('typeMessageAria'),
    retry: t('retry'),
    suggestedReplies: t('suggestedReplies'),
    aiTyping: t('aiTyping'),
  };
};

export const useChatbotWelcomeReplies = (): string[] => {
  const { t } = useTranslation('chatbot');
  const replies = t('welcomeReplies', { returnObjects: true }) as unknown;
  return Array.isArray(replies) ? replies.filter((r): r is string => typeof r === 'string') : [];
};
