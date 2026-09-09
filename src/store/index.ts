import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import {
  persistStore,
  persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import glassReducer from './slices/glassSlice';
import authReducer from './slices/authSlice';
import notificationsReducer from './slices/notificationsSlice';

// ─── Persist config ───────────────────────────────────────────────────────────

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'token', 'isAuthenticated'],
};

// Version 1 drops the seeded demo frames. Emptying the initial state is not
// enough on its own: installs that ran an earlier build already have those
// eighteen rows in AsyncStorage, and redux-persist would rehydrate them over
// the empty list.
const glassPersistConfig = {
  key: 'glass',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['items'],
  migrate: async (state: any) =>
    state ? { ...state, items: [] } : state,
};

// ─── Root reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  auth:          persistReducer(authPersistConfig, authReducer),
  glass:         persistReducer(glassPersistConfig, glassReducer),
  notifications: notificationsReducer,
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// ─── Types ────────────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ─── Typed hooks ──────────────────────────────────────────────────────────────

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
