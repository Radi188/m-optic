import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  loginThunk,
  selectAuthLoading,
  selectAuthError,
} from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import AppText from '../components/AppText';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const { height: SCREEN_H } = Dimensions.get('window');

interface FieldProps {
  label: string;
  icon: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  secure?: boolean;
}

const FormField: React.FC<FieldProps> = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  secure,
}) => {
  const [hidden, setHidden] = useState(secure ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[field.wrap, focused && field.wrapFocused]}>
      <View style={field.iconWrap}>
        <Ionicons
          name={icon as any}
          size={20}
          color={focused ? Colors.primary : Colors.gray400}
        />
      </View>

      <View style={field.content}>
        <AppText style={field.label}>{label}</AppText>
        <TextInput
          style={field.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray300}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={autoCorrect ?? false}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      {secure && (
        <TouchableOpacity
          onPress={() => setHidden(h => !h)}
          style={field.eyeBtn}
        >
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={Colors.gray400}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(false);

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

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

  const handleLogin = () => {
    if (!phone.trim() || !pin.trim()) return;
    dispatch(loginThunk({ phone_number: phone.trim(), pin }));
  };

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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.top,
            { paddingTop: insets.top + 16, opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
            <AppText style={styles.backText}>{t('Back')}</AppText>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <AppText style={styles.title}>{t('GoAheadSignIn')}</AppText>
          <AppText style={styles.subtitle}>{t('LoginSubtitle')}</AppText>
        </Animated.View>

        <Animated.View
          style={[styles.cardOuter, { transform: [{ translateY: cardAnim }] }]}
        >
          <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.tabBar}>
                <View style={styles.tabActive}>
                  <AppText style={styles.tabActiveText}>{t('Login')}</AppText>
                </View>

                <TouchableOpacity
                  style={styles.tabInactive}
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.tabInactiveText}>
                    {t('Register')}
                  </AppText>
                </TouchableOpacity>
              </View>

              <FormField
                label={t('PhoneNumber')}
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                placeholder="+855 12 345 678"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              <FormField
                label={t('Pin')}
                icon="keypad-outline"
                value={pin}
                onChangeText={setPin}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                secure
              />

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={Colors.error}
                  />
                  <AppText style={styles.errorText}>{error}</AppText>
                </View>
              )}

              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setRemember(r => !r)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.checkbox, remember && styles.checkboxActive]}
                  >
                    {remember && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={Colors.white}
                      />
                    )}
                  </View>

                  <AppText style={styles.rememberText}>
                    {t('RememberMe')}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <AppText style={styles.forgotText}>
                    {t('ForgotPassword')}
                  </AppText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                <AppText style={styles.loginBtnText}>
                  {loading ? t('SigningIn') : t('Login')}
                </AppText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;

const field = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  wrapFocused: {
    borderColor: Colors.primary,
  },
  iconWrap: {
    width: 36,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    fontSize: FontSize.md,
    color: Colors.black,
    padding: 0,
    fontWeight: '500',
  },
  eyeBtn: {
    paddingLeft: Spacing.sm,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },

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

  cardOuter: {},
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    minHeight: SCREEN_H * 0.58,
    ...Shadow.lg,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tabActive: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: 11,
    alignItems: 'center',
    ...Shadow.sm,
  },
  tabActiveText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  tabInactiveText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.gray400,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
  },

  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },

  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.glow,
  },
  loginBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
