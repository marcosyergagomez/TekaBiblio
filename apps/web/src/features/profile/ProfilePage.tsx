import { useTranslation } from 'react-i18next';
import { QueryView } from '../../components/QueryView';
import { useQuery } from '../../hooks/useQuery';
import { api } from '../../lib/api';
import { branchLabel, roleLabel } from '../../lib/labels';
import type { Profile } from '../../lib/types';

export function ProfilePage() {
  const { t } = useTranslation();
  const query = useQuery(
    (signal) => api.get<Profile>('/auth/me', { signal }).then((response) => response.data),
    [],
  );
  const profile = query.data;

  return (
    <QueryView
      status={query.status}
      error={query.error ?? t('profile.loadError')}
      onRetry={query.reload}
      hasData={query.data !== null}
      isEmpty={!profile}
      empty={t('profile.loadError')}
    >
      {profile ? (
        <section className="card">
          <h2>{t('profile.title')}</h2>
          <div className="grid two">
            <div>
              <strong>{t('profile.labels.userId')}</strong>
              <p>{profile.user.userId}</p>
            </div>
            <div>
              <strong>{t('profile.labels.role')}</strong>
              <p>{roleLabel(t, profile.user.role)}</p>
            </div>
            <div>
              <strong>{t('profile.labels.branch')}</strong>
              <p>{branchLabel(t, profile.user.branchId)}</p>
            </div>
            <div>
              <strong>{t('profile.labels.memberId')}</strong>
              <p>{profile.user.memberId ?? t('common.notAvailable')}</p>
            </div>
          </div>
        </section>
      ) : null}
    </QueryView>
  );
}
