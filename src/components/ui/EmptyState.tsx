import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BorderRadius, Colors, FontSize, Spacing } from '../../theme';
import AppText from '../AppText';

type EmptyStateProps = {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * "Nothing to show" for product lists. Sits a fixed distance under the
 * controls above it rather than centring in the leftover height, so it lands
 * in the same place on a phone and a tall iPad, and its text stays a
 * readable width.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'glasses-outline',
  title,
  message,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon as any} size={30} color={Colors.primary} />
    </View>

    <AppText style={styles.title}>{title}</AppText>
    {!!message && <AppText style={styles.message}>{message}</AppText>}

    {!!actionLabel && !!onAction && (
      <TouchableOpacity
        style={styles.action}
        onPress={onAction}
        activeOpacity={0.8}
      >
        <AppText style={styles.actionText}>{actionLabel}</AppText>
      </TouchableOpacity>
    )}
  </View>
);

export default EmptyState;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    textAlign: 'center',
  },
  message: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.gray500,
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
});
