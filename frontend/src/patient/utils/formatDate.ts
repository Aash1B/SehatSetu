// Date/time formatting helpers

import i18n, { localeForFormatting } from '../../i18n/config';

const getLocale = () => localeForFormatting(i18n.language || 'en');

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (timeString: string): string => {
  const date = new Date(`1970-01-01T${timeString}`);
  return date.toLocaleTimeString(getLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return i18n.t('patient:relativeDate.today');
  if (diffDays === 1) return i18n.t('patient:relativeDate.tomorrow');
  if (diffDays === -1) return i18n.t('patient:relativeDate.yesterday');
  return formatDate(dateString);
};
