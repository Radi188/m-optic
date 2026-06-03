import api from '../services/api';
import { CustomerProfileResponse } from '../types/user';

export const userController = {
  async getProfile(): Promise<CustomerProfileResponse> {
    const response = await api.get<CustomerProfileResponse>('/profile');
    return response.data;
  },
};