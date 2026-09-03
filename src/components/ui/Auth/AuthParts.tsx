import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../theme';
import AppText from '../../AppText';

export const AuthError: React.FC<{ message?: string | null }> = ({ message }) => {
  if (!message) return null;

  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
      <AppText style={styles.errorText}>{message}</AppText>
    </View>
  );
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const AuthButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  loading,
  disabled,
}) => (
  <TouchableOpacity
    style={[styles.btn, (loading || disabled) && styles.btnMuted]}
    onPress={onPress}
    activeOpacity={0.85}
    disabled={loading || disabled}
  >
    {loading ? (
      <ActivityIndicator color={Colors.white} />
    ) : (
      <AppText style={styles.btnText}>{label}</AppText>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginBottom: Spacing.xl,
    ...Shadow.glow,
  },
  btnMuted: { opacity: 0.6 },
  btnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
