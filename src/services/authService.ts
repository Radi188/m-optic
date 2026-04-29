import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface LoginPayload {
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

export const authService = {
  async login(payload: LoginPayload): Promise<LoginApiResponse> {
    const { data } = await api.post<LoginApiResponse>('/auth/login-pin', payload);
    await AsyncStorage.setItem('auth_token', data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } finally {
      await AsyncStorage.removeItem('auth_token');
    }
  },

  async getProfile(): Promise<CustomerData> {
    const { data } = await api.get('/user');
    return data;
  },
};
