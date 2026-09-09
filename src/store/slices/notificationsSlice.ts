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

// Empty until FCM delivers something: the seeded "New shipment" / "Low stock"
// / "Sale completed" rows were placeholders and counted towards the unread
// badge on the profile header.
const initialState: NotificationsState = {
  items: [],
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
