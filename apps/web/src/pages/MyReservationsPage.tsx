import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { branchLabel, reservationStatusLabel } from '../lib/labels';

type Reservation = {
  id: string;
  materialId: string;
  pickupBranchId: string;
  status: string;
  queuePosition: number;
  expiresAt?: string;
};

export function MyReservationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/reservations', {
        params: {
          pageSize: 100,
        },
      })
      .then((response) => setItems(response.data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="card">
      <h2>{t('reservations.title')}</h2>
      {loading ? <p>{t('common.loading')}</p> : null}
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
            {items.map((reservation) => (
              <tr key={reservation.id}>
                <td>{reservation.id}</td>
                <td>{reservation.materialId}</td>
                <td>{branchLabel(t, reservation.pickupBranchId)}</td>
                <td>{reservationStatusLabel(t, reservation.status)}</td>
                <td>{reservation.queuePosition}</td>
                <td>
                  {reservation.expiresAt
                    ? new Date(reservation.expiresAt).toLocaleString()
                    : t('common.notAvailable')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
