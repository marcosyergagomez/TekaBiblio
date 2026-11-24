import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { SessionState } from '../lib/types';
import { getSession, setSession, subscribeSession } from './session-store';

type AuthContextValue = {
  session: SessionState | null;
  signIn: (session: SessionState) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSnapshot] = useState<SessionState | null>(getSession);

  useEffect(() => subscribeSession(setSnapshot), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: (next) => setSession(next),
      signOut: () => setSession(null),
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
