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

import { setUser } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

// ─── Form field (identical to LoginScreen) ────────────────────────────────────
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
  label, icon, value, onChangeText, placeholder,
  keyboardType, autoCapitalize, autoCorrect, secure,
}) => {
  const [hidden,  setHidden]  = useState(secure ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[field.wrap, focused && field.wrapFocused]}>
      <View style={field.iconWrap}>
        <Ionicons name={icon} size={19} color={focused ? Colors.primary : Colors.gray400} />
      </View>
      <View style={field.content}>
        <Text style={field.label}>{label}</Text>
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
        <TouchableOpacity onPress={() => setHidden(h => !h)} style={field.eyeBtn}>
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

// ─── Screen ───────────────────────────────────────────────────────────────────
const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets   = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const cardAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10, delay: 120 }),
    ]).start();
  }, []);

  const validate = (): string | null => {
    if (!name.trim())                         return 'Please enter your full name.';
    if (!phone.trim())                        return 'Please enter your phone number.';
    if (phone.replace(/\D/g, '').length < 8) return 'Please enter a valid phone number.';
    if (password.length < 6)                 return 'Password must be at least 6 characters.';
    if (password !== confirm)                return 'Passwords do not match.';
    return null;
  };

  const handleRegister = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      dispatch(setUser({
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: '',
        phone: phone.trim(),
        role: 'customer',
        loyaltyPoints: 0,
        loyaltyTotalPoints: 0,
        loyaltyTierId: 1,
        isMember: false,
      }));
      // Navigator switches automatically when isAuthenticated becomes true
    }, 1200);
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryMid, Colors.background]}
      locations={[0, 0.42, 1]}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top: compact branding ─────────────────────────────── */}
        <Animated.View style={[styles.top, { paddingTop: insets.top + 12, opacity: fadeAnim }]}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/logo.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Go ahead and{'\n'}set up your account</Text>
          <Text style={styles.subtitle}>Sign up to enjoy the best eyewear experience</Text>
        </Animated.View>

        {/* ── Bottom card — flex: 1 fills the rest ──────────────── */}
        <Animated.View style={[styles.cardOuter, { transform: [{ translateY: cardAnim }] }]}>
          <ScrollView
            style={styles.card}
            contentContainerStyle={[styles.cardContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Tab toggle */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={styles.tabInactive}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.tabInactiveText}>Login</Text>
              </TouchableOpacity>
              <View style={styles.tabActive}>
                <Text style={styles.tabActiveText}>Register</Text>
              </View>
            </View>

            {/* Form fields */}
            <FormField
              label="Full Name"
              icon="person-outline"
              value={name}
              onChangeText={t => { setName(t); setError(null); }}
              placeholder="John Doe"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <FormField
              label="Phone Number"
              icon="call-outline"
              value={phone}
              onChangeText={t => { setPhone(t); setError(null); }}
              placeholder="+1 234 567 8900"
              keyboardType="phone-pad"
            />
            <FormField
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={t => { setPassword(t); setError(null); }}
              placeholder="At least 6 characters"
              secure
            />
            <FormField
              label="Confirm Password"
              icon="shield-checkmark-outline"
              value={confirm}
              onChangeText={t => { setConfirm(t); setError(null); }}
              placeholder="Repeat your password"
              secure
            />

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Register button */}
            <TouchableOpacity
              style={[styles.actionBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.actionBtnText}>
                {loading ? 'Creating account…' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.terms}>
              By registering you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top ─────────────────────────────────────────────────────────
  top: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    marginBottom: Spacing.lg,
  },
  logo: { width: 48, height: 48 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    lineHeight: 20,
  },

  // ── Card ────────────────────────────────────────────────────────
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

  // Tab toggle — identical to LoginScreen
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

  // Error
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

  // Action button — identical shape to LoginScreen
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

  // Terms
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

  // Divider
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

  // Social buttons — identical to LoginScreen
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
