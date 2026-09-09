// controller/historyController.ts
import api from '../services/api';
import { normaliseHistory } from '../types/history';
import type { History, HistoryResponse } from '../types/history';

export const historyController = {
  async getHistory(): Promise<History> {
    const response = await api.get<HistoryResponse>('/profile/history');
    return normaliseHistory(response.data);
  },
};
