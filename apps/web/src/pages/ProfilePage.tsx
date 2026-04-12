import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Profile = {
  user: {
    userId: string;
    role: string;
    branchId?: string;
    memberId?: string;
  };
};

export function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Profile>('/auth/me')
      .then((response) => setData(response.data))
      .catch(() => setError('No se pudo cargar el perfil actual.'));
  }, []);

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!data) {
    return <p>Cargando perfil...</p>;
  }

  return (
    <section className="card">
      <h2>Perfil actual</h2>
      <div className="grid two">
        <div>
          <strong>User ID</strong>
          <p>{data.user.userId}</p>
        </div>
        <div>
          <strong>Rol</strong>
          <p>{data.user.role}</p>
        </div>
        <div>
          <strong>Sede</strong>
          <p>{data.user.branchId ?? '-'}</p>
        </div>
        <div>
          <strong>Member ID</strong>
          <p>{data.user.memberId ?? '-'}</p>
        </div>
      </div>
    </section>
  );
}
