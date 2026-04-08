import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Animated,
} from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 10,
    }).start();
  };

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const shadowStyle = variant === 'primary' ? Shadow.glow : variant === 'danger' ? undefined : undefined;

  return (
    <Animated.View style={[
      fullWidth && styles.fullWidth,
      { transform: [{ scale }] },
      isDisabled && styles.disabled,
    ]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.base,
          variantStyle.container,
          sizeStyle,
          shadowStyle,
          style,
        ]}
      >
        {/* Specular top highlight for glass variants */}
        {(variant === 'secondary' || variant === 'outline' || variant === 'ghost') && (
          <View style={styles.glassHighlight} pointerEvents="none" />
        )}

        {/* Primary shimmer overlay */}
        {variant === 'primary' && (
          <View style={styles.primaryShimmer} pointerEvents="none" />
        )}

        {loading ? (
          <ActivityIndicator
            color={variantStyle.spinnerColor}
            size="small"
          />
        ) : (
          <View style={styles.row}>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <Text
              style={[
                styles.text,
                variantStyle.text,
                TEXT_SIZE_STYLES[size],
                textStyle,
              ]}
            >
              {title}
            </Text>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Variant definitions ───────────────────────────────────────────────────

const VARIANT_STYLES: Record<ButtonVariant, {
  container: ViewStyle;
  text: TextStyle;
  spinnerColor: string;
}> = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
      borderWidth: 1,
      borderColor: Colors.primaryMid + 'AA',
    },
    text: { color: Colors.white },
    spinnerColor: Colors.white,
  },
  secondary: {
    container: {
      backgroundColor: Colors.glassSurface,
      borderWidth: 1,
      borderColor: Colors.glassBorder,
    },
    text: { color: Colors.primary },
    spinnerColor: Colors.primary,
  },
  outline: {
    container: {
      backgroundColor: Colors.glassSurfaceMid,
      borderWidth: 1.5,
      borderColor: Colors.primary + 'AA',
    },
    text: { color: Colors.primary },
    spinnerColor: Colors.primary,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    text: { color: Colors.primary },
    spinnerColor: Colors.primary,
  },
  danger: {
    container: {
      backgroundColor: Colors.error,
      borderWidth: 1,
      borderColor: '#D04040AA',
    },
    text: { color: Colors.white },
    spinnerColor: Colors.white,
  },
};

const SIZE_STYLES: Record<ButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: Spacing.md, paddingVertical: 9,  minHeight: 38 },
  md: { paddingHorizontal: Spacing.lg, paddingVertical: 13, minHeight: 48 },
  lg: { paddingHorizontal: Spacing.xl, paddingVertical: 17, minHeight: 56 },
};

const TEXT_SIZE_STYLES: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: FontSize.sm },
  md: { fontSize: FontSize.md },
  lg: { fontSize: FontSize.lg },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft:  { marginRight: Spacing.xs },
  iconRight: { marginLeft: Spacing.xs },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.46 },

  text: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Specular highlights
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    zIndex: 1,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  primaryShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    zIndex: 1,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
});

export default Button;
