import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '../../../theme';
import { Text } from 'react-native-gesture-handler';
import Ionicons from '@react-native-vector-icons/ionicons';
import AppText from '../../AppText';

type ProfileTitleHeaderProps = {
  hasUnreadNotification: boolean;
  notificationCount: number;
  notificationPress: () => void;
  label: string;
};

const ProfileTitleHeader = ({
  hasUnreadNotification,
  notificationCount,
  notificationPress,
  label,
}: ProfileTitleHeaderProps) => {
  return (
    <View style={styles.topSection}>
      <AppText style={styles.screenTitle}>{label}</AppText>

      <TouchableOpacity
        style={styles.notificationBtn}
        activeOpacity={0.85}
        onPress={notificationPress}
      >
        <Ionicons name="notifications-outline" size={22} color={Colors.black} />

        {hasUnreadNotification ? (
          <View style={styles.notificationBadge}>
            <AppText style={styles.notificationBadgeText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </AppText>
          </View>
        ) : null}
      </TouchableOpacity>
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
    fontSize: 30,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.6,
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
