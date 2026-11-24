import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { BrandMark } from '../components/BrandMark';
import { api } from '../lib/api';
import { readApiError } from '../lib/api-error';
import type { SessionState } from '../lib/types';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './accounts';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/profile" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<SessionState>('/auth/login', { email, password });
      const next = response.data;
      if (!next?.accessToken || !next.refreshToken || !next.user?.userId || !next.user.role) {
        setError(t('auth.loginError'));
        return;
      }

      signIn({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        user: next.user,
      });
      navigate('/profile', { replace: true });
    } catch (caught) {
      setError(readApiError(caught) ?? t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <BrandMark />
        <p className="kicker">{t('auth.kicker')}</p>
        <h1>{t('app.name')}</h1>
        <p className="login-aside">{t('auth.aside')}</p>
      </section>
      <div className="card login-card">
        <h2>{t('auth.loginTitle')}</h2>
        <p>{t('auth.loginDescription')}</p>
        <LanguageSwitcher />
        <div className="demo-users">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="chip"
              onClick={() => {
                setEmail(account.email);
                setPassword(DEMO_PASSWORD);
              }}
            >
              {t(account.labelKey)}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="form-grid">
          <label>
            {t('auth.email')}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label>
            {t('auth.password')}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={loading}>
            {loading ? t('auth.submitLoading') : t('auth.submitIdle')}
          </button>
        </form>
      </div>
    </div>
  );
}
