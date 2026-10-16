import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://m-eyewear.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Attach stored token to every request ────────────────────────────────────
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Global error normalisation ──────────────────────────────────────────────
function normaliseError(data: any): string | null {
  if (!data) return null;
  if (typeof data.message === 'string' && data.message) return data.message;

  // Laravel-style validation: { error: { phone_number: ['...'], ... } }
  const bag = data.error ?? data.errors;
  if (typeof bag === 'string' && bag) return bag;
  if (bag && typeof bag === 'object') {
    const first = Object.values(bag).flat().filter(Boolean);
    if (first.length) return String(first[0]);
  }
  return null;
}

// ─── Expired / revoked session ───────────────────────────────────────────────
// The API answers 401 once a token is expired or revoked. The handler (set in
// App.tsx) signs the user out; it lives there because this module cannot
// import the store without a cycle.
let onUnauthorized: (() => void) | null = null;
let signingOut = false;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

const isSessionExpired = (err: any): boolean => {
  if (err.response?.status !== 401) return false;
  // Only a request that carried a token can have an expired one — a guest's
  // 401 is not a session ending. `/auth/*` is the login flow itself, where a
  // 401 means a wrong PIN or code, not a dead session.
  const sentToken = !!err.config?.headers?.Authorization;
  const url: string = err.config?.url ?? '';
  return sentToken && !url.startsWith('/auth/') && url !== '/logout';
};

api.interceptors.response.use(
  res => res,
  async err => {
    if (isSessionExpired(err) && !signingOut) {
      signingOut = true;
      try {
        await AsyncStorage.removeItem('auth_token');
        onUnauthorized?.();
      } finally {
        // Several requests usually fail together; sign out once for all.
        setTimeout(() => {
          signingOut = false;
        }, 2000);
      }
    }

    const message =
      normaliseError(err.response?.data) ||
      err.message ||
      'Something went wrong';
    // Keep the status and body: a 422's `errors` bag is shown field by field.
    const error: Error & { status?: number; data?: any } = new Error(message);
    error.status = err.response?.status;
    error.data = err.response?.data;
    return Promise.reject(error);
  },
);

export default api;
