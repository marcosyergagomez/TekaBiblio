import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { api } from '../lib/api';
import { branchLabel, materialTypeLabel } from '../lib/labels';

type Material = {
  id: string;
  title: string;
  materialType: string;
  homeBranchId: string;
  basePrice: number;
};

type Copy = {
  id: string;
  materialId: string;
  branchId: string;
  status: string;
};

export function CatalogPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (nextQuery = '') => {
    setLoading(true);
    try {
      const [materialsResponse, copiesResponse] = await Promise.all([
        api.get('/materials', {
          params: {
            q: nextQuery || undefined,
            pageSize: 100,
          },
        }),
        api.get('/copies', {
          params: {
            pageSize: 200,
          },
        }),
      ]);

      setMaterials(materialsResponse.data.items ?? []);
      setCopies(copiesResponse.data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    load(query);
  };

  return (
    <section className="card">
      <div className="section-head">
        <h2>{t('catalog.title')}</h2>
        <LanguageSwitcher variant="icon" />
      </div>
      <form className="inline-form" onSubmit={submit}>
        <input
          placeholder={t('catalog.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">{t('catalog.search')}</button>
      </form>

      {loading ? <p>{t('common.loading')}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('catalog.table.title')}</th>
              <th>{t('catalog.table.type')}</th>
              <th>{t('catalog.table.branch')}</th>
              <th>{t('catalog.table.price')}</th>
              <th>{t('catalog.table.copies')}</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const related = copies.filter((copy) => copy.materialId === material.id);
              return (
                <tr key={material.id}>
                  <td>{material.title}</td>
                  <td>{materialTypeLabel(t, material.materialType)}</td>
                  <td>{branchLabel(t, material.homeBranchId)}</td>
                  <td>{material.basePrice.toFixed(2)} {t('common.currency')}</td>
                  <td>{related.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
