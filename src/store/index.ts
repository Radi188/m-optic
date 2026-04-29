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

const glassPersistConfig = {
  key: 'glass',
  storage: AsyncStorage,
  whitelist: ['items'],
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
