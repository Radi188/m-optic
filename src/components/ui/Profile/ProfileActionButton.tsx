import Ionicons from '@react-native-vector-icons/ionicons';
import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Spacing } from '../../../theme';
import AppText from '../../AppText';

/**
 * A full-width row on the profile tab: icon, title, supporting line, chevron.
 *
 * Was `RewardButton`; generalised when the rewards row was replaced by
 * notifications, since the two differ only in icon, copy and an unread count.
 */
type ProfileActionButtonProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Unread indicator on the icon. Hidden at zero. */
  badgeCount?: number;
  onPress?: () => void;
  style?: ViewStyle;
};

const ProfileActionButton: React.FC<ProfileActionButtonProps> = ({
  title,
  subtitle,
  icon = 'notifications-outline',
  badgeCount = 0,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.rewardPreviewCard, style]}
      onPress={onPress}
    >
      <View style={styles.rewardPreviewLeft}>
        <View style={styles.rewardIconBox}>
          <Ionicons name={icon as any} size={22} color="#9B6A3D" />

          {badgeCount > 0 && (
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.rewardTextBox}>
          <AppText style={styles.rewardPreviewTitle}>{title}</AppText>
          {!!subtitle && (
            <AppText style={styles.rewardPreviewSubtitle} numberOfLines={2}>
              {subtitle}
            </AppText>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#A39186" />
    </TouchableOpacity>
  );
};

export default ProfileActionButton;

const styles = StyleSheet.create({
  rewardPreviewCard: {
    minHeight: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#2A160A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,

    marginTop: Spacing.md,
  },

  rewardPreviewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  rewardTextBox: {
    flex: 1,
  },

  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#D92D20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  rewardPreviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#241812',
    letterSpacing: -0.2,
  },

  rewardPreviewSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#8B7C72',
  },
});
