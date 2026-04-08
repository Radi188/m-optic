import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: number; // Unix ms
  data?: Record<string, string>; // Extra payload from FCM
}

interface NotificationsState {
  items: AppNotification[];
  fcmToken: string | null;
  permissionGranted: boolean;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: NotificationsState = {
  items: [
    {
      id: 'n1',
      title: 'New shipment',
      message: 'Your order #1042 has been dispatched.',
      type: 'info',
      read: false,
      timestamp: Date.now() - 1000 * 60 * 30, // 30 min ago
    },
    {
      id: 'n2',
      title: 'Low stock alert',
      message: 'Oakley frame (black) has only 2 left.',
      type: 'warning',
      read: false,
      timestamp: Date.now() - 1000 * 60 * 120, // 2 h ago
    },
    {
      id: 'n3',
      title: 'Sale completed',
      message: '3 glasses sold successfully today.',
      type: 'success',
      read: true,
      timestamp: Date.now() - 1000 * 60 * 60 * 5, // 5 h ago
    },
  ],
  fcmToken: null,
  permissionGranted: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Omit<AppNotification, 'id' | 'read' | 'timestamp'>>) {
      state.items.unshift({
        ...action.payload,
        id: `n_${Date.now()}`,
        read: false,
        timestamp: Date.now(),
      });
    },
    markAsRead(state, action: PayloadAction<string>) {
      const n = state.items.find(i => i.id === action.payload);
      if (n) n.read = true;
    },
    markAllRead(state) {
      state.items.forEach(n => { n.read = true; });
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearAll(state) {
      state.items = [];
    },
    setFcmToken(state, action: PayloadAction<string>) {
      state.fcmToken = action.payload;
    },
    setPermissionGranted(state, action: PayloadAction<boolean>) {
      state.permissionGranted = action.payload;
    },
  },
});

export const {
  addNotification, markAsRead, markAllRead,
  removeNotification, clearAll, setFcmToken, setPermissionGranted,
} = notificationsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectNotifications = (state: RootState) => state.notifications.items;
export const selectFcmToken = (state: RootState) => state.notifications.fcmToken;
export const selectPermissionGranted = (state: RootState) => state.notifications.permissionGranted;

export const selectUnreadCount = createSelector(
  selectNotifications,
  items => items.filter(n => !n.read).length,
);

export const selectUnreadNotifications = createSelector(
  selectNotifications,
  items => items.filter(n => !n.read),
);

export default notificationsSlice.reducer;
