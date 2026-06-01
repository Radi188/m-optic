import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type NotLoginProfileProps = {
  onLoginPress?: () => void;
};

const NotLoginProfile: React.FC<NotLoginProfileProps> = ({ onLoginPress }) => {
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

        <Text style={styles.title}>Welcome to{'\n'}M Optic</Text>

        <Text style={styles.subtitle}>
          Sign in to access your prescriptions, saved frames, appointments, and
          exclusive member rewards.
        </Text>

        <TouchableOpacity
          style={styles.loginBtn}
          activeOpacity={0.9}
          onPress={onLoginPress}
        >
          <Text style={styles.loginText}>Sign In</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NotLoginProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },

  heroCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 36,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl * 1.5,
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
    lineHeight: 44,
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
