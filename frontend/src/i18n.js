import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationMR from './locales/mr/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  mr: {
    translation: translationMR,
  },
};

// Use the saved language from localStorage if available, otherwise default to English
const savedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
