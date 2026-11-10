/**
 * Save / share the try-on photo card.
 *
 * Saving goes through expo-media-library's NATIVE module directly: its JS
 * entry imports the `expo` package, which expects Expo's Metro config (this
 * app bundles with React Native's own). The native calls are the same ones its
 * legacy API makes.
 */

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import * as Sharing from 'expo-sharing';

interface MediaLibraryNative {
  requestPermissionsAsync(writeOnly: boolean, granular?: string[]): Promise<{ granted: boolean; canAskAgain?: boolean }>;
  saveToLibraryAsync(localUri: string): Promise<void>;
}

let mediaLibrary: MediaLibraryNative | null = null;
const native = () => (mediaLibrary ??= requireNativeModule<MediaLibraryNative>('ExpoMediaLibrary'));

export type SaveResult = 'saved' | 'denied';

/** Save the card (a file:// JPEG) to the photo library at full resolution. */
export async function savePhotoToLibrary(uri: string): Promise<SaveResult> {
  const lib = native();
  const permission =
    Platform.OS === 'android'
      ? await lib.requestPermissionsAsync(true, ['photo'])
      : await lib.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  await lib.saveToLibraryAsync(uri);
  return 'saved';
}

/** Open the native share sheet with the card image. */
export async function sharePhoto(uri: string, dialogTitle?: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle });
}
