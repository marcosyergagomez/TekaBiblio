import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { clearSession, getSession, setSession } from './lib/auth';
import { CatalogPage } from './pages/CatalogPage';
import { MyLoansPage } from './pages/MyLoansPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StaffOpsPage } from './pages/StaffOpsPage';

const STAFF_ROLES = new Set(['admin_global', 'admin_sede', 'bibliotecario']);

const DEMO_ACCOUNTS = [
  { label: 'Admin Global', email: 'admin.global@tekabiblio.local' },
  { label: 'Admin Sede', email: 'admin.norte@tekabiblio.local' },
  { label: 'Bibliotecario', email: 'biblio.norte@tekabiblio.local' },
  { label: 'Socio Oro', email: 'socio.oro@tekabiblio.local' },
];

function Layout() {
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
          <h1>TekaBiblio</h1>
          <p className="meta">Rol activo: {session.user.role}</p>
        </div>
        <nav>
          <Link to="/profile">Perfil</Link>
          <Link to="/catalog">Catalogo</Link>
          <Link to="/my/loans">Mis prestamos</Link>
          <Link to="/my/reservations">Mis reservas</Link>
          {isStaff ? <Link to="/staff">Operativa staff</Link> : null}
        </nav>
        <button onClick={logout} className="secondary">Cerrar sesion</button>
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
  const navigate = useNavigate();
  const [email, setEmail] = useState('socio.oro@tekabiblio.local');
  const [password, setPassword] = useState('Demo12345!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogged = useMemo(() => Boolean(getSession()), []);
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
      setError('Credenciales invalidas o servidor no disponible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h2>Acceso Demo</h2>
        <p>Frontend conectado a API real con refresh token y alcance por rol.</p>

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
              {account.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="form-grid">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
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
