import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pager } from '../../components/Pager';
import { QueryView } from '../../components/QueryView';
import { useQuery } from '../../hooks/useQuery';
import { PAGE_SIZE } from '../../lib/constants';
import { formatDate, formatMoney, sumMoney } from '../../lib/format';
import { loanStatusLabel, materialTypeLabel } from '../../lib/labels';
import { getPage } from '../../lib/paging';
import type { Loan } from '../../lib/types';

export function MyLoansPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery(
    (signal) => getPage<Loan>('/loans', { page, pageSize: PAGE_SIZE }, signal),
    [page],
  );
  const items = query.data?.items ?? [];

  return (
    <section className="card">
      <h2>{t('loans.title')}</h2>
      <QueryView
        status={query.status}
        error={query.error}
        onRetry={query.reload}
        hasData={query.data !== null}
        isEmpty={items.length === 0}
        empty={t('loans.empty')}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('loans.table.id')}</th>
                <th>{t('loans.table.type')}</th>
                <th>{t('loans.table.status')}</th>
                <th>{t('loans.table.dueDate')}</th>
                <th>{t('loans.table.total')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((loan, index) => (
                <tr key={loan.id} className="row-in" style={{ animationDelay: `${index * 45}ms` }}>
                  <td>{loan.id}</td>
                  <td>{materialTypeLabel(t, loan.materialType)}</td>
                  <td>{loanStatusLabel(t, loan.status)}</td>
                  <td>{formatDate(loan.dueDate) ?? t('common.notAvailable')}</td>
                  <td>
                    {formatMoney(sumMoney([loan.finalPrice, loan.shipmentFee, loan.lateFee]))}{' '}
                    {t('common.currency')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          page={query.data?.page ?? page}
          pageSize={query.data?.pageSize ?? PAGE_SIZE}
          total={query.data?.total ?? 0}
          onPage={setPage}
        />
      </QueryView>
    </section>
  );
}
