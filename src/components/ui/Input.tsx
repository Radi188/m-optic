import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
  Animated,
} from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  required?: boolean;
  secureToggle?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  required,
  secureToggle,
  secureTextEntry,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    rest.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(glowAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    rest.onBlur?.({} as any);
  };

  const borderColor = error
    ? Colors.error
    : focused
    ? Colors.primary
    : Colors.glassBorder;

  const bgColor = error
    ? Colors.errorLight
    : Colors.glassSurfaceHigh;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: bgColor,
          },
          focused && !error && Shadow.sm,
        ]}
      >
        {/* Specular highlight */}
        <View style={styles.highlight} pointerEvents="none" />

        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.gray400}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          {...rest}
        />

        {secureToggle ? (
          <TouchableOpacity
            onPress={() => setHidden(h => !h)}
            style={styles.iconRight}
          >
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.iconRight}>{rightIcon}</View>
        ) : null}
      </Animated.View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    letterSpacing: 0.1,
  },
  required: { color: Colors.error },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
    zIndex: 1,
  },
  iconLeft:  { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.black,
    paddingVertical: Spacing.sm + 2,
  },
  toggleText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: Spacing.xs, fontWeight: '500' },
  hint:  { fontSize: FontSize.xs, color: Colors.gray500, marginTop: Spacing.xs },
});

export default Input;
