import api from '../services/api';
import { HomeResponse } from '../types/home';

export const homeController = {
  async getHome(): Promise<HomeResponse['data']> {
    const response = await api.get<HomeResponse>('/homepage');
    return response.data.data;
  },
};