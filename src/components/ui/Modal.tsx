import React, { useRef, useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  Animated,
} from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../../theme';
import Button from './Button';

interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  actions?: ModalAction[];
  closeOnBackdrop?: boolean;
  contentStyle?: ViewStyle;
}

const AppModal: React.FC<AppModalProps> = ({
  visible,
  onClose,
  title,
  children,
  actions,
  closeOnBackdrop = true,
  contentStyle,
}) => {
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 22,
          bounciness: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 0.90, duration: 160, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={closeOnBackdrop ? onClose : undefined}>
        <View style={styles.overlay}>
          {/* Deep frosted overlay texture */}
          <View style={styles.overlayTexture} pointerEvents="none" />

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                contentStyle,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Specular top highlight */}
              <View style={styles.highlight} pointerEvents="none" />

              {/* Right-edge inner glow */}
              <View style={styles.rightGlow} pointerEvents="none" />

              {/* Header */}
              <View style={styles.header}>
                {title && <Text style={styles.title}>{title}</Text>}
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                  <View style={styles.closeInner}>
                    <Text style={styles.closeText}>✕</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Body */}
              {children && <View style={styles.body}>{children}</View>}

              {/* Actions */}
              {actions && actions.length > 0 && (
                <View style={styles.footer}>
                  {actions.map((action, i) => (
                    <Button
                      key={i}
                      title={action.label}
                      onPress={action.onPress}
                      variant={action.variant ?? (i === 0 ? 'primary' : 'ghost')}
                      fullWidth
                      style={i > 0 ? { marginTop: Spacing.sm } : undefined}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.glassOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  overlayTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 8, 4, 0.08)',
  },
  container: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.lg,
  },

  // Glass effects
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
    zIndex: 2,
  },
  rightGlow: {
    position: 'absolute',
    top: 20,
    right: 0,
    bottom: 20,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.50)',
    zIndex: 2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg + 2,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    flex: 1,
    letterSpacing: -0.3,
  },
  closeBtn: { marginLeft: Spacing.sm },
  closeInner: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassSurfaceMid,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 10, color: Colors.gray600, fontWeight: '800' },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
});

export default AppModal;
