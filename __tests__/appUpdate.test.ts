jest.mock('react-native-device-info', () => ({ getVersion: () => '1.5' }));
jest.mock('../src/services/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
import api from '../src/services/api';
import { compareVersions, fetchUpdatePolicy, mustUpdate } from '../src/services/appUpdate';

describe('compareVersions', () => {
  it('compares numerically, part by part', () => {
    expect(compareVersions('1.10', '1.9')).toBe(1);
    expect(compareVersions('1.5', '1.5.0')).toBe(0);
    expect(compareVersions('1.5', '1.6')).toBe(-1);
    expect(compareVersions('2.0.1', '2.0.0')).toBe(1);
  });
});

describe('mustUpdate', () => {
  it('blocks only versions below the minimum', () => {
    expect(mustUpdate('1.5', { minVersion: '1.6', storeUrl: null })).toBe(true);
    expect(mustUpdate('1.6', { minVersion: '1.6', storeUrl: null })).toBe(false);
    expect(mustUpdate('1.7', { minVersion: '1.6', storeUrl: null })).toBe(false);
  });

  it('never blocks without a usable policy (fails open)', () => {
    expect(mustUpdate('1.0', null)).toBe(false);
    expect(mustUpdate('1.0', { minVersion: null, storeUrl: null })).toBe(false);
    expect(mustUpdate('1.0', { minVersion: 'abc', storeUrl: null })).toBe(false);
  });
});

describe('fetchUpdatePolicy', () => {
  it('reads min_version and store_url', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { data: { min_version: '1.6', store_url: 'https://x' } } });
    await expect(fetchUpdatePolicy()).resolves.toEqual({ minVersion: '1.6', storeUrl: 'https://x' });
  });

  it('returns null when the endpoint fails, so nobody is locked out', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('404'));
    await expect(fetchUpdatePolicy()).resolves.toBeNull();
  });
});
