import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pager } from '../../components/Pager';
import { QueryView } from '../../components/QueryView';
import { useQuery } from '../../hooks/useQuery';
import { api } from '../../lib/api';
import { readApiError } from '../../lib/api-error';
import { PAGE_SIZE } from '../../lib/constants';
import { branchLabel, reservationStatusLabel } from '../../lib/labels';
import { getPage } from '../../lib/paging';
import type { Reservation, Shipment } from '../../lib/types';

const SHIPMENT_STATUSES = [
  'PREPARING',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'CANCELLED',
] as const;

export function StaffQueuePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reservations = useQuery(
    (signal) => getPage<Reservation>('/reservations', { page, pageSize: PAGE_SIZE }, signal),
    [page],
  );
  const shipments = useQuery(
    (signal) => getPage<Shipment>('/shipments', { page: 1, pageSize: 50 }, signal),
    [],
  );
  const reservationItems = reservations.data?.items ?? [];
  const shipmentItems = shipments.data?.items ?? [];

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      reservations.reload();
      shipments.reload();
      setNotice(t('queue.updated'));
    } catch (error) {
      setNotice(readApiError(error) ?? t('queue.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="stack">
      <div className="card headline">
        <h2>{t('queue.title')}</h2>
        <p>{t('queue.description')}</p>
      </div>
      {notice ? (
        <p className="alert status" role="status">
          {notice}
        </p>
      ) : null}
      <div className="card">
        <h3>{t('queue.reservations')}</h3>
        <QueryView
          status={reservations.status}
          error={reservations.error}
          onRetry={reservations.reload}
          hasData={reservations.data !== null}
          isEmpty={reservationItems.length === 0}
          empty={t('queue.emptyReservations')}
        >
          <ul className="desk-list">
            {reservationItems.map((reservation) => (
              <li key={reservation.id}>
                <span>
                  {reservation.materialId} · {branchLabel(t, reservation.pickupBranchId)} ·{' '}
                  {reservationStatusLabel(t, reservation.status)}
                </span>
                {reservation.status === 'QUEUED' ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        api.post(`/reservations/${reservation.id}/mark-ready`).then(() => undefined),
                      )
                    }
                  >
                    {t('queue.markReady')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <Pager
            page={reservations.data?.page ?? page}
            pageSize={reservations.data?.pageSize ?? PAGE_SIZE}
            total={reservations.data?.total ?? 0}
            onPage={setPage}
          />
        </QueryView>
      </div>
      <div className="card">
        <h3>{t('queue.shipments')}</h3>
        <QueryView
          status={shipments.status}
          error={shipments.error}
          onRetry={shipments.reload}
          hasData={shipments.data !== null}
          isEmpty={shipmentItems.length === 0}
          empty={t('queue.emptyShipments')}
        >
          <ul className="desk-list">
            {shipmentItems.map((shipment) => (
              <li key={shipment.id}>
                <span>
                  {shipment.copyId} · {branchLabel(t, shipment.fromBranchId)} →{' '}
                  {branchLabel(t, shipment.toBranchId)} · {shipment.status}
                </span>
                <select
                  key={shipment.status}
                  aria-label={t('queue.advance')}
                  defaultValue={shipment.status}
                  disabled={busy}
                  onChange={(event) => {
                    const status = event.target.value;
                    void run(() =>
                      api.post(`/shipments/${shipment.id}/status`, { status }).then(() => undefined),
                    );
                  }}
                >
                  <option value={shipment.status}>{shipment.status}</option>
                  {SHIPMENT_STATUSES.filter((status) => status !== shipment.status).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </QueryView>
      </div>
    </section>
  );
}
