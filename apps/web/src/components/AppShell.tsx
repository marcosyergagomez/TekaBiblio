import { useTranslation } from 'react-i18next';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { isStaffRole } from '../auth/accounts';
import { useAuth } from '../auth/AuthProvider';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { MyLoansPage } from '../features/loans/MyLoansPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { MyReservationsPage } from '../features/reservations/MyReservationsPage';
import { StaffOpsPage } from '../features/staff/StaffOpsPage';
import { StaffQueuePage } from '../features/staff/StaffQueuePage';
import { endServerSession } from '../lib/api';
import { roleLabel } from '../lib/labels';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PageStage } from './PageStage';

export function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const logout = async () => {
    try {
      await endServerSession();
    } catch {
      // The local session ends even when the server cannot be reached.
    }

    signOut();
    navigate('/login', { replace: true });
  };

  const staff = isStaffRole(session.user.role);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <BrandMark />
          <div>
            <h1>{t('app.name')}</h1>
            <p className="meta">{t('app.activeRole', { role: roleLabel(t, session.user.role) })}</p>
          </div>
        </div>
        <LanguageSwitcher />
        <nav aria-label={t('nav.primary')}>
          <NavLink to="/profile">{t('nav.profile')}</NavLink>
          <NavLink to="/catalog">{t('nav.catalog')}</NavLink>
          <NavLink to="/my/loans">{t('nav.loans')}</NavLink>
          <NavLink to="/my/reservations">{t('nav.reservations')}</NavLink>
          {staff ? <NavLink to="/staff">{t('nav.staff')}</NavLink> : null}
          {staff ? <NavLink to="/staff/queue">{t('nav.queue')}</NavLink> : null}
        </nav>
        <button type="button" onClick={logout} className="secondary">
          {t('auth.logout')}
        </button>
      </aside>
      <main className="content">
        <PageStage>
          <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/my/loans" element={<MyLoansPage />} />
          <Route path="/my/reservations" element={<MyReservationsPage />} />
          {staff ? <Route path="/staff" element={<StaffOpsPage />} /> : null}
          {staff ? <Route path="/staff/queue" element={<StaffQueuePage />} /> : null}
          <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </PageStage>
      </main>
    </div>
  );
}
