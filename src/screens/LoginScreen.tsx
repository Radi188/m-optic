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

import {
  loginThunk,
  selectAuthLoading,
  selectAuthError,
} from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Custom input styled like the reference ───────────────────────────────────
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
  const [hidden, setHidden] = useState(secure ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[field.wrap, focused && field.wrapFocused]}>
      <View style={field.iconWrap}>
        <Ionicons name={icon} size={20} color={focused ? Colors.primary : Colors.gray400} />
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
            size={20}
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
  content: { flex: 1 },
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
  eyeBtn: { paddingLeft: Spacing.sm },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets   = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const [phone,    setPhone]    = useState('');
  const [pin,      setPin]      = useState('');
  const [remember, setRemember] = useState(false);

  const loading = useSelector(selectAuthLoading);
  const error   = useSelector(selectAuthError);

  const cardAnim  = useRef(new Animated.Value(80)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10, delay: 120 }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (!phone.trim() || !pin.trim()) return;
    dispatch(loginThunk({ phone_number: phone.trim(), pin }));
    // Root navigator switches automatically when isAuthenticated becomes true
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
        {/* ── Top: branding + title ──────────────────────────────── */}
        <Animated.View
          style={[styles.top, { paddingTop: insets.top + 16, opacity: fadeAnim }]}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/logo.jpg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.title}>Go ahead and{'\n'}sign in</Text>
          <Text style={styles.subtitle}>
            Sign in to enjoy the best eyewear experience
          </Text>
        </Animated.View>

        {/* ── Bottom card ───────────────────────────────────────── */}
        <Animated.View
          style={[styles.cardOuter, { transform: [{ translateY: cardAnim }] }]}
        >
          <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Tab toggle */}
              <View style={styles.tabBar}>
                <View style={styles.tabActive}>
                  <Text style={styles.tabActiveText}>Login</Text>
                </View>
                <TouchableOpacity
                  style={styles.tabInactive}
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tabInactiveText}>Register</Text>
                </TouchableOpacity>
              </View>

              {/* Inputs */}
              <FormField
                label="Phone Number"
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <FormField
                label="PIN"
                icon="keypad-outline"
                value={pin}
                onChangeText={setPin}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                secure
              />

              {/* Error */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Remember me + Forgot */}
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setRemember(r => !r)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                    {remember && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login button */}
              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'Signing in…' : 'Login'}
                </Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top section ─────────────────────────────────────────────────
  top: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
  },
  logoRow: {
    marginBottom: Spacing.xl,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  logo: { width: 52, height: 52 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    lineHeight: 22,
  },

  // ── Card ────────────────────────────────────────────────────────
  cardOuter: {
    // Card slides up from below
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

  // Tab toggle
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
    marginTop: -Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
  },

  // Remember row
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

  // Login button
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

export default LoginScreen;
