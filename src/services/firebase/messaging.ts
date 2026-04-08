import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import type { AppDispatch } from '../../store';
import {
  setFcmToken,
  setPermissionGranted,
  addNotification,
} from '../../store/slices/notificationsSlice';
import type { NotificationType } from '../../store/slices/notificationsSlice';

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(dispatch: AppDispatch): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    dispatch(setPermissionGranted(granted));
    return granted;
  } catch {
    dispatch(setPermissionGranted(false));
    return false;
  }
}

// ─── Token ────────────────────────────────────────────────────────────────────

export async function registerFcmToken(dispatch: AppDispatch): Promise<string | null> {
  try {
    // On iOS, APNS token must be registered before FCM token can be fetched
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    dispatch(setFcmToken(token));
    console.log('[FCM] Token:', token);
    return token;
  } catch (err) {
    console.warn('[FCM] Failed to get token:', err);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveType(data?: Record<string, string>): NotificationType {
  const t = data?.type as NotificationType | undefined;
  return t && ['info', 'success', 'warning', 'error'].includes(t) ? t : 'info';
}

// ─── Foreground Listener ─────────────────────────────────────────────────────

export function setupForegroundNotificationListener(dispatch: AppDispatch): () => void {
  try {
    return messaging().onMessage(async remoteMessage => {
      const title = remoteMessage.notification?.title ?? 'Notification';
      const message = remoteMessage.notification?.body ?? '';
      const data = remoteMessage.data as Record<string, string> | undefined;

      dispatch(
        addNotification({
          title,
          message,
          type: resolveType(data),
          data,
        }),
      );

      Alert.alert(title, message);
    });
  } catch (err) {
    console.warn('[FCM] Foreground listener setup failed (Firebase not ready?):', err);
    return () => {};
  }
}

// ─── Background / Quit Handler ────────────────────────────────────────────────
// This must be called outside of React components (top of index.js)

export function setupBackgroundMessageHandler(): void {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM] Background message:', remoteMessage);
    // Background messages are shown as system notifications automatically.
    // Store them if needed via a headless task or on next app open.
  });
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

export function setupTokenRefreshListener(dispatch: AppDispatch): () => void {
  return messaging().onTokenRefresh(token => {
    dispatch(setFcmToken(token));
    console.log('[FCM] Token refreshed:', token);
    // TODO: Send updated token to your backend here
  });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
// Call this once when the app mounts (inside App.tsx useEffect)

export async function bootstrapFirebaseMessaging(dispatch: AppDispatch): Promise<void> {
  try {
    const granted = await requestNotificationPermission(dispatch);
    if (!granted) return;

    await registerFcmToken(dispatch);
    setupTokenRefreshListener(dispatch);
  } catch (err) {
    // Firebase native module not ready — usually means the app needs a clean
    // Xcode rebuild after adding @react-native-firebase pods.
    console.warn('[FCM] Bootstrap failed (Firebase not initialized):', err);
  }
}
