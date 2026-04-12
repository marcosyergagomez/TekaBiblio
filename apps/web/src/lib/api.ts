import axios from 'axios';
import { clearSession, getSession, setSession } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

async function refreshToken(): Promise<string | null> {
  const session = getSession();
  if (!session?.refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: session.refreshToken,
    });

    const nextSession = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
    };

    setSession(nextSession);
    return nextSession.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error.config;

    if (status !== 401 || !original || original._retry) {
      throw error;
    }

    original._retry = true;

    if (!refreshing) {
      refreshing = refreshToken().finally(() => {
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
