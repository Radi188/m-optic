import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import AppText from '../../../components/AppText';
import { BorderRadius, Colors, FontSize, Spacing } from '../../../theme';

/**
 * Camera permission for the try-on, asked only once the wearer has opened it.
 *
 *   checking  → working out whether we may already use the camera
 *   rationale → our explanation, with an "Enable camera" button
 *   granted   → the engine may start
 *   blocked   → the system will not ask again; only Settings can fix it
 *
 * Android has a real runtime permission to check and request. iOS has no API
 * for it without another native module: the system prompt appears when the
 * WebView first asks for the camera, so iOS shows our rationale once
 * (remembered) and learns about a refusal from the engine instead.
 */
export type CameraPermission = 'checking' | 'rationale' | 'granted' | 'blocked';

const IOS_RATIONALE_SEEN = 'tryon.cameraRationaleSeen';

export function useCameraPermission() {
  const [state, setState] = useState<CameraPermission>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: CameraPermission = 'rationale';
      try {
        if (Platform.OS === 'android') {
          const ok = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
          next = ok ? 'granted' : 'rationale';
        } else {
          next = (await AsyncStorage.getItem(IOS_RATIONALE_SEEN)) ? 'granted' : 'rationale';
        }
      } catch {
        next = 'rationale';
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (result === PermissionsAndroid.RESULTS.GRANTED) setState('granted');
      else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) setState('blocked');
      else setState('rationale');
      return;
    }
    await AsyncStorage.setItem(IOS_RATIONALE_SEEN, '1').catch(() => {});
    setState('granted');
  }, []);

  /** The engine reported the camera was refused (iOS learns it this way). */
  const markBlocked = useCallback(() => setState('blocked'), []);

  return { state, request, markBlocked };
}

type Props = {
  state: Exclude<CameraPermission, 'granted'>;
  onAllow: () => void;
  onClose: () => void;
};

/** Full-screen rationale / blocked card, on the dark try-on backdrop. */
const PermissionGate: React.FC<Props> = ({ state, onAllow, onClose }) => {
  const { t } = useTranslation();

  if (state === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  const blocked = state === 'blocked';
  return (
    <View style={styles.center}>
      <View style={styles.icon}>
        <Ionicons name={blocked ? 'videocam-off-outline' : 'videocam-outline'} size={34} color={Colors.white} />
      </View>
      <AppText style={styles.title}>
        {blocked ? t('TryOn.camera_denied_title') : t('TryOn.camera_title')}
      </AppText>
      <AppText style={styles.body}>
        {blocked ? t('TryOn.camera_denied_body') : t('TryOn.camera_body')}
      </AppText>
      <TouchableOpacity
        style={styles.primary}
        activeOpacity={0.85}
        onPress={blocked ? () => Linking.openSettings().catch(() => {}) : onAllow}
      >
        <AppText style={styles.primaryText}>
          {blocked ? t('TryOn.open_settings') : t('TryOn.camera_allow')}
        </AppText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} activeOpacity={0.7} onPress={onClose}>
        <AppText style={styles.secondaryText}>{t('TryOn.photo_discard')}</AppText>
      </TouchableOpacity>
    </View>
  );
};

export default PermissionGate;

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: '#0d0d0f',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  primary: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.black },
  secondary: { paddingVertical: Spacing.sm },
  secondaryText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
});
