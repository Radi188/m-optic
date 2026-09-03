import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  loginThunk,
  requestOtpThunk,
  selectAuthLoading,
  selectAuthError,
  setError,
} from '../store/slices/authSlice';
import { authService, normalisePhone } from '../services/authService';
import type { AppDispatch } from '../store';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import AppText from '../components/AppText';
import AuthScreenLayout from '../components/ui/Auth/AuthScreenLayout';
import CodeInput from '../components/ui/Auth/CodeInput';
import { AuthButton, AuthError } from '../components/ui/Auth/AuthParts';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const PIN_LENGTH = 6;

interface FieldProps {
  label: string;
  icon: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  editable?: boolean;
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
  editable = true,
}) => {
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
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  /** Set once the device recognises the number as having a PIN already. */
  const [pinMode, setPinMode] = useState(false);

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  // Stale errors from a previous attempt shouldn't greet the next visitor.
  useEffect(() => {
    dispatch(setError(null));
  }, [dispatch]);

  const digits = normalisePhone(phone);

  // Recognise a remembered number as it is typed, so the PIN field can appear
  // without an extra round trip.
  useEffect(() => {
    let cancelled = false;
    if (!digits) {
      setPinMode(false);
      return;
    }
    authService.hasPin(digits).then(known => {
      if (!cancelled) setPinMode(known);
    });
    return () => {
      cancelled = true;
    };
  }, [digits]);

  const handleRequestOtp = useCallback(async () => {
    if (!digits) return;
    const result = await dispatch(requestOtpThunk({ phone_number: digits }));
    if (requestOtpThunk.fulfilled.match(result)) {
      navigation.navigate('VerifyOtp', { phone_number: digits });
    }
  }, [digits, dispatch, navigation]);

  const handlePinLogin = useCallback(() => {
    if (!digits || pin.length < PIN_LENGTH) return;
    dispatch(loginThunk({ phone_number: digits, pin }));
  }, [digits, dispatch, pin]);

  /** Escape hatch for a forgotten PIN or a number remembered in error. */
  const handleUseOtpInstead = useCallback(async () => {
    setPin('');
    await authService.forgetPhone(digits);
    setPinMode(false);
    await handleRequestOtp();
  }, [digits, handleRequestOtp]);

  const submitDisabled = pinMode
    ? !digits || pin.length < PIN_LENGTH
    : !digits;

  return (
    <AuthScreenLayout
      title={t('GoAheadSignIn')}
      subtitle={t('LoginSubtitle')}
      onBack={() => navigation.goBack()}
    >
      <View style={styles.tabBar}>
        <View style={styles.tabActive}>
          <AppText style={styles.tabActiveText}>{t('Login')}</AppText>
        </View>
      </View>

      <FormField
        label={t('PhoneNumber')}
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        placeholder="016 622 357"
        keyboardType="phone-pad"
      />

      {pinMode && (
        <View style={styles.pinBlock}>
          <AppText style={styles.pinLabel}>{t('EnterYourPin')}</AppText>
          <CodeInput
            value={pin}
            onChangeText={setPin}
            length={PIN_LENGTH}
            secure
            onFilled={handlePinLogin}
          />
        </View>
      )}

      <AuthError message={error} />

      <AuthButton
        label={pinMode ? t('Login') : t('SendCode')}
        onPress={pinMode ? handlePinLogin : handleRequestOtp}
        loading={loading}
        disabled={submitDisabled}
      />

      {pinMode ? (
        <TouchableOpacity
          onPress={handleUseOtpInstead}
          activeOpacity={0.7}
          disabled={loading}
        >
          <AppText style={styles.altText}>{t('ForgotPin')}</AppText>
        </TouchableOpacity>
      ) : (
        <AppText style={styles.hint}>{t('OtpHint')}</AppText>
      )}
    </AuthScreenLayout>
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
});

const styles = StyleSheet.create({
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
  },
  tabActiveText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },
  pinBlock: {
    marginBottom: Spacing.md,
  },
  pinLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  altText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
