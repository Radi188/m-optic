import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  TextInputProps,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditProfileSkeleton from '../components/ui/Loading/EditProfileLoadingScreen';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { posthog } from '../config/posthog';
import { Colors, FontSize, Spacing, Layout, Shadow } from '../theme';
import ChangePhotoModal, {
  SelectedProfileImage,
} from '../components/ui/Modal/ChangePhotoModal';
import { Button } from '../components/ui';
import { useUserProfile } from '../hook/useUserProfile';
import type { UpdateProfilePayload } from '../controller/userController';
import { useAppDispatch } from '../store';
import { updateUser } from '../store/slices/authSlice';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';

/**
 * PUT /profile only accepts lowercase; GET /profile can return "Male" for
 * customers created at the shop, so values are compared without case.
 * Labels are fixed English in every language, as the shop asked.
 */
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

type GenderValue = (typeof GENDERS)[number]['value'];

const toGender = (value?: string | null): GenderValue | null => {
  const v = (value ?? '').trim().toLowerCase();
  return GENDERS.find(g => g.value === v)?.value ?? null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AGE = 150;

type FormState = {
  name: string;
  email: string;
  gender: GenderValue | null;
  age: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

/** The API's field names → this form's. */
const FIELD_FROM_API: Record<keyof UpdateProfilePayload, keyof FormState> = {
  customer_name: 'name',
  email: 'email',
  gender: 'gender',
  age: 'age',
};

const EditProfileScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const {
    profile,
    refetch,
    uploadAvatar,
    updateProfile,
    isUploadingAvatar,
    isSaving,
    isLoading,
    error,
  } = useUserProfile();

  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>();
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    gender: null,
    age: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // What the server last said: the form is diffed against it so only changed
  // fields are sent.
  const initial = useMemo<FormState>(
    () => ({
      name: profile?.customer_name ?? '',
      email: profile?.email ?? '',
      gender: toGender(profile?.gender),
      age:
        profile?.age === null || profile?.age === undefined
          ? ''
          : String(profile.age),
    }),
    [profile],
  );

  // Seed the form once, when the profile first arrives — a later refetch must
  // not wipe what the customer is typing.
  const seeded = useRef(false);
  useEffect(() => {
    if (profile && !seeded.current) {
      seeded.current = true;
      setForm(initial);
    }
  }, [profile, initial]);

  /** PUT /profile body: every field is optional, so only what changed. */
  const changes = useMemo<UpdateProfilePayload>(() => {
    const out: UpdateProfilePayload = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const age = form.age.trim();

    if (name !== initial.name.trim()) out.customer_name = name;
    if (email && email !== initial.email.trim()) out.email = email;
    if (form.gender && form.gender !== initial.gender) out.gender = form.gender;
    if (age && age !== initial.age) out.age = Number(age);
    return out;
  }, [form, initial]);

  // Emptying a saved email or age is a change too — the API has no way to
  // clear them, so Save stays enabled to explain that instead of ignoring it.
  const clearedEmail = !form.email.trim() && !!initial.email.trim();
  const clearedAge = !form.age.trim() && !!initial.age;
  const isDirty = Object.keys(changes).length > 0 || clearedEmail || clearedAge;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = t('NameRequired');

    const email = form.email.trim();
    if ((email && !EMAIL_PATTERN.test(email)) || clearedEmail) {
      next.email = t('InvalidEmail');
    }

    const age = form.age.trim();
    if (age) {
      const n = Number(age);
      if (!Number.isInteger(n) || n < 0 || n > MAX_AGE) {
        next.age = t('InvalidAge');
      }
    } else if (clearedAge) {
      next.age = t('InvalidAge');
    }
    return next;
  };

  const handleSave = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = changes;
    const result = await updateProfile(payload);

    if (!result.ok) {
      // 422: each message under its own field.
      const fieldErrors: FormErrors = {};
      (
        Object.keys(result.fieldErrors) as (keyof UpdateProfilePayload)[]
      ).forEach(field => {
        const key = FIELD_FROM_API[field];
        if (key) fieldErrors[key] = result.fieldErrors[field];
      });

      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
      } else {
        Alert.alert(
          t('ProfileUpdateFailed'),
          result.message ?? t('SomethingWentWrong'),
        );
      }
      return;
    }

    posthog?.capture('profile_updated', {
      changed_fields: Object.keys(payload).sort(),
    });

    // The cached account drives the initials and greeting elsewhere.
    dispatch(
      updateUser({
        ...(payload.customer_name !== undefined && {
          name: payload.customer_name,
        }),
        ...(payload.email !== undefined && { email: payload.email }),
      }),
    );

    Alert.alert(t('ProfileUpdated'), undefined, [
      { text: t('OK'), onPress: () => navigation.goBack() },
    ]);
  };

  const handleImageSelected = async (image: SelectedProfileImage) => {
    // Show the picked photo at once; the hook swaps in the returned URL.
    setLocalAvatarUrl(image.uri);
    const result = await uploadAvatar(image);
    if (!result.ok) {
      setLocalAvatarUrl(undefined);
      Alert.alert(t('UploadError'), result.message ?? t('UnableToUpdatePhoto'));
    }
  };

  const displayAvatar = localAvatarUrl || profile?.avatar_url || undefined;

  const header = (
    <View style={styles.appHeader}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.8}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.black} />
      </TouchableOpacity>

      <AppText style={styles.headerTitle}>{t('EditProfile')}</AppText>

      <View style={styles.headerPlaceholder} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <EditProfileSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <View style={styles.centerState}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={28} color="#D92D20" />
          </View>
          <AppText style={styles.errorTitle}>
            {t('UnableToLoadProfile')}
          </AppText>
          <AppText style={styles.errorText}>
            {error || t('SomethingWentWrong')}
          </AppText>
          <Button
            title={t('TryAgain')}
            onPress={refetch}
            size="sm"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {header}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* ── Photo ── */}
          <View style={styles.avatarBlock}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPhotoModalVisible(true)}
              disabled={isUploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel={t('TapToChangePhoto')}
            >
              <View style={styles.avatarWrap}>
                {displayAvatar ? (
                  <AppImage
                    source={{ uri: displayAvatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <Ionicons name="person" size={44} color={Colors.primary} />
                )}

                {isUploadingAvatar && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                )}
              </View>

              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={Colors.white} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPhotoModalVisible(true)}
              disabled={isUploadingAvatar}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <AppText style={styles.changePhoto}>
                {t('TapToChangePhoto')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* ── Personal information ── */}
          <AppText style={styles.sectionTitle}>
            {t('PersonalInformation')}
          </AppText>

          <View style={styles.card}>
            <FormField
              icon="person-outline"
              label={t('FullName')}
              value={form.name}
              onChangeText={v => setField('name', v)}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={255}
            />

            <FormField
              icon="mail-outline"
              label={t('Email')}
              value={form.email}
              onChangeText={v => setField('email', v)}
              error={errors.email}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={255}
            />

            <FieldRow
              icon="male-female-outline"
              label={t('Gender')}
              error={errors.gender}
            >
              <View style={styles.segmentTrack}>
                {GENDERS.map(option => {
                  const selected = form.gender === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.85}
                      style={[styles.segment, selected && styles.segmentOn]}
                      onPress={() => setField('gender', option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <AppText
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextOn,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FieldRow>

            <FormField
              icon="calendar-outline"
              label={t('Age')}
              value={form.age}
              onChangeText={v => setField('age', v.replace(/\D/g, ''))}
              error={errors.age}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {/* ── Phone: the login identity, so read-only ── */}
          <AppText style={styles.sectionTitle}>{t('LoginDetails')}</AppText>

          <View style={styles.card}>
            <FieldRow icon="call-outline" label={t('PhoneNumber')}>
              <View style={[styles.inputBox, styles.inputBoxReadOnly]}>
                <AppText style={styles.readOnlyValue} numberOfLines={1}>
                  {profile.phone_number || t('NotProvided')}
                </AppText>
                <Ionicons name="lock-closed" size={14} color={Colors.gray400} />
              </View>
            </FieldRow>
          </View>

          <AppText style={styles.footnote}>{t('PhoneLockedNote')}</AppText>
        </ScrollView>

        {/* ── Save ── */}
        <View style={styles.footer}>
          <Button
            title={t('SaveChanges')}
            onPress={handleSave}
            loading={isSaving}
            disabled={!isDirty}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>

      <ChangePhotoModal
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        onImageSelected={handleImageSelected}
      />
    </SafeAreaView>
  );
};

// ─── Form rows ────────────────────────────────────────────────────────────────

type FieldRowProps = {
  icon: string;
  label: string;
  error?: string;
  focused?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
};

/**
 * One row of the settings-style card: icon, small label, then the control.
 * The same anatomy as the Profile tab's settings list, so the two read as one
 * system.
 */
const FieldRow: React.FC<FieldRowProps> = ({
  icon,
  label,
  error,
  focused,
  onPress,
  children,
}) => {
  const tone = error ? Colors.error : focused ? Colors.primary : undefined;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View
        style={[
          styles.rowIcon,
          !!error && styles.rowIconError,
          focused && !error && styles.rowIconFocused,
        ]}
      >
        <Ionicons name={icon as any} size={19} color={tone ?? Colors.primary} />
      </View>

      <View style={styles.rowBody}>
        <AppText style={[styles.rowLabel, !!tone && { color: tone }]}>
          {label}
        </AppText>
        {children}
        {!!error && <AppText style={styles.rowError}>{error}</AppText>}
      </View>
    </Pressable>
  );
};

type FormFieldProps = Omit<TextInputProps, 'style'> & {
  icon: string;
  label: string;
  error?: string;
};

/** A FieldRow holding an underlined text input; tapping the row focuses it. */
const FormField: React.FC<FormFieldProps> = ({
  icon,
  label,
  error,
  onFocus,
  onBlur,
  ...inputProps
}) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <FieldRow
      icon={icon}
      label={label}
      error={error}
      focused={focused}
      onPress={() => inputRef.current?.focus()}
    >
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        placeholderTextColor={Colors.gray400}
        selectionColor={Colors.primary}
        onFocus={e => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...inputProps}
      />
    </FieldRow>
  );
};

export default EditProfileScreen;

// Palette shared with the Profile tab and settings screens.
const SURFACE = '#FAF7F5';
const CARD_BORDER = '#F0E7E3';
const ICON_TINT = '#F6EEE8';
const INPUT_BORDER = Colors.gray200;
const INPUT_FILL = '#FCFAF8';
const INPUT_HEIGHT = 44;

const styles = StyleSheet.create({
  flex: { flex: 1 },

  safeArea: {
    flex: 1,
    backgroundColor: SURFACE,
  },

  // ── Header (same as Notification settings) ──
  appHeader: {
    ...Layout.readable,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  content: {
    ...Layout.readable,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },

  // ── Photo ──
  avatarBlock: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ICON_TINT,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,18,8,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    marginTop: Spacing.sm + 2,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Sections (same as the Profile tab's settings list) ──
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: 10,
    marginLeft: 4,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },

  // ── Rows ──
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ICON_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowIconFocused: {
    backgroundColor: Colors.primaryLight,
  },
  rowIconError: {
    backgroundColor: Colors.errorLight,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.gray500,
    marginBottom: 2,
  },
  rowError: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  // Text inputs: a single line underneath, which turns brown while typing
  // and red on an error. The width stays fixed so nothing shifts on focus.
  input: {
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: INPUT_BORDER,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.black,
  },
  inputFocused: {
    borderBottomColor: Colors.primary,
  },
  inputError: {
    borderBottomColor: Colors.error,
  },

  // Read-only box (phone).
  inputBox: {
    marginTop: 6,
    height: INPUT_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
    paddingHorizontal: 12,
  },

  // ── Gender segmented control ──
  // Same height, border and fill as the text inputs so the form lines up.
  segmentTrack: {
    marginTop: 6,
    height: INPUT_HEIGHT,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray600,
  },
  segmentTextOn: {
    fontWeight: '800',
    color: Colors.white,
  },

  // ── Phone ──
  // Greyed, with a lock: visibly not a place to type.
  inputBoxReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray100,
  },
  readOnlyValue: {
    flexShrink: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.gray600,
  },
  footnote: {
    marginTop: 10,
    marginHorizontal: 4,
    fontSize: FontSize.xs,
    lineHeight: 17,
    color: Colors.gray500,
  },

  // ── Save ──
  footer: {
    ...Layout.readable,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm + 4,
    paddingBottom: Spacing.sm,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },

  // ── Error state ──
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  errorText: {
    marginTop: 8,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.gray500,
  },
  retryButton: {
    marginTop: 18,
  },
});
