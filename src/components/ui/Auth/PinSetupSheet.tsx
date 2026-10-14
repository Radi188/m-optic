import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import {
  loginThunk,
  requestOtpThunk,
  selectAuthError,
  selectAuthLoading,
  setError,
  setPinThunk,
  verifyOtpThunk,
} from '../../../store/slices/authSlice';
import type { AppDispatch } from '../../../store';
import { Colors, FontSize, Layout, Spacing } from '../../../theme';
import AppText from '../../AppText';
import CodeInput from './CodeInput';
import { AuthButton, AuthError } from './AuthParts';

const CODE_LENGTH = 6;
const PIN_LENGTH = 6;
const RESEND_SECONDS = 60;

type Step = 'code' | 'pin' | 'confirm';
const STEPS: Step[] = ['code', 'pin', 'confirm'];

type PinSetupSheetProps = {
  visible: boolean;
  /** Normalised digits, as sent to request-otp. */
  phone: string;
  onClose: () => void;
};

/**
 * First-time sign-in in one sheet: the SMS code, then a new PIN, then the PIN
 * again. One field per step, and each step moves on by itself as soon as its
 * last digit is typed, so most people never press a button. A matching PIN
 * is saved and the customer is signed in straight away; the navigator then
 * swaps to the signed-in app, which closes this sheet along with Login.
 */
const PinSetupSheet: React.FC<PinSetupSheetProps> = ({
  visible,
  phone,
  onClose,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const loading = useSelector(selectAuthLoading);
  const apiError = useSelector(selectAuthError);

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  // Guards auto-submit so a filled field can't fire the same request twice.
  const busy = useRef(false);

  // Fresh start every time the sheet opens (a code was just sent).
  useEffect(() => {
    if (!visible) return;
    setStep('code');
    setCode('');
    setPin('');
    setConfirm('');
    setMismatch(false);
    setSecondsLeft(RESEND_SECONDS);
    dispatch(setError(null));
  }, [visible, dispatch]);

  useEffect(() => {
    if (!visible || step !== 'code' || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [visible, step, secondsLeft]);

  const goTo = useCallback(
    (next: Step) => {
      dispatch(setError(null));
      setMismatch(false);
      setStep(next);
    },
    [dispatch],
  );

  // ── Step 1: SMS code ─────────────────────────────────────────────────────
  const verifyCode = useCallback(
    async (value: string) => {
      if (value.length < CODE_LENGTH || busy.current) return;
      busy.current = true;
      const result = await dispatch(
        verifyOtpThunk({ phone_number: phone, otp_code: value }),
      );
      busy.current = false;
      if (verifyOtpThunk.fulfilled.match(result)) {
        goTo('pin');
      } else {
        setCode('');
      }
    },
    [dispatch, goTo, phone],
  );

  const resendCode = useCallback(async () => {
    if (secondsLeft > 0 || loading) return;
    setCode('');
    const result = await dispatch(requestOtpThunk({ phone_number: phone }));
    if (requestOtpThunk.fulfilled.match(result)) setSecondsLeft(RESEND_SECONDS);
  }, [dispatch, loading, phone, secondsLeft]);

  // ── Step 2: new PIN ──────────────────────────────────────────────────────
  const acceptPin = useCallback(
    (value: string) => {
      if (value.length < PIN_LENGTH) return;
      setConfirm('');
      goTo('confirm');
    },
    [goTo],
  );

  // ── Step 3: confirm, save, sign in ───────────────────────────────────────
  const savePin = useCallback(
    async (value: string) => {
      if (value.length < PIN_LENGTH || busy.current) return;
      if (value !== pin) {
        setMismatch(true);
        setConfirm('');
        return;
      }
      busy.current = true;
      const result = await dispatch(setPinThunk({ phone_number: phone, pin }));
      if (setPinThunk.fulfilled.match(result)) {
        // set-pin doesn't reliably return the customer record, so sign in with
        // the new PIN to get the full session the rest of the app expects.
        await dispatch(loginThunk({ phone_number: phone, pin }));
      }
      busy.current = false;
    },
    [dispatch, phone, pin],
  );

  const stepIndex = STEPS.indexOf(step);

  const content = {
    code: {
      title: t('VerifyNumber'),
      subtitle: t('OtpSentTo', { phone }),
      value: code,
      onChange: (v: string) => {
        setCode(v);
        dispatch(setError(null));
      },
      onFilled: verifyCode,
      secure: false,
      button: t('Verify'),
      onButton: () => verifyCode(code),
    },
    pin: {
      title: t('CreateYourPin'),
      subtitle: t('SetPinSubtitle'),
      value: pin,
      onChange: setPin,
      onFilled: acceptPin,
      secure: true,
      button: t('Continue'),
      onButton: () => acceptPin(pin),
    },
    confirm: {
      title: t('ConfirmPin'),
      subtitle: t('ConfirmPinHint'),
      value: confirm,
      onChange: (v: string) => {
        setConfirm(v);
        setMismatch(false);
      },
      onFilled: savePin,
      secure: true,
      button: t('Continue'),
      onButton: () => savePin(confirm),
    },
  }[step];

  const length = step === 'code' ? CODE_LENGTH : PIN_LENGTH;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
          ]}
        >
          <View style={styles.inner}>
            <View style={styles.handle} />

            <View style={styles.topRow}>
              {step === 'code' ? (
                // Nothing to go back to; keeps the step label centred.
                <View style={styles.iconSpacer} />
              ) : (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => goTo(step === 'confirm' ? 'pin' : 'code')}
                  hitSlop={8}
                  accessibilityLabel={t('Back')}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={Colors.gray600}
                  />
                </TouchableOpacity>
              )}

              <AppText style={styles.stepText}>
                {t('StepOf', { current: stepIndex + 1, total: STEPS.length })}
              </AppText>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel={t('Cancel')}
              >
                <Ionicons name="close" size={20} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.progress}>
              {STEPS.map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.progressBar,
                    i <= stepIndex && styles.progressBarDone,
                  ]}
                />
              ))}
            </View>

            <AppText style={styles.title}>{content.title}</AppText>
            <AppText style={styles.subtitle}>{content.subtitle}</AppText>

            <View style={styles.codeBlock}>
              {/* Keyed by step so each field mounts fresh and takes focus. */}
              <CodeInput
                key={step}
                value={content.value}
                onChangeText={content.onChange}
                length={length}
                secure={content.secure}
                autoFocus
                onFilled={content.onFilled}
              />
            </View>

            <AuthError
              message={
                mismatch && step === 'confirm' ? t('PinMismatch') : apiError
              }
            />

            <AuthButton
              label={content.button}
              onPress={content.onButton}
              loading={loading}
              disabled={content.value.length < length}
            />

            {step === 'code' && (
              <TouchableOpacity
                onPress={resendCode}
                activeOpacity={0.7}
                disabled={secondsLeft > 0 || loading}
              >
                <AppText
                  style={[styles.link, secondsLeft > 0 && styles.linkMuted]}
                >
                  {secondsLeft > 0
                    ? t('ResendIn', { seconds: secondsLeft })
                    : t('ResendCode')}
                </AppText>
              </TouchableOpacity>
            )}

            {step === 'confirm' && mismatch && (
              <TouchableOpacity
                onPress={() => {
                  setPin('');
                  goTo('pin');
                }}
                activeOpacity={0.7}
              >
                <AppText style={styles.link}>{t('StartOver')}</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default PinSetupSheet;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 8, 0.45)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
  },
  // The sheet spans the screen; its form keeps a comfortable width on iPad.
  inner: {
    ...Layout.form,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 36,
    height: 36,
  },
  stepText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 0.4,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray200,
  },
  progressBarDone: {
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.gray500,
  },
  codeBlock: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  link: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  linkMuted: {
    color: Colors.gray400,
  },
});
