import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type ProfileHeaderProps = {
  name?: string;
  subtitle?: string;
  avatarUrl?: string;
  notificationCount?: number;
  onEditPress?: () => void;
  onCameraPress?: () => void;
  onNotificationPress?: () => void;
};

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name = 'Antar Adil',
  subtitle = 'Premium Member',
  avatarUrl,
  notificationCount = 0,
  onEditPress,
  onCameraPress,
  onNotificationPress,
}) => {
  const hasUnreadNotification = notificationCount > 0;

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={46} color={Colors.primary} />
            )}
          </View>

          <TouchableOpacity
            style={styles.cameraBtn}
            activeOpacity={0.85}
            onPress={onCameraPress}
          >
            <Ionicons name="camera-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.editTextBtn}
          activeOpacity={0.85}
          onPress={onEditPress}
        >
          <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileHeader;

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 28,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },

  avatarContainer: {
    position: 'relative',
  },

  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },

  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9DCD5',
  },

  info: {
    flex: 1,
    marginLeft: Spacing.md,
    paddingRight: 70,
  },

  name: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },

  subtitle: {
    marginTop: 4,
    fontSize: FontSize.md,
    color: Colors.gray500,
  },

  editTextBtn: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F6EEE8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  editText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
