import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { loanStatusLabel, materialTypeLabel } from '../lib/labels';

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
  const { t } = useTranslation();
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
      <h2>{t('loans.title')}</h2>
      {loading ? <p>{t('common.loading')}</p> : null}
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
            {items.map((loan) => (
              <tr key={loan.id}>
                <td>{loan.id}</td>
                <td>{materialTypeLabel(t, loan.materialType)}</td>
                <td>{loanStatusLabel(t, loan.status)}</td>
                <td>{new Date(loan.dueDate).toLocaleDateString()}</td>
                <td>{(loan.finalPrice + loan.shipmentFee + (loan.lateFee ?? 0)).toFixed(2)} {t('common.currency')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
