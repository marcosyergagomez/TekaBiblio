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

let inMemorySession: SessionState | null = null;

export function getSession(): SessionState | null {
  return inMemorySession;
}

export function setSession(state: SessionState): void {
  inMemorySession = state;
}

export function clearSession(): void {
  inMemorySession = null;
}
