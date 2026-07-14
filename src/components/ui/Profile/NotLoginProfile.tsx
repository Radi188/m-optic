import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing } from '../../../theme';

import AppText from '../../AppText';

type NotLoginProfileProps = {
  onLoginPress?: () => void;
};

const NotLoginProfile: React.FC<NotLoginProfileProps> = ({ onLoginPress }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.logoOuter}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        </View>

        <AppText style={styles.title}>{t('WelcomeToMOptic')}</AppText>

        <AppText style={styles.subtitle}>
          {t('NotLoginProfileSubtitle')}
        </AppText>

        <TouchableOpacity
          style={styles.loginBtn}
          activeOpacity={0.9}
          onPress={onLoginPress}
        >
          <AppText style={styles.loginText}>{t('SignIn')}</AppText>

          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NotLoginProfile;

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
  },

  heroCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 36,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },

  logoOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E9DCD5',
  },

  logoCircle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logo: {
    width: 92,
    height: 92,
    borderRadius: 28,
  },

  title: {
    fontSize: 38,
    lineHeight: 56,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: 25,
    color: Colors.gray500,
    textAlign: 'center',
  },

  loginBtn: {
    marginTop: Spacing.xl,
    height: 58,
    paddingHorizontal: 30,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loginText: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.white,
  },
});
