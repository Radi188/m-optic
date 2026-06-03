import api from '../services/api';
import { PointResponse, TransactionPaginationResponse } from '../types/point';

export const pointController = {
  async getPoint(): Promise<PointResponse> {
    const response = await api.get<PointResponse>('/profile/points');
    return response.data;
  },
  async getPointTransaction(): Promise<TransactionPaginationResponse> {
    const response = await api.get<TransactionPaginationResponse>('/profile/transactions');
    return response.data;
  } 
};