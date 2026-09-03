import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://v2.m-eyewear.com/api/v1';

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

api.interceptors.response.use(
  res => res,
  err => {
    const message =
      normaliseError(err.response?.data) ||
      err.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  },
);

export default api;
