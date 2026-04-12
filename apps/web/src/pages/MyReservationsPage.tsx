import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Reservation = {
  id: string;
  materialId: string;
  pickupBranchId: string;
  status: string;
  queuePosition: number;
  expiresAt?: string;
};

export function MyReservationsPage() {
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
      <h2>Mis reservas</h2>
      {loading ? <p>Cargando...</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Material</th>
              <th>Sede recogida</th>
              <th>Estado</th>
              <th>Cola</th>
              <th>Expira</th>
            </tr>
          </thead>
          <tbody>
            {items.map((reservation) => (
              <tr key={reservation.id}>
                <td>{reservation.id}</td>
                <td>{reservation.materialId}</td>
                <td>{reservation.pickupBranchId}</td>
                <td>{reservation.status}</td>
                <td>{reservation.queuePosition}</td>
                <td>
                  {reservation.expiresAt
                    ? new Date(reservation.expiresAt).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
