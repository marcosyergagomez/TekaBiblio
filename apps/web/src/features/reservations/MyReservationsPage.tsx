import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pager } from '../../components/Pager';
import { QueryView } from '../../components/QueryView';
import { useQuery } from '../../hooks/useQuery';
import { PAGE_SIZE } from '../../lib/constants';
import { formatDate } from '../../lib/format';
import { branchLabel, reservationStatusLabel } from '../../lib/labels';
import { getPage } from '../../lib/paging';
import type { Reservation } from '../../lib/types';

export function MyReservationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery(
    (signal) => getPage<Reservation>('/reservations', { page, pageSize: PAGE_SIZE }, signal),
    [page],
  );
  const items = query.data?.items ?? [];

  return (
    <section className="card">
      <h2>{t('reservations.title')}</h2>
      <QueryView
        status={query.status}
        error={query.error}
        onRetry={query.reload}
        hasData={query.data !== null}
        isEmpty={items.length === 0}
        empty={t('reservations.empty')}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('reservations.table.id')}</th>
                <th>{t('reservations.table.materialId')}</th>
                <th>{t('reservations.table.pickupBranch')}</th>
                <th>{t('reservations.table.status')}</th>
                <th>{t('reservations.table.queue')}</th>
                <th>{t('reservations.table.expiresAt')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((reservation, index) => (
                <tr
                  key={reservation.id}
                  className="row-in"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <td>{reservation.id}</td>
                  <td>{reservation.materialId}</td>
                  <td>{branchLabel(t, reservation.pickupBranchId)}</td>
                  <td>{reservationStatusLabel(t, reservation.status)}</td>
                  <td>{reservation.queuePosition}</td>
                  <td>{formatDate(reservation.expiresAt, true) ?? t('common.notAvailable')}</td>
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
