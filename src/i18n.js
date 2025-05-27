import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslation from './locales/en/translation.json';
import urTranslation from './locales/ur/translation.json';

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      ur: {
        translation: urTranslation
      }
    },
    fallbackLng: 'ur',
    debug: false,

    interpolation: {
      escapeValue: false // React already escapes by default
    },

    // Detect language
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

// Set initial document direction based on detected language
const currentLang = i18n.language || localStorage.getItem('i18nextLng') || 'ur';
document.documentElement.dir = currentLang === 'ur' ? 'rtl' : 'ltr';

export default i18n; 
