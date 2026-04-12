import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { branchLabel, roleLabel } from '../lib/labels';

type Profile = {
  user: {
    userId: string;
    role: string;
    branchId?: string;
    memberId?: string;
  };
};

export function ProfilePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Profile>('/auth/me')
      .then((response) => setData(response.data))
      .catch(() => setError(t('profile.loadError')));
  }, []);

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!data) {
    return <p>{t('common.loading')}</p>;
  }

  return (
    <section className="card">
      <h2>{t('profile.title')}</h2>
      <div className="grid two">
        <div>
          <strong>{t('profile.labels.userId')}</strong>
          <p>{data.user.userId}</p>
        </div>
        <div>
          <strong>{t('profile.labels.role')}</strong>
          <p>{roleLabel(t, data.user.role)}</p>
        </div>
        <div>
          <strong>{t('profile.labels.branch')}</strong>
          <p>{branchLabel(t, data.user.branchId)}</p>
        </div>
        <div>
          <strong>{t('profile.labels.memberId')}</strong>
          <p>{data.user.memberId ?? t('common.notAvailable')}</p>
        </div>
      </div>
    </section>
  );
}
