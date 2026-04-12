import { useTranslation } from 'react-i18next';

type LanguageSwitcherProps = {
  variant?: 'chips' | 'icon';
};

function isSpanishLanguage(language: string | undefined): boolean {
  return (language ?? 'es').toLowerCase().startsWith('es');
}

export function LanguageSwitcher({ variant = 'chips' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isSpanish = isSpanishLanguage(activeLanguage);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className="icon-toggle"
        onClick={() => i18n.changeLanguage(isSpanish ? 'en' : 'es')}
        aria-label={t('language.label')}
        title={t('language.label')}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="lang-glyph">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.93 9h-3.04a15.6 15.6 0 0 0-1.45-5.17A8.03 8.03 0 0 1 19.93 11Zm-7.93 9a13.5 13.5 0 0 1-2.1-5h4.2a13.5 13.5 0 0 1-2.1 5Zm-2.5-7a13.4 13.4 0 0 1 0-2h5a13.4 13.4 0 0 1 0 2h-5Zm-7.43-2a8.03 8.03 0 0 1 4.49-5.17A15.6 15.6 0 0 0 5.11 11H2.07Zm3.04 2a15.6 15.6 0 0 0 1.45 5.17A8.03 8.03 0 0 1 2.07 13h3.04Zm2.39 0h2.02a15.6 15.6 0 0 0 1.08 3.73A15.6 15.6 0 0 1 7.5 13Zm2.02-2H7.5a15.6 15.6 0 0 1 1.08-3.73A15.6 15.6 0 0 0 9.52 11Zm4.96 0a15.6 15.6 0 0 0 1.08-3.73A15.6 15.6 0 0 1 16.5 11h-2.02Zm1.08 2h2.02a15.6 15.6 0 0 1-1.08 3.73A15.6 15.6 0 0 0 14.48 13Zm-2.48-9a13.5 13.5 0 0 1 2.1 5h-4.2a13.5 13.5 0 0 1 2.1-5Zm0 16a8.03 8.03 0 0 1-3.44-4.83A15.6 15.6 0 0 0 12 21a15.6 15.6 0 0 0 3.44-.83A8.03 8.03 0 0 1 12 20Zm-3.44-14.17A15.6 15.6 0 0 0 12 5a15.6 15.6 0 0 0-3.44.83Z" />
        </svg>
        <span>{isSpanish ? 'EN' : 'ES'}</span>
      </button>
    );
  }

  return (
    <div className="locale-switcher">
      <span>{t('language.label')}</span>
      <button
        type="button"
        className={`chip ${isSpanish ? 'active' : ''}`}
        onClick={() => i18n.changeLanguage('es')}
      >
        {t('language.es')}
      </button>
      <button
        type="button"
        className={`chip ${!isSpanish ? 'active' : ''}`}
        onClick={() => i18n.changeLanguage('en')}
      >
        {t('language.en')}
      </button>
    </div>
  );
}
