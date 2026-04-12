import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';

const resources = {
  es: { translation: esTranslation },
  en: { translation: enTranslation },
};

const initialLanguage =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('tekabiblio.lang') ?? 'es'
    : 'es';

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('tekabiblio.lang', language);
  }
});

export { i18n };
