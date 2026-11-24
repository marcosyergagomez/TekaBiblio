import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthProvider';
import { Pager } from '../../components/Pager';
import { QueryView } from '../../components/QueryView';
import { useQuery } from '../../hooks/useQuery';
import { api } from '../../lib/api';
import { readApiError } from '../../lib/api-error';
import { PAGE_SIZE } from '../../lib/constants';
import { formatMoney } from '../../lib/format';
import { branchLabel, materialTypeLabel } from '../../lib/labels';
import { getPage } from '../../lib/paging';
import type { Material } from '../../lib/types';

export function CatalogPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);

  const materialsQuery = useQuery(
    (signal) =>
      getPage<Material>('/materials', { q: query || undefined, page, pageSize: PAGE_SIZE }, signal),
    [query, page],
  );

  const status = materialsQuery.status;
  const materials = materialsQuery.data?.items ?? [];
  const memberId = session?.user.memberId;
  const canReserve = session?.user.role === 'socio' && Boolean(memberId);

  const reserve = async (material: Material) => {
    if (!memberId) {
      return;
    }

    setReservingId(material.id);
    setNotice(null);
    try {
      await api.post('/reservations', {
        memberId,
        materialId: material.id,
        sourceBranchId: material.homeBranchId,
        pickupBranchId: session?.user.branchId ?? material.homeBranchId,
      });
      setNotice(t('catalog.reserved', { title: material.title }));
      materialsQuery.reload();
    } catch (error) {
      setNotice(readApiError(error) ?? t('catalog.reserveFailed'));
    } finally {
      setReservingId(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft === query && page === 1) {
      materialsQuery.reload();
      return;
    }

    setPage(1);
    setQuery(draft);
  };

  return (
    <section className="card">
      <h2>{t('catalog.title')}</h2>
      <form className="inline-form" onSubmit={submit}>
        <label>
          {t('catalog.searchPlaceholder')}
          <input
            placeholder={t('catalog.searchPlaceholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit">{t('catalog.search')}</button>
      </form>
      {notice ? (
        <p className="alert status" role="status">
          {notice}
        </p>
      ) : null}
      <QueryView
        status={status}
        error={materialsQuery.error}
        onRetry={materialsQuery.reload}
        hasData={materialsQuery.data !== null}
        isEmpty={materials.length === 0}
        empty={t('catalog.empty')}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('catalog.table.title')}</th>
                <th>{t('catalog.table.type')}</th>
                <th>{t('catalog.table.branch')}</th>
                <th>{t('catalog.table.price')}</th>
                <th>{t('catalog.table.copies')}</th>
                {canReserve ? <th>{t('catalog.reserve')}</th> : null}
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => {
                const available = material.availableCopies ?? 0;
                const total = material.totalCopies ?? 0;
                return (
                  <tr key={material.id} className="row-in" style={{ animationDelay: `${index * 45}ms` }}>
                    <td>{material.title}</td>
                    <td>{materialTypeLabel(t, material.materialType)}</td>
                    <td>{branchLabel(t, material.homeBranchId)}</td>
                    <td>
                      {formatMoney(material.basePrice) ?? t('common.notAvailable')}{' '}
                      {t('common.currency')}
                    </td>
                    <td>
                      {t('catalog.copiesCount', {
                        available,
                        total,
                      })}
                    </td>
                    {canReserve ? (
                      <td>
                        <button
                          type="button"
                          disabled={available < 1 || reservingId === material.id}
                          onClick={() => void reserve(material)}
                        >
                          {t('catalog.reserve')}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager
          page={materialsQuery.data?.page ?? page}
          pageSize={materialsQuery.data?.pageSize ?? PAGE_SIZE}
          total={materialsQuery.data?.total ?? 0}
          onPage={setPage}
        />
      </QueryView>
    </section>
  );
}
