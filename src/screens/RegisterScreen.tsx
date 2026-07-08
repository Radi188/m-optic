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
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDispatch } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { setUser } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import AppText from '../components/AppText';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

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
          size={19}
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
            size={19}
            color={Colors.gray400}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const validate = (): string | null => {
    if (!name.trim()) return t('ErrorFullNameRequired');
    if (!phone.trim()) return t('ErrorPhoneRequired');
    if (phone.replace(/\D/g, '').length < 8) return t('ErrorPhoneInvalid');
    if (password.length < 6) return t('ErrorPasswordMin');
    if (password !== confirm) return t('ErrorPasswordMismatch');
    return null;
  };

  const handleRegister = () => {
    const err = validate();

    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      dispatch(
        setUser({
          id: `usr_${Date.now()}`,
          name: name.trim(),
          email: '',
          phone: phone.trim(),
          role: 'customer',
          loyaltyPoints: 0,
          loyaltyTotalPoints: 0,
          loyaltyTierId: 1,
          isMember: false,
        }),
      );
    }, 1200);
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
            { paddingTop: insets.top + 12, opacity: fadeAnim },
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
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <AppText style={styles.title}>{t('GoAheadSetupAccount')}</AppText>
          <AppText style={styles.subtitle}>{t('RegisterSubtitle')}</AppText>
        </Animated.View>

        <Animated.View
          style={[styles.cardOuter, { transform: [{ translateY: cardAnim }] }]}
        >
          <ScrollView
            style={styles.card}
            contentContainerStyle={[
              styles.cardContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={styles.tabInactive}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <AppText style={styles.tabInactiveText}>{t('Login')}</AppText>
              </TouchableOpacity>

              <View style={styles.tabActive}>
                <AppText style={styles.tabActiveText}>{t('Register')}</AppText>
              </View>
            </View>

            <FormField
              label={t('FullName')}
              icon="person-outline"
              value={name}
              onChangeText={value => {
                setName(value);
                setError(null);
              }}
              placeholder={t('FullNamePlaceholder')}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <FormField
              label={t('PhoneNumber')}
              icon="call-outline"
              value={phone}
              onChangeText={value => {
                setPhone(value);
                setError(null);
              }}
              placeholder={t('PhonePlaceholder')}
              keyboardType="phone-pad"
            />

            <FormField
              label={t('Password')}
              icon="lock-closed-outline"
              value={password}
              onChangeText={value => {
                setPassword(value);
                setError(null);
              }}
              placeholder={t('PasswordPlaceholder')}
              secure
            />

            <FormField
              label={t('ConfirmPassword')}
              icon="shield-checkmark-outline"
              value={confirm}
              onChangeText={value => {
                setConfirm(value);
                setError(null);
              }}
              placeholder={t('ConfirmPasswordPlaceholder')}
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

            <TouchableOpacity
              style={[styles.actionBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              <AppText style={styles.actionBtnText}>
                {loading ? t('CreatingAccount') : t('CreateAccount')}
              </AppText>
            </TouchableOpacity>

            <AppText style={styles.terms}>
              {t('RegisterTermsText')}{' '}
              <AppText style={styles.termsLink}>{t('TermsOfService')}</AppText>{' '}
              {t('And')}{' '}
              <AppText style={styles.termsLink}>{t('PrivacyPolicy')}</AppText>.
            </AppText>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <AppText style={styles.dividerText}>{t('OrSignUpWith')}</AppText>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <AppText style={styles.socialText}>Google</AppText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                <AppText style={styles.socialText}>Facebook</AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const field = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm + 2,
  },
  wrapFocused: { borderColor: Colors.primary },
  iconWrap: { width: 34, alignItems: 'center' },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: '500',
    marginBottom: 1,
  },
  input: {
    fontSize: FontSize.md,
    color: Colors.black,
    padding: 0,
    fontWeight: '500',
  },
  eyeBtn: { paddingLeft: Spacing.sm },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
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
  logoWrap: {
    borderRadius: 100,
    overflow: 'hidden',

    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: { width: 56, height: 56, borderRadius: 13 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
    lineHeight: 52,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    lineHeight: 20,
  },
  cardOuter: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    ...Shadow.lg,
  },
  cardContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.lg,
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
    marginTop: -2,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadow.glow,
  },
  actionBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  terms: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingVertical: 13,
    backgroundColor: Colors.white,
  },
  socialText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.black,
  },
});

export default RegisterScreen;
