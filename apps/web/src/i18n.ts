import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';

const resources = {
  es: { translation: esTranslation },
  en: { translation: enTranslation },
};

const initialLanguage =
  typeof window !== 'undefined' ? (window.localStorage.getItem('tekabiblio.lang') ?? 'es') : 'es';

function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

applyDocumentLanguage(initialLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  applyDocumentLanguage(language);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('tekabiblio.lang', language);
  }
});

export { i18n };
