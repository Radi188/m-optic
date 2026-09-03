import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppModal, Input, GlassView, GlassBackground } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';

import { useAppDispatch, useAppSelector } from '../store';
import {
  selectUser,
  selectUserInitials,
  updateUser,
  clearUser,
} from '../store/slices/authSlice';
import {
  selectUnreadCount,
  selectNotifications,
  markAsRead,
  markAllRead,
} from '../store/slices/notificationsSlice';
import CurrentPrescriptionCard from '../components/ui/Profile/CurrentPrescriptionCard';
import ProfileHeader from '../components/ui/Profile/ProfileHeader';
import ProfileSettingSection from '../components/ui/Profile/ProfileSettingSection';
import ProfilePointSection from '../components/ui/Profile/ProfilePointSection';
import NotLoginProfile from '../components/ui/Profile/NotLoginProfile';
import LanguagePickerModal from '../components/ui/Modal/LanguagePickerModal';
import LogoutModal from '../components/ui/Modal/LogoutModal';
import RewardButton from '../components/ui/Profile/RewardButton';
import { useUserProfile } from '../hook/useUserProfile';
import { formatDate } from '../utils/dateHelper';
import ProfileHeaderSkeleton from '../components/ui/Profile/Loading/ProfileHeaderSkeleton';
import CurrentPrescriptionCardSkeleton from '../components/ui/Profile/Loading/CurrentPrescriptionCardSkeleton';
import ProfilePointSectionSkeleton from '../components/ui/Profile/Loading/ProfilePointSkeleton';
import ProfileTitleHeader from '../components/ui/Profile/ProfileTitleHeader';
import ProfileErrorState from '../components/ui/Profile/ProfileErrorState';
import { AppLanguage, changeAppLanguage } from '../localizations/i18n';
import { useTranslation } from 'react-i18next';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Guest feature list ───────────────────────────────────────────────────────

const GUEST_FEATURES = [
  {
    icon: 'eye-outline',
    title: 'Refraction\nHistory',
    desc: 'Track your eye prescription changes over time',
    color: Colors.primary,
    bg: Colors.primaryLight,
  },
  {
    icon: 'star-outline',
    title: 'Loyalty\nPoints',
    desc: 'Earn & redeem points on every purchase',
    color: '#F4A830',
    bg: 'rgba(244,168,48,0.14)',
  },
  {
    icon: 'pricetag-outline',
    title: 'Member\nDiscounts',
    desc: 'Exclusive deals & seasonal member offers',
    color: '#2DBD7E',
    bg: 'rgba(45,189,126,0.14)',
  },
  {
    icon: 'notifications-outline',
    title: 'Smart\nAlerts',
    desc: 'Promo & new stock notifications',
    color: '#4DA8DA',
    bg: 'rgba(77,168,218,0.14)',
  },
  {
    icon: 'scan-outline',
    title: 'Face\nScan',
    desc: 'Find frames that suit your face shape',
    color: '#9B59B6',
    bg: 'rgba(155,89,182,0.14)',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Mobile\nRefraction',
    desc: 'Quick refraction test right from your phone',
    color: '#E74C3C',
    bg: 'rgba(231,76,60,0.14)',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const initials = useAppSelector(selectUserInitials);
  const unreadCount = useAppSelector(selectUnreadCount);
  const notifications = useAppSelector(selectNotifications);

  const [editModal, setEditModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [notifModal, setNotifModal] = useState(false);
  const currentLanguage: AppLanguage =
    i18n.resolvedLanguage === 'km' ? 'km' : 'en';

  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const languageLabel = selectedLanguage === 'km' ? 'ភាសាខ្មែរ' : 'English';

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const { profile, isLoading, error, refetch } = useUserProfile();

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);

    // Clear token / user data here
    await dispatch(clearUser());
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

    console.log('Logout confirmed');
  };

  const handleChangeLanguage = async (language: AppLanguage) => {
    await changeAppLanguage(language);
    setSelectedLanguage(language);
  };

  const settingItems = useMemo(
    () => [
      {
        id: 'language',
        title: 'Language',
        subtitle: languageLabel,
        icon: 'language-outline',
        onPress: () => setLanguageModalVisible(true),
      },
      {
        id: 'notifications',
        title: 'Notifications',
        subtitle: 'ManageAlerts',
        icon: 'notifications-outline',
        onPress: () => navigation.navigate('NotificationSetting'),
      },
      {
        id: 'support',
        title: 'Support',
        subtitle: 'HelpCenter',
        icon: 'headset-outline',
        onPress: () => {
          navigation.navigate('Support');
        },
      },
      {
        id: 'privacy',
        title: 'PrivacyPolicy',
        subtitle: 'DataAndSecurity',
        icon: 'shield-checkmark-outline',
        onPress: () => {
          navigation.navigate('Privacy');
        },
      },
      {
        id: 'logout',
        title: 'Logout',
        subtitle: 'SignOutFromAccount',
        icon: 'log-out-outline',
        onPress: () => {
          setLogoutModalVisible(true);
        },
      },
    ],
    [languageLabel],
  );

  // ── Guest view ────────────────────────────────────────────────────────────

  // ── Authenticated view ────────────────────────────────────────────────────

  const calculateTierProgress = (
    totalPoints?: number | null,
    currentTierMinPoints?: number | null,
    nextTierMinPoints?: number | null,
  ) => {
    if (
      totalPoints === null ||
      totalPoints === undefined ||
      currentTierMinPoints === null ||
      currentTierMinPoints === undefined ||
      nextTierMinPoints === null ||
      nextTierMinPoints === undefined
    ) {
      return 0;
    }

    const tierRange = nextTierMinPoints - currentTierMinPoints;

    if (tierRange <= 0) {
      return 100;
    }

    const earnedInCurrentTier = totalPoints - currentTierMinPoints;

    const progress = (earnedInCurrentTier / tierRange) * 100;

    return Math.min(Math.max(Math.round(progress), 0), 100);
  };

  // ── Screen ─────────────────────────────────────────────────────────────

  return (
    <GlassBackground>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={guestStyles.scroll}
        >
          <ProfileTitleHeader
            notificationCount={unreadCount}
            hasUnreadNotification={unreadCount > 0}
            notificationPress={() => navigation.navigate('NotificationList')}
            label={t('MyProfile')}
          />

          {/* =======================
            GUEST USER
        ======================== */}
          {!user && (
            <NotLoginProfile
              onLoginPress={() => navigation.navigate('Login')}
            />
          )}

          {/* =======================
            MEMBER USER
        ======================== */}
          {user && (
            <>
              {error ? (
                <ProfileErrorState onRetry={refetch} />
              ) : !isLoading ? (
                <>
                  <ProfileHeader
                    name={profile?.customer_name}
                    subtitle={profile?.tier?.name}
                    avatarUrl={profile?.avatar_url || ''}
                    notificationCount={unreadCount}
                    editLabel={t('Edit')}
                    onEditPress={() => navigation.navigate('EditProfile')}
                  />

                  <CurrentPrescriptionCard
                    rightEye={profile?.prescription?.right_eye}
                    leftEye={profile?.prescription?.left_eye}
                    updatedAt={formatDate(profile?.prescription?.created_at)}
                    onPress={() => navigation.navigate('PrescriptionDetail')}
                    title={t('CurrentPrescription')}
                    rightLabel={t('RightEye')}
                    leftLabel={t('LeftEye')}
                  />

                  <TouchableOpacity
                    onPress={() => navigation.navigate('PointMember')}
                  >
                    <ProfilePointSection
                      tierName={profile?.tier?.name}
                      points={profile?.loyalty_total_points}
                      remainingPoints={profile?.points_to_next_tier}
                      nextTier={profile?.next_tier?.name}
                      progress={calculateTierProgress(
                        profile?.loyalty_total_points,
                        profile?.tier?.min_points,
                        profile?.next_tier?.min_points,
                      )}
                    />
                  </TouchableOpacity>

                  <RewardButton
                    title={t('Rewards')}
                    subtitle={t('RewardSubtitle')}
                    onPress={() => navigation.navigate('Reward')}
                  />
                </>
              ) : (
                <>
                  <ProfileHeaderSkeleton />

                  <CurrentPrescriptionCardSkeleton />

                  <ProfilePointSectionSkeleton />
                </>
              )}
            </>
          )}

          {/* =======================
            SETTINGS FOR EVERYONE
        ======================== */}

          <ProfileSettingSection
            items={
              user
                ? settingItems
                : settingItems.filter(item => item.id !== 'logout')
            }
          />
        </ScrollView>

        <LanguagePickerModal
          visible={languageModalVisible}
          selectedLanguage={selectedLanguage}
          onClose={() => setLanguageModalVisible(false)}
          onSelectLanguage={handleChangeLanguage}
          title={t('Languages')}
          subtitle={t('ChooseYourLanguage')}
        />

        <LogoutModal
          visible={logoutModalVisible}
          onClose={() => setLogoutModalVisible(false)}
          onConfirmLogout={handleConfirmLogout}
        />
      </View>
    </GlassBackground>
  );
};

// ─── Authenticated styles ─────────────────────────────────────────────────────

// ─── Guest styles ─────────────────────────────────────────────────────────────

const guestStyles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.glow,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  featureCard: {
    width: '47.5%',
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  featureDesc: {
    fontSize: 11,
    color: Colors.gray500,
    lineHeight: 16,
    fontWeight: '400',
  },
  ctaWrap: { gap: Spacing.sm },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    ...Shadow.glow,
  },
  signInText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});

export default ProfileScreen;
