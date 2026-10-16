import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '../src/services/api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

const getItem = AsyncStorage.getItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

/** Answers every request with `status` and `data`, without a network. */
const respondWith = (status: number, data: any) => {
  api.defaults.adapter = async config =>
    Promise.reject(
      Object.assign(new Error(`Request failed with status code ${status}`), {
        config,
        response: { status, data, config, headers: {} },
      }),
    );
};

describe('api 401 handling', () => {
  const onUnauthorized = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    onUnauthorized.mockReset();
    removeItem.mockClear();
    setUnauthorizedHandler(onUnauthorized);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('signs out when a signed-in request gets 401', async () => {
    getItem.mockResolvedValue('token-123');
    respondWith(401, { message: 'Unauthenticated.' });

    await expect(api.get('/profile')).rejects.toThrow('Unauthenticated.');
    expect(removeItem).toHaveBeenCalledWith('auth_token');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('ignores a 401 from the login flow (wrong PIN is not an expired session)', async () => {
    getItem.mockResolvedValue('token-123');
    respondWith(401, { message: 'Invalid PIN' });

    await expect(api.post('/auth/login-pin', {})).rejects.toThrow(
      'Invalid PIN',
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('ignores a 401 for a guest with no token', async () => {
    getItem.mockResolvedValue(null);
    respondWith(401, { message: 'Unauthenticated.' });

    await expect(api.get('/profile')).rejects.toThrow();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('keeps the 422 errors bag on the rejected error', async () => {
    getItem.mockResolvedValue('token-123');
    const errors = { email: ['The email must be a valid email address.'] };
    respondWith(422, { errors });

    const err: any = await api.put('/profile', {}).catch(e => e);
    expect(err.status).toBe(422);
    expect(err.data.errors).toEqual(errors);
    expect(err.message).toBe('The email must be a valid email address.');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
