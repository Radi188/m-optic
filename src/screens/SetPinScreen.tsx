import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  loginThunk,
  setPinThunk,
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
import { PIN_LENGTH } from './LoginScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'SetPin'>;

const SetPinScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { phone_number } = route.params;

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  useEffect(() => {
    dispatch(setError(null));
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    if (pin.length < PIN_LENGTH || confirm.length < PIN_LENGTH) return;

    if (pin !== confirm) {
      setMismatch(true);
      setConfirm('');
      return;
    }
    setMismatch(false);

    const result = await dispatch(setPinThunk({ phone_number, pin }));
    if (!setPinThunk.fulfilled.match(result)) return;

    // set-pin doesn't reliably return the customer record, so sign in with the
    // brand-new PIN to get the full session the rest of the app expects. The
    // navigator swaps to the authenticated stack once that lands.
    dispatch(loginThunk({ phone_number, pin }));
  }, [confirm, dispatch, phone_number, pin]);

  return (
    <AuthScreenLayout title={t('CreateYourPin')} subtitle={t('SetPinSubtitle')}>
      <View style={styles.block}>
        <AppText style={styles.label}>{t('NewPin')}</AppText>
        <CodeInput
          value={pin}
          onChangeText={v => {
            setPin(v);
            setMismatch(false);
          }}
          length={PIN_LENGTH}
          secure
          autoFocus
        />
      </View>

      <View style={styles.block}>
        <AppText style={styles.label}>{t('ConfirmPin')}</AppText>
        <CodeInput
          value={confirm}
          onChangeText={v => {
            setConfirm(v);
            setMismatch(false);
          }}
          length={PIN_LENGTH}
          secure
          onFilled={handleSubmit}
        />
      </View>

      <AuthError message={mismatch ? t('PinMismatch') : error} />

      <AuthButton
        label={t('Continue')}
        onPress={handleSubmit}
        loading={loading}
        disabled={pin.length < PIN_LENGTH || confirm.length < PIN_LENGTH}
      />
    </AuthScreenLayout>
  );
};

export default SetPinScreen;

const styles = StyleSheet.create({
  block: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
});
