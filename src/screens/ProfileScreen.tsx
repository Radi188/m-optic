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

  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

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
        subtitle: 'Manage alerts',
        icon: 'notifications-outline',
        onPress: () => navigation.navigate('NotificationSetting'),
      },
      {
        id: 'support',
        title: 'Support',
        subtitle: 'Help center',
        icon: 'headset-outline',
        onPress: () => {
          navigation.navigate('Support');
        },
      },
      {
        id: 'privacy',
        title: 'Privacy Policy',
        subtitle: 'Data and security',
        icon: 'shield-checkmark-outline',
        onPress: () => {
          navigation.navigate('Privacy');
        },
      },
      {
        id: 'logout',
        title: 'Logout',
        subtitle: 'Sign out from account',
        icon: 'log-out-outline',
        onPress: () => {
          setLogoutModalVisible(true);
        },
      },
    ],
    [languageLabel],
  );

  const openEditModal = () => {
    setEditName(user?.name ?? '');
    setEditEmail(user?.email ?? '');
    setEditPhone(user?.phone ?? '');
    setEditModal(true);
  };

  const handleSaveProfile = () => {
    dispatch(
      updateUser({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
      }),
    );
    setEditModal(false);
  };

  const handleLogout = () => {
    dispatch(clearUser());
    setLogoutModal(false);
  };

  // ── Guest view ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <NotLoginProfile onLoginPress={() => navigation.navigate('Login')} />
    );
  }

  // ── Authenticated view ────────────────────────────────────────────────────

  const tierProgress = Math.min((user.loyaltyPoints % 1000) / 10, 100);

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

  return (
    <GlassBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={guestStyles.scroll}
        >
          {/* <View style={guestStyles.hero}>
              <View style={guestStyles.iconWrap}>
                <Ionicons
                  name="person-circle-outline"
                  size={52}
                  color={Colors.primary}
                />
              </View>
              <Text style={guestStyles.heading}>
                Your Eyecare,{'\n'}All in One Place
              </Text>
              <Text style={guestStyles.sub}>
                Sign in to unlock your personal eyecare dashboard and exclusive
                member benefits.
              </Text>
            </View> */}
          <ProfileTitleHeader
            notificationCount={2}
            hasUnreadNotification={true}
            notificationPress={() => navigation.navigate('NotificationList')}
          />

          {!isLoading ? (
            <>
              <ProfileHeader
                name={profile?.customer_name}
                subtitle={profile?.tier?.name}
                avatarUrl={profile?.avatar_url || ''}
                notificationCount={2}
                onNotificationPress={() =>
                  navigation.navigate('NotificationList')
                }
                onEditPress={() => {
                  navigation.navigate('EditProfile');
                }}
                onCameraPress={() => {
                  console.log('Change profile image');
                }}
              />
              <CurrentPrescriptionCard
                rightEye={profile?.prescription?.right_eye}
                leftEye={profile?.prescription?.left_eye}
                updatedAt={formatDate(profile?.prescription?.created_at)}
                onPress={() => navigation.navigate('PrescriptionDetail')}
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
            </>
          ) : (
            <>
              <ProfileHeaderSkeleton />
              <CurrentPrescriptionCardSkeleton />
              <ProfilePointSectionSkeleton />
            </>
          )}

          {/* <View style={guestStyles.grid}>
              {GUEST_FEATURES.map(f => (
                <View key={f.title} style={guestStyles.featureCard}>
                  <View style={[guestStyles.featureIconWrap, { backgroundColor: f.bg }]}>
                    <Ionicons name={f.icon as any} size={22} color={f.color} />
                  </View>
                  <Text style={guestStyles.featureTitle}>{f.title}</Text>
                  <Text style={guestStyles.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View> */}

          <RewardButton onPress={() => navigation.navigate('Reward')} />

          <ProfileSettingSection items={settingItems} />

          {/* <View style={guestStyles.ctaWrap}>
              <TouchableOpacity
                style={guestStyles.signInBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Login')}
              >
                <Ionicons
                  name="log-in-outline"
                  size={18}
                  color={Colors.white}
                />
                <Text style={guestStyles.signInText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={guestStyles.registerBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={guestStyles.registerText}>
                  New here?{'  '}
                  <Text style={guestStyles.registerLink}>
                    Create an account
                  </Text>
                </Text>
              </TouchableOpacity>
            </View> */}
        </ScrollView>

        <LanguagePickerModal
          visible={languageModalVisible}
          selectedLanguage={selectedLanguage}
          onClose={() => setLanguageModalVisible(false)}
          onSelectLanguage={setSelectedLanguage}
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
  registerBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  registerText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontWeight: '500',
  },
  registerLink: { color: Colors.primary, fontWeight: '700' },
});

export default ProfileScreen;
