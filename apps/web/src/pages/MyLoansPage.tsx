import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Loan = {
  id: string;
  memberId: string;
  materialType: string;
  status: string;
  dueDate: string;
  finalPrice: number;
  shipmentFee: number;
  lateFee?: number;
};

export function MyLoansPage() {
  const [items, setItems] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/loans', {
        params: {
          pageSize: 100,
        },
      })
      .then((response) => setItems(response.data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="card">
      <h2>Mis prestamos</h2>
      {loading ? <p>Cargando...</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Vence</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((loan) => (
              <tr key={loan.id}>
                <td>{loan.id}</td>
                <td>{loan.materialType}</td>
                <td>{loan.status}</td>
                <td>{new Date(loan.dueDate).toLocaleDateString()}</td>
                <td>{(loan.finalPrice + loan.shipmentFee + (loan.lateFee ?? 0)).toFixed(2)} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
