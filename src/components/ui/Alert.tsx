import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../../theme';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

const ALERT_CONFIG: Record<
  AlertType,
  { bg: string; border: string; text: string; icon: string; glow: string }
> = {
  success: {
    bg:     'rgba(45,  189, 126, 0.12)',
    border: 'rgba(45,  189, 126, 0.55)',
    text:   Colors.success,
    icon:   '✓',
    glow:   'rgba(45,  189, 126, 0.18)',
  },
  error: {
    bg:     'rgba(240, 82,  82,  0.12)',
    border: 'rgba(240, 82,  82,  0.55)',
    text:   Colors.error,
    icon:   '✕',
    glow:   'rgba(240, 82,  82,  0.18)',
  },
  warning: {
    bg:     'rgba(247, 164, 64,  0.12)',
    border: 'rgba(247, 164, 64,  0.55)',
    text:   Colors.warning,
    icon:   '!',
    glow:   'rgba(247, 164, 64,  0.18)',
  },
  info: {
    bg:     'rgba(77,  168, 218, 0.12)',
    border: 'rgba(77,  168, 218, 0.55)',
    text:   Colors.info,
    icon:   'i',
    glow:   'rgba(77,  168, 218, 0.18)',
  },
};

// ─── Inline Alert Banner ───────────────────────────────────────────────────

interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  style?: ViewStyle;
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  style,
}) => {
  const cfg = ALERT_CONFIG[type];

  return (
    <View
      style={[
        styles.alert,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
        style,
      ]}
    >
      {/* Glass highlight */}
      <View style={styles.highlight} pointerEvents="none" />

      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.text }]} />

      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: cfg.text + '25', borderColor: cfg.border }]}>
        <Text style={[styles.iconText, { color: cfg.text }]}>{cfg.icon}</Text>
      </View>

      <View style={styles.alertContent}>
        {title && <Text style={[styles.alertTitle, { color: cfg.text }]}>{title}</Text>}
        <Text style={[styles.alertMessage, { color: cfg.text }]}>{message}</Text>
      </View>

      {dismissible && (
        <TouchableOpacity onPress={onDismiss} hitSlop={8} style={styles.dismissBtn}>
          <View style={[styles.dismissCircle, { borderColor: cfg.border }]}>
            <Text style={[styles.dismissText, { color: cfg.text }]}>✕</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Toast / Snackbar ─────────────────────────────────────────────────────

interface ToastProps {
  visible: boolean;
  type?: AlertType;
  message: string;
  duration?: number;
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  type = 'info',
  message,
  duration = 3000,
  onHide,
}) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const cfg        = ALERT_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity,    { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 12, duration: 280, useNativeDriver: true }),
          ]).start(() => onHide?.());
        }, duration);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          backgroundColor: Colors.glassSurface,
          borderColor: cfg.border,
          opacity,
          transform: [{ translateY }],
        },
        Shadow.lg,
      ]}
    >
      {/* Glass highlight */}
      <View style={[styles.highlight, styles.toastHighlight]} pointerEvents="none" />

      <View style={[styles.toastIconBadge, { backgroundColor: cfg.text }]}>
        <Text style={styles.toastIconText}>{cfg.icon}</Text>
      </View>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Inline alert
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    zIndex: 1,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 1,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  iconText: { fontSize: 11, fontWeight: '800' },
  alertContent: { flex: 1 },
  alertTitle:   { fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  alertMessage: { fontSize: FontSize.sm, lineHeight: 18 },
  dismissBtn:   { padding: 2, marginLeft: Spacing.sm },
  dismissCircle: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: { fontSize: 9, fontWeight: '800' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 108,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toastHighlight: { borderRadius: BorderRadius.xl },
  toastIconBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  toastIconText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
  toastText: {
    color: Colors.black,
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
});

export default Alert;
