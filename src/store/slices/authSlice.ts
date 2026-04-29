import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { authService } from '../../services/authService';
import type { LoginPayload } from '../../services/authService';

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
        state.error = action.payload as string;
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
