import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing } from '../../../theme';
import AppText from '../../AppText';

export type SettingItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  onPress?: () => void;
};

type ProfileSettingSectionProps = {
  title?: string;
  items?: SettingItem[];
};

const ProfileSettingSection: React.FC<ProfileSettingSectionProps> = ({
  title,
  items,
}) => {
  const { t } = useTranslation();

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
      subtitle: 'ManageAlerts',
      icon: 'notifications-outline',
    },
    {
      id: 'support',
      title: 'Support',
      subtitle: 'HelpCenter',
      icon: 'headset-outline',
    },
    {
      id: 'privacy',
      title: 'PrivacyPolicy',
      subtitle: 'DataAndSecurity',
      icon: 'shield-checkmark-outline',
    },
    {
      id: 'logout',
      title: 'Logout',
      subtitle: 'SignOutFromAccount',
      icon: 'log-out-outline',
    },
  ];

  const sectionTitle = title ?? t('AccountSettings');
  const settingItems = items ?? defaultItems;

  return (
    <View style={styles.section}>
      {sectionTitle ? (
        <AppText style={styles.sectionTitle}>{sectionTitle}</AppText>
      ) : null}

      <View style={styles.card}>
        {settingItems.map((item, index) => {
          const isLogout = item.id === 'logout';

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.item,
                isLogout && styles.logoutItem,
                index === settingItems.length - 1 && styles.lastItem,
              ]}
              activeOpacity={0.85}
              onPress={item.onPress}
            >
              <View style={[styles.iconBox, isLogout && styles.logoutIconBox]}>
                <Ionicons
                  name={item.icon as any}
                  size={21}
                  color={isLogout ? '#D92D20' : Colors.primary}
                />
              </View>

              <View style={styles.textWrap}>
                <AppText style={[styles.title, isLogout && styles.logoutTitle]}>
                  {t(item.title)}
                </AppText>

                {item.subtitle ? (
                  <AppText
                    style={[styles.subtitle, isLogout && styles.logoutSubtitle]}
                  >
                    {t(item.subtitle)}
                  </AppText>
                ) : null}
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={isLogout ? '#D92D20' : Colors.gray500}
              />
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 10,
    marginLeft: 4,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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

  logoutItem: {
    backgroundColor: '#FFF7F6',
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

  logoutIconBox: {
    backgroundColor: '#FEE4E2',
  },

  textWrap: {
    flex: 1,
  },

  title: {
    fontSize: FontSize.md,
    fontWeight: '300',
    color: Colors.black,
  },

  logoutTitle: {
    color: '#D92D20',
  },

  subtitle: {
    marginTop: 3,
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },

  logoutSubtitle: {
    color: '#B42318',
  },
});
