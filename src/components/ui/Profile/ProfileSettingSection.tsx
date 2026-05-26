import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type SettingItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  onPress?: () => void;
};

type ProfileSettingSectionProps = {
  items?: SettingItem[];
};

const defaultItems: SettingItem[] = [
  {
    id: 'language',
    title: 'Language',
    subtitle: 'English',
    icon: 'language-outline',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage alerts',
    icon: 'notifications-outline',
  },
  {
    id: 'support',
    title: 'Support',
    subtitle: 'Help center',
    icon: 'headset-outline',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Data and security',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'logout',
    title: 'Logout',
    subtitle: 'Sign out from account',
    icon: 'log-out-outline',
  },
];

const ProfileSettingSection: React.FC<ProfileSettingSectionProps> = ({
  items = defaultItems,
}) => {
  return (
    <View style={styles.section}>
      {/* <Text style={styles.sectionTitle}>Settings</Text> */}

      <View style={styles.card}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, index === items.length - 1 && styles.lastItem]}
            activeOpacity={0.85}
            onPress={item.onPress}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={item.icon as any}
                size={21}
                color={Colors.primary}
              />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={20} color={Colors.gray500} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default ProfileSettingSection;

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    overflow: 'hidden',
  },
  item: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE8',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  subtitle: {
    marginTop: 3,
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
});
