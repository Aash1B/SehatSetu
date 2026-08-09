import i18n from 'i18next';
import type { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
] as const;

export const defaultLanguage = 'en';

export const namespaceList = [
  'common',
  'navbar',
  'footer',
  'home',
  'about',
  'auth',
  'buttons',
  'forms',
  'errors',
  'chatbot',
  'doctor',
  'patient',
  'appointment',
  'hospital',
  'labs',
  'profile',
  'settings',
  'validation',
  'bookingFlow',
  'verifyOtp',
  'mch',
] as const;

const STORAGE_KEY = 'sehatsetu_language';

export const localeForFormatting = (lng: string): string => {
  const localeMap: Record<string, string> = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'bn': 'bn-IN',
    'te': 'te-IN',
    'mr': 'mr-IN',
    'ta': 'ta-IN',
    'kn': 'kn-IN',
  };
  return localeMap[lng] || 'en-IN';
};

export const supportedLanguageCodes = supportedLanguages.map((l) => l.code);

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguageCodes,
    lng: localStorage.getItem(STORAGE_KEY) || defaultLanguage,
    backend: {
      loadPath: '/i18n/locales/{{lng}}/{{ns}}.json',
      requestOptions: {
        cache: 'no-cache',
      },
    },
    detection: {
      caches: ['localStorage'],
      lookupCookie: undefined,
      storageKey: STORAGE_KEY,
      excludeCookie: [],
      excludeHeader: [],
    },
    ns: namespaceList,
    defaultNS: 'common',
    fallbackNS: ['common', 'navbar', 'footer', 'home', 'about', 'auth', 'buttons', 'forms', 'errors', 'bookingFlow', 'verifyOtp'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  } as InitOptions);

export const changeLanguage = async (lng: string) => {
  localStorage.setItem(STORAGE_KEY, lng);
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = (): string => {
  return i18n.language || localStorage.getItem(STORAGE_KEY) || defaultLanguage;
};

export default i18n;
