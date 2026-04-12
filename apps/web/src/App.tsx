import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { api } from './lib/api';
import { clearSession, getSession, setSession } from './lib/auth';
import { roleLabel } from './lib/labels';
import { CatalogPage } from './pages/CatalogPage';
import { MyLoansPage } from './pages/MyLoansPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StaffOpsPage } from './pages/StaffOpsPage';

const STAFF_ROLES = new Set(['admin_global', 'admin_sede', 'bibliotecario']);

const DEMO_ACCOUNTS = [
  { labelKey: 'auth.demoUsers.adminGlobal', email: 'admin.global@tekabiblio.local' },
  { labelKey: 'auth.demoUsers.adminBranch', email: 'admin.norte@tekabiblio.local' },
  { labelKey: 'auth.demoUsers.librarian', email: 'biblio.norte@tekabiblio.local' },
  { labelKey: 'auth.demoUsers.memberGold', email: 'socio.oro@tekabiblio.local' },
];

function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout-all');
    } catch {
      // Intentionally ignore backend errors and clear local session anyway.
    }

    clearSession();
    navigate('/login', { replace: true });
  };

  const isStaff = STAFF_ROLES.has(session.user.role);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>{t('app.name')}</h1>
          <p className="meta">{t('app.activeRole', { role: roleLabel(t, session.user.role) })}</p>
        </div>
        <LanguageSwitcher />
        <nav>
          <Link to="/profile">{t('nav.profile')}</Link>
          <Link to="/catalog">{t('nav.catalog')}</Link>
          <Link to="/my/loans">{t('nav.loans')}</Link>
          <Link to="/my/reservations">{t('nav.reservations')}</Link>
          {isStaff ? <Link to="/staff">{t('nav.staff')}</Link> : null}
        </nav>
        <button onClick={logout} className="secondary">{t('auth.logout')}</button>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/my/loans" element={<MyLoansPage />} />
          <Route path="/my/reservations" element={<MyReservationsPage />} />
          {isStaff ? <Route path="/staff" element={<StaffOpsPage />} /> : null}
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('socio.oro@tekabiblio.local');
  const [password, setPassword] = useState('Demo12345!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogged = Boolean(getSession());
  if (isLogged) {
    return <Navigate to="/profile" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      setSession({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
      });

      navigate('/profile', { replace: true });
    } catch {
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
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
                setPassword('Demo12345!');
              }}
            >
              {t(account.labelKey)}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="form-grid">
          <label>
            {t('auth.email')}
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>

          <label>
            {t('auth.password')}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? t('auth.submitLoading') : t('auth.submitIdle')}
          </button>
        </form>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<Layout />} />
    </Routes>
  );
}
