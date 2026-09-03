import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

type Props = {
  visible: boolean;
  /** Declined, or dismissed with the hardware back button. */
  onDecline: () => void;
  onAccept: () => void;
};

const POINT_KEYS = [
  'EyeTestDisclaimerPoint1',
  'EyeTestDisclaimerPoint2',
  'EyeTestDisclaimerPoint3',
  'EyeTestDisclaimerPoint4',
];

/**
 * Gate in front of the digital eye test.
 *
 * This is a consent gate rather than a notice, so it cannot be dismissed by
 * tapping the backdrop — the only ways out are Continue (with the box ticked)
 * or Cancel. The checkbox resets every time the modal opens: a prior session's
 * consent must not carry silently into a new one.
 */
const EyeTestDisclaimerModal: React.FC<Props> = ({
  visible,
  onDecline,
  onAccept,
}) => {
  const { t } = useTranslation();

  const [shouldRender, setShouldRender] = useState(visible);
  const [agreed, setAgreed] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setAgreed(false);

      scaleAnim.setValue(0.94);
      opacityAnim.setValue(0);
      translateYAnim.setValue(16);

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 16,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible, scaleAnim, opacityAnim, translateYAnim]);

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onDecline}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.modalBox,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: translateYAnim },
                ],
              },
            ]}
          >
            <View style={styles.topAccent} />

            <View style={styles.iconOuter}>
              <View style={styles.iconInner}>
                <Ionicons name="alert-circle-outline" size={30} color="#C2410C" />
              </View>
            </View>

            <AppText style={styles.title}>
              {t('EyeTestDisclaimerTitle')}
            </AppText>

            <ScrollView
              style={styles.body}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <AppText style={styles.message}>
                {t('EyeTestDisclaimerBody')}
              </AppText>

              {POINT_KEYS.map(key => (
                <View key={key} style={styles.pointRow}>
                  <View style={styles.bullet} />
                  <AppText style={styles.pointText}>{t(key)}</AppText>
                </View>
              ))}

              <View style={styles.warningBox}>
                <Ionicons
                  name="medkit-outline"
                  size={20}
                  color="#C2410C"
                />
                <AppText style={styles.warningText}>
                  {t('EyeTestDisclaimerWarning')}
                </AppText>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.agreeRow}
              onPress={() => setAgreed(a => !a)}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                {agreed && (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                )}
              </View>
              <AppText style={styles.agreeText}>{t('EyeTestAgree')}</AppText>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.85}
                onPress={onDecline}
              >
                <AppText style={styles.cancelText}>{t('commonCancel')}</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acceptButton, !agreed && styles.acceptDisabled]}
                activeOpacity={0.85}
                onPress={onAccept}
                disabled={!agreed}
              >
                <AppText style={styles.acceptText}>{t('Continue')}</AppText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default EyeTestDisclaimerModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20, 15, 12, 0.42)' },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: 30,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  topAccent: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E8D8CF',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  iconOuter: { alignItems: 'center', marginBottom: Spacing.md },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDEBE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.black,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  // Capped so a long translation scrolls instead of pushing the consent row
  // and buttons off the screen.
  body: { maxHeight: 260 },
  message: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  pointText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#FDEBE3',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#9A3412',
    lineHeight: 20,
    fontWeight: '500',
  },

  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  agreeText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray700,
    fontWeight: '600',
    lineHeight: 19,
  },

  buttonRow: { flexDirection: 'row', gap: Spacing.sm },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.gray600,
  },
  acceptButton: {
    flex: 1.4,
    paddingVertical: 15,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  acceptDisabled: { opacity: 0.45 },
  acceptText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
