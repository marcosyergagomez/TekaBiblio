import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getSession, setSession } from '../auth/session-store';
import { shouldAttemptRefresh } from './refresh-policy';
import type { SessionState } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshing: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

function readRefreshedSession(data: unknown, previous: SessionState): SessionState | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const body = data as Partial<SessionState>;
  if (typeof body.accessToken !== 'string' || typeof body.refreshToken !== 'string') {
    return null;
  }

  const user = body.user ?? previous.user;
  if (!user?.userId || !user.role) {
    return null;
  }

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user,
  };
}

async function refreshAccessToken(): Promise<string | null> {
  const session = getSession();
  const refreshToken = session?.refreshToken;
  if (!session || !refreshToken) {
    return null;
  }

  const stillCurrent = () => getSession()?.refreshToken === refreshToken;

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });
    if (!stillCurrent()) {
      return null;
    }

    const nextSession = readRefreshedSession(response.data, session);
    if (!nextSession || !stillCurrent()) {
      if (stillCurrent()) {
        setSession(null);
      }
      return null;
    }

    setSession(nextSession);
    return nextSession.accessToken;
  } catch {
    if (stillCurrent()) {
      setSession(null);
    }
    return null;
  }
}

export async function endServerSession(): Promise<void> {
  const session = getSession();
  if (!session) {
    return;
  }

  try {
    await api.post('/auth/logout-all');
  } catch {
    await axios
      .post(`${API_URL}/auth/logout`, { refreshToken: session.refreshToken })
      .catch(() => undefined);
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    if (!original || !shouldAttemptRefresh(original.url, error.response?.status, original._retry)) {
      throw error;
    }

    original._retry = true;

    if (!refreshing) {
      refreshing = refreshAccessToken().finally(() => {
        refreshing = null;
      });
    }

    const token = await refreshing;
    if (!token) {
      throw error;
    }

    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);
