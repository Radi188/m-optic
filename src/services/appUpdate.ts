import { Linking, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import api from './api';

/**
 * Forced update — the backend decides the oldest app version that may still
 * be used. See app-version-api.md for the endpoint contract.
 *
 * Fails OPEN: if the endpoint is missing, slow or broken, the app is usable.
 * A server problem must never lock every customer out of the app.
 */

/** App Store id of the live app (looked up from bundle id app.moptic.cross). */
const APP_STORE_ID = '6810026031';
const ANDROID_PACKAGE = 'cross.moptic.app';

export const DEFAULT_STORE_URL = Platform.select({
  ios: `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`,
  default: `market://details?id=${ANDROID_PACKAGE}`,
});
const WEB_STORE_URL = Platform.select({
  ios: `https://apps.apple.com/app/id${APP_STORE_ID}`,
  default: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
});

export interface UpdatePolicy {
  /** Versions below this must update before using the app. */
  minVersion: string | null;
  /** Where the Update button goes; the store page by default. */
  storeUrl: string | null;
}

/** "1.10.2" vs "1.9" → 1. Missing parts count as 0; non-numeric parts as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** True when the installed version is older than the required minimum. */
export function mustUpdate(installed: string, policy: UpdatePolicy | null): boolean {
  if (!policy?.minVersion || !/\d/.test(policy.minVersion)) return false;
  return compareVersions(installed, policy.minVersion) < 0;
}

export function installedVersion(): string {
  return DeviceInfo.getVersion();
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The server's policy for this platform, or null when it can't be read. */
export async function fetchUpdatePolicy(): Promise<UpdatePolicy | null> {
  try {
    const res = await api.get('/app-version', {
      params: { platform: Platform.OS },
      timeout: 8000,
    });
    const d = res.data?.data ?? res.data ?? {};
    return { minVersion: str(d.min_version), storeUrl: str(d.store_url) };
  } catch {
    return null; // fail open
  }
}

/** Opens the store page: the server's link, else the native store, else the web page. */
export async function openStore(storeUrl?: string | null): Promise<void> {
  for (const url of [storeUrl, DEFAULT_STORE_URL, WEB_STORE_URL]) {
    if (!url) continue;
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try the next one
    }
  }
}
