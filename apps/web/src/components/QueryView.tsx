import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type QueryStatus = 'loading' | 'error' | 'ready';

type QueryViewProps = {
  status: QueryStatus;
  error: string | null;
  onRetry: () => void;
  hasData: boolean;
  isEmpty: boolean;
  empty: string;
  children: ReactNode;
};

export function QueryView({
  status,
  error,
  onRetry,
  hasData,
  isEmpty,
  empty,
  children,
}: QueryViewProps) {
  const { t } = useTranslation();
  const alert = (
    <div className="alert error" role="alert">
      <p>{error ?? t('common.errorGeneric')}</p>
      <button type="button" onClick={onRetry}>
        {t('common.retry')}
      </button>
    </div>
  );

  if (!hasData && status === 'loading') {
    return <p aria-live="polite">{t('common.loading')}</p>;
  }

  if (!hasData && status === 'error') {
    return alert;
  }

  return (
    <>
      {status === 'error' ? alert : null}
      {status === 'loading' ? <p aria-live="polite">{t('common.loading')}</p> : null}
      {isEmpty && status === 'ready' ? <p className="empty">{empty}</p> : children}
    </>
  );
}
