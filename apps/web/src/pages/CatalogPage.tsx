import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

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
      <h2>Catalogo</h2>
      <form className="inline-form" onSubmit={submit}>
        <input
          placeholder="Buscar por titulo"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {loading ? <p>Cargando...</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Tipo</th>
              <th>Sede</th>
              <th>Precio</th>
              <th>Ejemplares</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const related = copies.filter((copy) => copy.materialId === material.id);
              return (
                <tr key={material.id}>
                  <td>{material.title}</td>
                  <td>{material.materialType}</td>
                  <td>{material.homeBranchId}</td>
                  <td>{material.basePrice.toFixed(2)} EUR</td>
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
