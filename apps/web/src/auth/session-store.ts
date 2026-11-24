import type { SessionState, SessionUser } from '../lib/types';

const STORAGE_KEY = 'tekabiblio.session';

// sessionStorage survives a reload in this tab and disappears when the tab
// closes. Any script on this origin can read it, so it is not an httpOnly
// cookie. localStorage was rejected because a stolen token would outlive the tab.

type Listener = (session: SessionState | null) => void;

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Record<string, unknown>;
  return typeof user.userId === 'string' && typeof user.role === 'string';
}

function readStoredSession(): SessionState | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      !parsed.accessToken ||
      !parsed.refreshToken ||
      !isSessionUser(parsed.user)
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: {
        userId: parsed.user.userId,
        role: parsed.user.role,
        branchId: parsed.user.branchId,
        memberId: parsed.user.memberId,
      },
    };
  } catch {
    return null;
  }
}

let current: SessionState | null = readStoredSession();
const listeners = new Set<Listener>();

export function getSession(): SessionState | null {
  return current;
}

export function setSession(next: SessionState | null): void {
  current = next;

  if (typeof sessionStorage !== 'undefined') {
    if (next) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  for (const listener of listeners) {
    listener(current);
  }
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
