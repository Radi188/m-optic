import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  phone?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// ─── Initial State ────────────────────────────────────────────────────────────

// Pre-seeded as authenticated store owner for development
const initialState: AuthState = {
  user: {
    id: 'usr_001',
    name: 'M-Optic Admin',
    email: 'admin@moptic.com',
    role: 'owner',
    phone: '',
  },
  isAuthenticated: true,
  loading: false,
  error: null,
};

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
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearUser(state) {
      state.user = null;
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
});

export const { setUser, updateUser, clearUser, setLoading, setError } = authSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectUserInitials = (state: RootState) => {
  const name = state.auth.user?.name ?? '';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default authSlice.reducer;
