import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  Colors,
  FontSize,
  Spacing,
  BorderRadius,
  Shadow,
} from '../../../theme';

type Props = {
  onRetry?: () => void;
};

const ProfileErrorState: React.FC<Props> = ({ onRetry }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons
          name="cloud-offline-outline"
          size={34}
          color={Colors.primary}
        />
      </View>

      <Text style={styles.title}>Unable to load profile</Text>

      <Text style={styles.subtitle}>
        Something went wrong while loading your profile. Please check your
        connection and try again.
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.retryBtn}
        onPress={onRetry}
      >
        <Ionicons name="refresh-outline" size={18} color={Colors.white} />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    ...Shadow.glow,
  },
  retryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});

export default ProfileErrorState;
