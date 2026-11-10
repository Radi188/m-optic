import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { useCameraPermission as useVisionCameraPermission } from 'react-native-vision-camera';

import AppText from '../../../components/AppText';
import { BorderRadius, Colors, FontSize, Spacing } from '../../../theme';

/**
 * Camera permission for the try-on, asked only once the wearer has opened it
 * (i.e. tapped "Try On"):
 *
 *   checking  → a request is in flight
 *   rationale → our explanation, with an "Enable camera" button that triggers
 *               the system prompt
 *   granted   → the camera may start
 *   blocked   → the system will not ask again; only Settings can fix it
 *
 * Status comes from VisionCamera on both platforms and is re-read when the app
 * returns to the foreground (e.g. from Settings).
 */
export type CameraPermission = 'checking' | 'rationale' | 'granted' | 'blocked';

export function useCameraPermission() {
  const { status, requestPermission } = useVisionCameraPermission();
  const [requesting, setRequesting] = useState(false);

  const state: CameraPermission = requesting
    ? 'checking'
    : status === 'authorized'
    ? 'granted'
    : status === 'not-determined'
    ? 'rationale'
    : 'blocked';

  const request = useCallback(async () => {
    setRequesting(true);
    try {
      await requestPermission();
    } finally {
      setRequesting(false);
    }
  }, [requestPermission]);

  return { state, request };
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
