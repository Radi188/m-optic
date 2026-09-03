import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { authService } from '../../services/authService';
import type {
  LoginPayload,
  RequestOtpPayload,
  VerifyOtpPayload,
  SetPinPayload,
} from '../../services/authService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'staff' | 'customer';
  gender?: string;
  branchId?: string;
  customerType?: string;
  loyaltyPoints: number;
  loyaltyTotalPoints: number;
  loyaltyTierId: number;
  isMember: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// ─── Async thunks ─────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? err.message ?? 'Login failed');
    }
  },
);

export const requestOtpThunk = createAsyncThunk(
  'auth/requestOtp',
  async (payload: RequestOtpPayload, { rejectWithValue }) => {
    try {
      return await authService.requestOtp(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Could not send the code');
    }
  },
);

export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (payload: VerifyOtpPayload, { rejectWithValue }) => {
    try {
      return await authService.verifyOtp(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Invalid code');
    }
  },
);

export const setPinThunk = createAsyncThunk(
  'auth/setPin',
  async (payload: SetPinPayload, { rejectWithValue }) => {
    try {
      return await authService.setPin(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Could not set the PIN');
    }
  },
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Logout failed');
    }
  },
);

export const fetchProfileThunk = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getProfile();
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to fetch profile');
    }
  },
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapCustomerToUser(c: import('../../services/authService').CustomerData): User {
  return {
    id: String(c.id),
    name: c.customer_name,
    email: c.email ?? '',
    phone: c.phone_number,
    role: 'customer',
    gender: c.gender ?? undefined,
    branchId: c.branch_id,
    customerType: c.customer_type,
    loyaltyPoints: c.loyalty_points,
    loyaltyTotalPoints: c.loyalty_total_points,
    loyaltyTierId: c.loyalty_tier_id,
    isMember: c.is_member,
  };
}

const OTP_FLOW_THUNKS = ['auth/requestOtp', 'auth/verifyOtp', 'auth/setPin'];

function otpFlowMatcher(action: any, phase: string): boolean {
  return OTP_FLOW_THUNKS.some(name => action.type === `${name}/${phase}`);
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearUser(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: builder => {
    // NOTE: every addCase must come before the addMatcher block below —
    // RTK throws if that order is reversed.

    // ── Login ────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.user = mapCustomerToUser(action.payload.customer);
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'Login failed';
      });

    // ── Logout ───────────────────────────────────────────────────
    builder.addCase(logoutThunk.fulfilled, state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // ── Profile ──────────────────────────────────────────────────
    builder.addCase(fetchProfileThunk.fulfilled, (state, action) => {
      state.user = mapCustomerToUser(action.payload);
    });

    // ── OTP request / verify / set-pin ───────────────────────────
    // These share the one loading + error pair the screens already read.
    builder
      .addMatcher(
        action => otpFlowMatcher(action, 'pending'),
        state => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        action => otpFlowMatcher(action, 'rejected'),
        (state, action: any) => {
          state.loading = false;
          state.error =
            (action.payload as string) ??
            action.error?.message ??
            'Something went wrong';
        },
      )
      .addMatcher(
        action => otpFlowMatcher(action, 'fulfilled'),
        (state, action: any) => {
          state.loading = false;
          state.error = null;

          // request-otp returns nothing to sign in with; verify-otp and
          // set-pin hand back a token (and usually the customer) once the
          // number is confirmed.
          const payload = action.payload ?? {};
          const token = payload.token ?? payload.access_token ?? null;
          if (token) state.token = token;
          if (payload.customer) state.user = mapCustomerToUser(payload.customer);
          if (token && state.user) state.isAuthenticated = true;
        },
      );
  },
});

export const { setUser, updateUser, clearUser, setLoading, setError } = authSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser            = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading     = (state: RootState) => state.auth.loading;
export const selectAuthError       = (state: RootState) => state.auth.error;
export const selectUserInitials    = (state: RootState) => {
  const name = state.auth.user?.name ?? '';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

export default authSlice.reducer;
