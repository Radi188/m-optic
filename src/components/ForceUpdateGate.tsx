import React, { useCallback, useEffect, useState } from 'react';
import { AppState, BackHandler, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import AppText from './AppText';
import { BorderRadius, Colors, FontSize, Spacing } from '../theme';
import {
  fetchUpdatePolicy,
  installedVersion,
  mustUpdate,
  openStore,
  type UpdatePolicy,
} from '../services/appUpdate';
import { posthog } from '../config/posthog';

/**
 * Blocks the app behind an "Update required" screen when the installed
 * version is older than the server's minimum.
 *
 * The app renders straight away and the check runs in the background, so
 * launch is never slowed and a failed check never blocks anyone. It runs again
 * whenever the app comes back to the foreground, so a minimum raised while the
 * app sat in the background still applies.
 */
const ForceUpdateGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<UpdatePolicy | null>(null);
  const version = installedVersion();
  const blocked = mustUpdate(version, policy);

  const check = useCallback(async () => {
    const next = await fetchUpdatePolicy();
    // Keep the last known policy if a later check fails: a flaky network must
    // not unlock a version that has already been told to update.
    if (next) setPolicy(next);
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (!blocked) return;
    posthog?.capture('force_update_shown', { installed_version: version, min_version: policy?.minVersion ?? '' });
    // Android back would otherwise just close the modal.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [blocked, version, policy?.minVersion]);

  return (
    <>
      {children}
      <Modal visible={blocked} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={styles.root}>
          <View style={styles.icon}>
            <Ionicons name="arrow-up-circle-outline" size={44} color={Colors.primary} />
          </View>
          <AppText style={styles.title}>{t('ForceUpdate.title')}</AppText>
          <AppText style={styles.body}>{t('ForceUpdate.body')}</AppText>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => {
              posthog?.capture('force_update_tapped', { installed_version: version });
              openStore(policy?.storeUrl);
            }}
          >
            <AppText style={styles.buttonText}>{t('ForceUpdate.button')}</AppText>
          </TouchableOpacity>
          <AppText style={styles.version}>
            {t('ForceUpdate.version', { current: version, required: policy?.minVersion ?? '' })}
          </AppText>
        </View>
      </Modal>
    </>
  );
};

export default ForceUpdateGate;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
  },
  icon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.black, textAlign: 'center' },
  body: { fontSize: FontSize.md, lineHeight: 22, color: Colors.gray600, textAlign: 'center' },
  button: {
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  version: { fontSize: FontSize.xs, color: Colors.gray400 },
});
