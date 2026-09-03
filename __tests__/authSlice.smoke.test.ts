import reducer, {
  verifyOtpThunk,
  requestOtpThunk,
  logoutThunk,
} from '../src/store/slices/authSlice';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe('authSlice', () => {
  it('builds its reducer (addCase must precede addMatcher)', () => {
    expect(() => reducer(undefined, { type: '@@INIT' } as any)).not.toThrow();
  });

  it('surfaces the API message when verify-otp is rejected', () => {
    const state = reducer(undefined, {
      type: verifyOtpThunk.rejected.type,
      payload: 'Invalid or expired OTP',
    } as any);

    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid or expired OTP');
  });

  it('clears loading on request-otp pending -> rejected', () => {
    let state = reducer(undefined, { type: requestOtpThunk.pending.type } as any);
    expect(state.loading).toBe(true);

    state = reducer(state, {
      type: requestOtpThunk.rejected.type,
      payload: 'Too many attempts',
    } as any);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Too many attempts');
  });

  it('still handles logout after the matcher block', () => {
    const state = reducer(
      { user: null, token: 'abc', isAuthenticated: true, loading: false, error: null } as any,
      { type: logoutThunk.fulfilled.type } as any,
    );
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });
});
