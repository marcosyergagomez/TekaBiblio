import { Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireSession } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireSession>
                <AppShell />
              </RequireSession>
            }
          />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
