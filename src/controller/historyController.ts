// controller/historyController.ts
import api from '../services/api';
import { normaliseHistory } from '../types/history';
import type { History, HistoryResponse } from '../types/history';
import { MOCK_HISTORY } from '../mocks/historyMock';

/**
 * TEMPORARY — serve sample rows instead of calling the API, so the History UI
 * can be reviewed before the endpoint returns data.
 *
 * Flip to false (and delete src/mocks/historyMock.ts plus this block) to go
 * back to the live endpoint.
 */
const USE_MOCK_HISTORY = true;

/** Long enough to see the loading skeleton the screen renders. */
const MOCK_DELAY_MS = 900;

export const historyController = {
  async getHistory(): Promise<History> {
    if (USE_MOCK_HISTORY) {
      await new Promise<void>(resolve =>
        setTimeout(() => resolve(), MOCK_DELAY_MS),
      );
      return normaliseHistory(MOCK_HISTORY);
    }

    const response = await api.get<HistoryResponse>('/profile/history');
    return normaliseHistory(response.data);
  },
};
