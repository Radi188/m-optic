import React, { useState } from 'react';
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
  const SETTINGS = [
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      sub: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up',
      badge: unreadCount > 0 ? unreadCount : undefined,
      color: '#4DA8DA',
      onPress: () => setNotifModal(true),
    },
    {
      icon: 'lock-closed-outline',
      label: 'Change Password',
      sub: 'Update your credentials',
      badge: undefined,
      color: '#9B59B6',
      onPress: () => setPwModal(true),
    },
    {
      icon: 'globe-outline',
      label: 'Language',
      sub: 'English',
      badge: undefined,
      color: '#2DBD7E',
      onPress: () => {},
    },
  ];

  const QUICK_ACTIONS = [
    {
      icon: 'eye-outline',
      label: 'Refraction',
      color: Colors.primary,
      bg: Colors.primaryLight,
    },
    {
      icon: 'receipt-outline',
      label: 'Orders',
      color: '#F4A830',
      bg: 'rgba(244,168,48,0.14)',
    },
    {
      icon: 'pricetag-outline',
      label: 'Offers',
      color: '#2DBD7E',
      bg: 'rgba(45,189,126,0.14)',
    },
    {
      icon: 'scan-outline',
      label: 'Face Scan',
      color: '#9B59B6',
      bg: 'rgba(155,89,182,0.14)',
    },
  ];

  const tierProgress = Math.min((user.loyaltyPoints % 1000) / 10, 100);

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

          <ProfileHeader
            name={user.name}
            subtitle={user.customerType}
            memberTier="Gold Tier"
            avatarUrl="https://images.unsplash.com/photo-1654110455429-cf322b40a906?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            onEditPress={() => console.log('Edit profile')}
          />

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

          <CurrentPrescriptionCard />

          <ProfilePointSection
            tierName="M Optic Gold"
            points={1250}
            remainingPoints={750}
            nextTier="Platinum"
            progress={70}
          />

          <ProfileSettingSection />

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
      </View>
    </GlassBackground>
  );
};

// ─── Authenticated styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Hero — View wrapper fills screen width; gradient sits inside as absoluteFill
  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    overflow: 'hidden',
  },
  heroBubble1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.055)',
    top: -100,
    right: -80,
  },
  heroBubble2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.038)',
    bottom: 10,
    left: -60,
  },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  heroBarLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -0.2,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar — explicit 104×104 so the absolute member badge never escapes
  avatarWrap: {
    width: 104,
    height: 104,
    marginBottom: Spacing.md + 2,
  },
  avatarOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },
  memberBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3A1C10',
    borderWidth: 2.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.52)',
    fontWeight: '400',
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },

  // Stats row — alignSelf:'stretch' works inside alignItems:'center' parent
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Body
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.sm,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.gray600,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Loyalty
  loyaltyInner: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  loyaltyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loyaltyIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  loyaltyPoints: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
  },
  progressHint: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '500',
    marginTop: -2,
  },

  // Section label
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },

  // Card shadow wrapper — separates elevation from overflow:hidden+borderRadius
  cardShadow: {
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '500',
  },

  // Menu rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.black,
  },
  menuSub: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    marginTop: 1,
  },

  // Badge
  badge: {
    backgroundColor: '#E74C3C',
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  rowChevron: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // Separator — inset from icon column, flush on right
  sep: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 36 + Spacing.md + Spacing.md,
    marginRight: Spacing.md,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.15)',
    ...Shadow.sm,
  },
  signOutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(231,76,60,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#E74C3C',
    flex: 1,
  },
  signOutChevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  logoutBody: { fontSize: FontSize.md, color: Colors.gray600, lineHeight: 22 },
  emptyNotif: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  notifItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  notifUnread: { backgroundColor: Colors.primaryLight },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    flex: 1,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.xs,
  },
  notifMsg: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
    lineHeight: 16,
  },
});

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
