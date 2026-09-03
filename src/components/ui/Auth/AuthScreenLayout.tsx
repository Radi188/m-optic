import React, { useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, Shadow } from '../../../theme';
import AppText from '../../AppText';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: React.ReactNode;
}

/** Shared chrome for the sign-in flow: gradient header over a white sheet. */
const AuthScreenLayout: React.FC<Props> = ({
  title,
  subtitle,
  onBack,
  children,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const cardAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
        delay: 120,
      }),
    ]).start();
  }, [cardAnim, fadeAnim]);

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryMid, Colors.background]}
      locations={[0, 0.42, 1]}
      style={styles.root}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.top,
            { paddingTop: insets.top + 16, opacity: fadeAnim },
          ]}
        >
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.8}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
              <AppText style={styles.backText}>{t('Back')}</AppText>
            </TouchableOpacity>
          )}

          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: cardAnim }] }}>
          <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default AuthScreenLayout;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  top: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
  },
  backButton: {
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  backText: {
    fontSize: 16,
    color: Colors.white,
    textDecorationLine: 'underline',
  },
  logoRow: {
    marginBottom: Spacing.xl,
  },
  logoWrap: {
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: { width: 56, height: 56, borderRadius: 13 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
    lineHeight: 52,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    minHeight: SCREEN_H * 0.58,
    ...Shadow.lg,
  },
});
