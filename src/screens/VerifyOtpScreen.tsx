import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  requestOtpThunk,
  verifyOtpThunk,
  selectAuthLoading,
  selectAuthError,
  setError,
} from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { Colors, FontSize, Spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import AppText from '../components/AppText';
import AuthScreenLayout from '../components/ui/Auth/AuthScreenLayout';
import CodeInput from '../components/ui/Auth/CodeInput';
import { AuthButton, AuthError } from '../components/ui/Auth/AuthParts';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const VerifyOtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { phone_number } = route.params;

  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  // Guards the auto-submit so a filled field doesn't fire twice.
  const submitting = useRef(false);

  useEffect(() => {
    dispatch(setError(null));
  }, [dispatch]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const handleVerify = useCallback(
    async (value: string) => {
      if (value.length < OTP_LENGTH || submitting.current) return;
      submitting.current = true;

      const result = await dispatch(
        verifyOtpThunk({ phone_number, otp_code: value }),
      );
      submitting.current = false;

      if (verifyOtpThunk.fulfilled.match(result)) {
        navigation.replace('SetPin', { phone_number });
      } else {
        setCode('');
      }
    },
    [dispatch, navigation, phone_number],
  );

  const handleResend = useCallback(async () => {
    if (secondsLeft > 0) return;
    setCode('');
    const result = await dispatch(requestOtpThunk({ phone_number }));
    if (requestOtpThunk.fulfilled.match(result)) {
      setSecondsLeft(RESEND_SECONDS);
    }
  }, [dispatch, phone_number, secondsLeft]);

  return (
    <AuthScreenLayout
      title={t('VerifyNumber')}
      subtitle={t('OtpSentTo', { phone: phone_number })}
      onBack={() => navigation.goBack()}
    >
      <AppText style={styles.label}>{t('EnterTheCode')}</AppText>

      <View style={styles.codeBlock}>
        <CodeInput
          value={code}
          onChangeText={setCode}
          length={OTP_LENGTH}
          autoFocus
          onFilled={handleVerify}
        />
      </View>

      <AuthError message={error} />

      <AuthButton
        label={t('Verify')}
        onPress={() => handleVerify(code)}
        loading={loading}
        disabled={code.length < OTP_LENGTH}
      />

      <TouchableOpacity
        onPress={handleResend}
        activeOpacity={0.7}
        disabled={secondsLeft > 0 || loading}
      >
        <AppText
          style={[styles.resend, secondsLeft > 0 && styles.resendMuted]}
        >
          {secondsLeft > 0
            ? t('ResendIn', { seconds: secondsLeft })
            : t('ResendCode')}
        </AppText>
      </TouchableOpacity>
    </AuthScreenLayout>
  );
};

export default VerifyOtpScreen;

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontWeight: '500',
    marginBottom: Spacing.md,
  },
  codeBlock: {
    marginBottom: Spacing.xl,
  },
  resend: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendMuted: {
    color: Colors.gray400,
  },
});
