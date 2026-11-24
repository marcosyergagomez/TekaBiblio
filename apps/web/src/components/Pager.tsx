import { useTranslation } from 'react-i18next';

type PagerProps = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
};

export function Pager({ page, pageSize, total, onPage }: PagerProps) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="pager">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('common.previous')}
      </button>
      <span>{t('common.page', { page, pages })}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('common.next')}
      </button>
    </div>
  );
}
