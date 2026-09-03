import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const TOKEN_KEY = 'auth_token';
/** Phone numbers known to have finished PIN setup on this device. */
const KNOWN_PHONES_KEY = 'known_phones';

export interface LoginPayload {
  phone_number: string;
  pin: string;
}

export interface RequestOtpPayload {
  phone_number: string;
}

export interface VerifyOtpPayload {
  phone_number: string;
  otp_code: string;
}

export interface SetPinPayload {
  phone_number: string;
  pin: string;
}

export interface CustomerData {
  id: number;
  customer_name: string;
  customer_type: string;
  phone_number: string;
  age: number | null;
  email: string | null;
  loyalty_points: number;
  loyalty_total_points: number;
  loyalty_tier_id: number;
  is_member: boolean;
  is_lead: boolean;
  gender: string | null;
  branch_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LoginApiResponse {
  message: string;
  token: string;
  customer: CustomerData;
}

/** OTP endpoints return a message and, once verified, usually a token. */
export interface OtpApiResponse {
  message?: string;
  token?: string;
  access_token?: string;
  customer?: CustomerData;
  /** Some backends echo the code back in non-production environments. */
  otp_code?: string;
}

/**
 * The auth endpoints are not consistent about where the bearer token lives,
 * so read both spellings and persist whichever turns up.
 */
function readToken(data: OtpApiResponse | LoginApiResponse): string | null {
  const token = (data as OtpApiResponse).token ?? (data as OtpApiResponse).access_token;
  return typeof token === 'string' && token ? token : null;
}

async function persistToken(data: OtpApiResponse | LoginApiResponse): Promise<void> {
  const token = readToken(data);
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
}

/** Digits only — the API stores local numbers such as "016622357". */
export function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export const authService = {
  /** Step 1 — send an SMS code to the number. */
  async requestOtp(payload: RequestOtpPayload): Promise<OtpApiResponse> {
    const { data } = await api.post<OtpApiResponse>('/auth/request-otp', {
      phone_number: normalisePhone(payload.phone_number),
    });
    return data;
  },

  /** Step 2 — exchange the SMS code for a session. */
  async verifyOtp(payload: VerifyOtpPayload): Promise<OtpApiResponse> {
    const { data } = await api.post<OtpApiResponse>('/auth/verify-otp', {
      phone_number: normalisePhone(payload.phone_number),
      otp_code: payload.otp_code,
    });
    await persistToken(data);
    return data;
  },

  /** Step 3 — choose the PIN used for every later sign-in. */
  async setPin(payload: SetPinPayload): Promise<OtpApiResponse> {
    const { data } = await api.post<OtpApiResponse>('/auth/set-pin', {
      phone_number: normalisePhone(payload.phone_number),
      pin: payload.pin,
    });
    await persistToken(data);
    await authService.rememberPhone(payload.phone_number);
    return data;
  },

  /** Returning users sign in with phone + PIN. */
  async login(payload: LoginPayload): Promise<LoginApiResponse> {
    const { data } = await api.post<LoginApiResponse>('/auth/login-pin', {
      phone_number: normalisePhone(payload.phone_number),
      pin: payload.pin,
    });
    await persistToken(data);
    await authService.rememberPhone(payload.phone_number);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  async getProfile(): Promise<CustomerData> {
    const { data } = await api.get('/user');
    return data;
  },

  // ─── Remembered numbers ────────────────────────────────────────────────────
  // The login form always accepts a phone number and PIN, so this is no longer
  // a gate — it just remembers who has signed in on this device so the number
  // can be prefilled next time.

  async knownPhones(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(KNOWN_PHONES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(p => typeof p === 'string') : [];
    } catch {
      return [];
    }
  },

  /** The number that signed in here most recently, for prefilling the form. */
  async lastPhone(): Promise<string | null> {
    const phones = await authService.knownPhones();
    return phones.length ? phones[phones.length - 1] : null;
  },

  async rememberPhone(phone: string): Promise<void> {
    const target = normalisePhone(phone);
    if (!target) return;
    const phones = await authService.knownPhones();
    // Move an already-known number to the end so the list stays in
    // most-recent-last order for `lastPhone`.
    const next = [...phones.filter(p => p !== target), target];
    await AsyncStorage.setItem(KNOWN_PHONES_KEY, JSON.stringify(next));
  },

};
