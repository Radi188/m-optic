import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Spacing } from '../../../theme';
import Ionicons from '@react-native-vector-icons/ionicons';
import AppText from '../../AppText';

type ProfileTitleHeaderProps = {
  hasUnreadNotification: boolean;
  notificationCount: number;
  notificationPress: () => void;
  /** Optional: adds the rewards shortcut beside the bell. */
  rewardPress?: () => void;
  label: string;
};

const ProfileTitleHeader = ({
  hasUnreadNotification,
  notificationCount,
  notificationPress,
  rewardPress,
  label,
}: ProfileTitleHeaderProps) => {
  return (
    <View style={styles.topSection}>
      <AppText style={styles.screenTitle}>{label}</AppText>

      <View style={styles.actions}>
        {/* Rewards moved up here from a full-width card in the page body: it
            is a shortcut, not a section, and the header is where the tab's
            other shortcut already lives. */}
        {!!rewardPress && (
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.85}
            onPress={rewardPress}
          >
            <Ionicons name="gift-outline" size={22} color={Colors.black} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.notificationBtn}
          activeOpacity={0.85}
          onPress={notificationPress}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={Colors.black}
          />

          {hasUnreadNotification ? (
            <View style={styles.notificationBadge}>
              <AppText style={styles.notificationBadgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </AppText>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileTitleHeader;

const styles = StyleSheet.create({
  topSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  screenTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.6,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E7E3',
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D92D20',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: Colors.white,
  },

  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.white,
  },
});
