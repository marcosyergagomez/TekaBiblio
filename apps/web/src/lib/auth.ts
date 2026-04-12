export type SessionUser = {
  userId: string;
  role: string;
  branchId?: string;
  memberId?: string;
};

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

const STORAGE_KEY = 'tekabiblio.session';

export function getSession(): SessionState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function setSession(state: SessionState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
