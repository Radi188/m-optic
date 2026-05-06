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
import { selectUser, selectUserInitials, updateUser, clearUser } from '../store/slices/authSlice';
import { selectUnreadCount, selectNotifications, markAsRead, markAllRead } from '../store/slices/notificationsSlice';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Guest feature list ───────────────────────────────────────────────────────

const GUEST_FEATURES = [
  { icon: 'eye-outline',            title: 'Refraction\nHistory',  desc: 'Track your eye prescription changes over time', color: Colors.primary,  bg: Colors.primaryLight },
  { icon: 'star-outline',           title: 'Loyalty\nPoints',      desc: 'Earn & redeem points on every purchase',         color: '#F4A830',       bg: 'rgba(244,168,48,0.14)' },
  { icon: 'pricetag-outline',       title: 'Member\nDiscounts',    desc: 'Exclusive deals & seasonal member offers',       color: '#2DBD7E',       bg: 'rgba(45,189,126,0.14)' },
  { icon: 'notifications-outline',  title: 'Smart\nAlerts',        desc: 'Promo & new stock notifications',                color: '#4DA8DA',       bg: 'rgba(77,168,218,0.14)' },
  { icon: 'scan-outline',           title: 'Face\nScan',           desc: 'Find frames that suit your face shape',          color: '#9B59B6',       bg: 'rgba(155,89,182,0.14)' },
  { icon: 'phone-portrait-outline', title: 'Mobile\nRefraction',   desc: 'Quick refraction test right from your phone',    color: '#E74C3C',       bg: 'rgba(231,76,60,0.14)' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
  const dispatch      = useAppDispatch();
  const navigation    = useNavigation<NavProp>();
  const insets        = useSafeAreaInsets();
  const user          = useAppSelector(selectUser);
  const initials      = useAppSelector(selectUserInitials);
  const unreadCount   = useAppSelector(selectUnreadCount);
  const notifications = useAppSelector(selectNotifications);

  const [editModal,   setEditModal]   = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [pwModal,     setPwModal]     = useState(false);
  const [notifModal,  setNotifModal]  = useState(false);

  const [editName,  setEditName]  = useState(user?.name  ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');

  const openEditModal = () => {
    setEditName(user?.name  ?? '');
    setEditEmail(user?.email ?? '');
    setEditPhone(user?.phone ?? '');
    setEditModal(true);
  };

  const handleSaveProfile = () => {
    dispatch(updateUser({ name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() }));
    setEditModal(false);
  };

  const handleLogout = () => {
    dispatch(clearUser());
    setLogoutModal(false);
  };

  // ── Guest view ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <GlassBackground>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={guestStyles.scroll}>
            <View style={guestStyles.hero}>
              <View style={guestStyles.iconWrap}>
                <Ionicons name="person-circle-outline" size={52} color={Colors.primary} />
              </View>
              <Text style={guestStyles.heading}>Your Eyecare,{'\n'}All in One Place</Text>
              <Text style={guestStyles.sub}>
                Sign in to unlock your personal eyecare dashboard and exclusive member benefits.
              </Text>
            </View>

            <View style={guestStyles.grid}>
              {GUEST_FEATURES.map(f => (
                <View key={f.title} style={guestStyles.featureCard}>
                  <View style={[guestStyles.featureIconWrap, { backgroundColor: f.bg }]}>
                    <Ionicons name={f.icon as any} size={22} color={f.color} />
                  </View>
                  <Text style={guestStyles.featureTitle}>{f.title}</Text>
                  <Text style={guestStyles.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View>

            <View style={guestStyles.ctaWrap}>
              <TouchableOpacity style={guestStyles.signInBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Login')}>
                <Ionicons name="log-in-outline" size={18} color={Colors.white} />
                <Text style={guestStyles.signInText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={guestStyles.registerBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Register')}>
                <Text style={guestStyles.registerText}>
                  New here?{'  '}
                  <Text style={guestStyles.registerLink}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </GlassBackground>
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
    { icon: 'eye-outline',      label: 'Refraction',  color: Colors.primary,  bg: Colors.primaryLight },
    { icon: 'receipt-outline',  label: 'Orders',      color: '#F4A830',       bg: 'rgba(244,168,48,0.14)' },
    { icon: 'pricetag-outline', label: 'Offers',      color: '#2DBD7E',       bg: 'rgba(45,189,126,0.14)' },
    { icon: 'scan-outline',     label: 'Face Scan',   color: '#9B59B6',       bg: 'rgba(155,89,182,0.14)' },
  ];

  const tierProgress = Math.min((user.loyaltyPoints % 1000) / 10, 100);

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        {/*
          View wrapper guarantees full screen width — LinearGradient alone does
          not always inherit width from an alignItems:'center' parent.
        */}
        <View style={[s.heroContainer, { paddingTop: insets.top }]}>
          <LinearGradient
            colors={['#2C1810', '#6B3D30', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Decorative soft glows for depth */}
          <View style={s.heroBubble1} />
          <View style={s.heroBubble2} />

          {/* Top bar */}
          <View style={s.heroBar}>
            <View style={{ width: 36 }} />
            <Text style={s.heroBarLabel}>My Profile</Text>
            <TouchableOpacity style={s.editBtn} onPress={openEditModal} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={15} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={s.avatarOuter}>
              <View style={s.avatarInner}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
            {user.isMember && (
              <View style={s.memberBadge}>
                <Ionicons name="star" size={10} color="#FFD166" />
              </View>
            )}
          </View>

          <Text style={s.heroName}>{user.name}</Text>
          <Text style={s.heroSub}>{user.phone || user.email || '—'}</Text>

          {/* Stat pills row */}
          <View style={s.statRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{user.loyaltyPoints.toLocaleString()}</Text>
              <Text style={s.statLabel}>Points</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>Tier {user.loyaltyTierId}</Text>
              <Text style={s.statLabel}>Level</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{user.gender || '—'}</Text>
              <Text style={s.statLabel}>Gender</Text>
            </View>
          </View>
        </View>

        {/* ── Body ─────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* Quick Actions */}
          <View style={s.quickRow}>
            {QUICK_ACTIONS.map(a => (
              <TouchableOpacity key={a.label} style={s.quickItem} activeOpacity={0.75}>
                <View style={[s.quickIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon as any} size={20} color={a.color} />
                </View>
                <Text style={s.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Loyalty card */}
          <View style={s.cardShadow}>
            <GlassView intensity="light" borderRadius={BorderRadius.lg} shadow={false}>
              <View style={s.loyaltyInner}>
              <View style={s.loyaltyTop}>
                <View style={s.loyaltyLeft}>
                  <View style={s.loyaltyIconBox}>
                    <Ionicons name="star" size={18} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={s.loyaltyLabel}>Loyalty Points</Text>
                    <Text style={s.loyaltyPoints}>{user.loyaltyPoints.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={s.tierBadge}>
                  <Ionicons name="trophy-outline" size={11} color={Colors.primary} />
                  <Text style={s.tierText}>Tier {user.loyaltyTierId}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={s.progressRow}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${tierProgress}%` as any }]} />
                </View>
                <Text style={s.progressLabel}>{user.loyaltyTotalPoints.toLocaleString()} total</Text>
              </View>
              <Text style={s.progressHint}>{1000 - (user.loyaltyPoints % 1000)} pts to next tier</Text>
              </View>
            </GlassView>
          </View>

          {/* Account info */}
          <Text style={s.sectionLabel}>Account Details</Text>
          <View style={s.cardShadow}>
            <GlassView intensity="light" borderRadius={BorderRadius.lg} shadow={false}>
              <View>
                {([
                  { icon: 'call-outline',     label: 'Phone',   value: user.phone || '—',                              color: '#2DBD7E' },
                  { icon: 'mail-outline',     label: 'Email',   value: user.email || 'Not provided',                   color: '#4DA8DA' },
                  { icon: 'location-outline', label: 'Branch',  value: user.branchId ? `Branch #${user.branchId}` : '—', color: '#F4A830' },
                ] as { icon: string; label: string; value: string; color: string }[]).map((row, i, arr) => (
                  <React.Fragment key={row.label}>
                    <View style={s.infoRow}>
                      <View style={[s.iconBox, { backgroundColor: row.color + '1A' }]}>
                        <Ionicons name={row.icon as any} size={16} color={row.color} />
                      </View>
                      <View style={s.rowText}>
                        <Text style={s.rowLabel}>{row.label}</Text>
                        <Text style={s.rowValue}>{row.value}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color={Colors.gray300} />
                    </View>
                    {i < arr.length - 1 && <View style={s.sep} />}
                  </React.Fragment>
                ))}
              </View>
            </GlassView>
          </View>

          {/* Preferences */}
          <Text style={s.sectionLabel}>Preferences</Text>
          <View style={s.cardShadow}>
            <GlassView intensity="light" borderRadius={BorderRadius.lg} shadow={false}>
              <View>
                {SETTINGS.map((item, i, arr) => (
                  <React.Fragment key={item.label}>
                    <TouchableOpacity style={s.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                      <View style={[s.iconBox, { backgroundColor: item.color + '1A' }]}>
                        <Ionicons name={item.icon as any} size={16} color={item.color} />
                      </View>
                      <View style={s.rowText}>
                        <Text style={s.menuLabel}>{item.label}</Text>
                        <Text style={s.menuSub}>{item.sub}</Text>
                      </View>
                      {item.badge ? (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                      <View style={s.rowChevron}>
                        <Ionicons name="chevron-forward" size={13} color={Colors.gray300} />
                      </View>
                    </TouchableOpacity>
                    {i < arr.length - 1 && <View style={s.sep} />}
                  </React.Fragment>
                ))}
              </View>
            </GlassView>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={s.signOutBtn} onPress={() => setLogoutModal(true)} activeOpacity={0.85}>
            <View style={s.signOutIconWrap}>
              <Ionicons name="log-out-outline" size={17} color="#E74C3C" />
            </View>
            <Text style={s.signOutText}>Sign Out</Text>
            <View style={s.signOutChevron}>
              <Ionicons name="chevron-forward" size={14} color="rgba(231,76,60,0.4)" />
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <AppModal
        visible={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Profile"
        actions={[
          { label: 'Save Changes', onPress: handleSaveProfile,         variant: 'primary' },
          { label: 'Cancel',       onPress: () => setEditModal(false), variant: 'ghost' },
        ]}
      >
        <Input label="Full Name" value={editName}  onChangeText={setEditName}  required />
        <Input label="Email"     value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" required />
        <Input label="Phone"     value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" placeholder="+1 234 567 8900" />
      </AppModal>

      <AppModal
        visible={pwModal}
        onClose={() => setPwModal(false)}
        title="Change Password"
        actions={[
          { label: 'Update Password', onPress: () => setPwModal(false), variant: 'primary' },
          { label: 'Cancel',          onPress: () => setPwModal(false), variant: 'ghost' },
        ]}
      >
        <Input label="Current Password" secureTextEntry secureToggle required />
        <Input label="New Password"     secureTextEntry secureToggle required />
        <Input label="Confirm Password" secureTextEntry secureToggle required />
      </AppModal>

      <AppModal
        visible={logoutModal}
        onClose={() => setLogoutModal(false)}
        title="Sign Out"
        actions={[
          { label: 'Sign Out', onPress: handleLogout,                variant: 'danger' },
          { label: 'Cancel',   onPress: () => setLogoutModal(false), variant: 'ghost' },
        ]}
      >
        <Text style={s.logoutBody}>Are you sure you want to sign out of M Optic?</Text>
      </AppModal>

      <AppModal
        visible={notifModal}
        onClose={() => setNotifModal(false)}
        title="Notifications"
        actions={[
          { label: 'Mark All Read', onPress: () => dispatch(markAllRead()), variant: 'outline' },
          { label: 'Close',         onPress: () => setNotifModal(false),    variant: 'ghost' },
        ]}
      >
        {notifications.length === 0 ? (
          <Text style={s.emptyNotif}>No notifications yet.</Text>
        ) : (
          notifications.map(n => (
            <TouchableOpacity
              key={n.id}
              style={[s.notifItem, !n.read && s.notifUnread]}
              onPress={() => dispatch(markAsRead(n.id))}
              activeOpacity={0.75}
            >
              <View style={s.notifRow}>
                <Text style={s.notifTitle}>{n.title}</Text>
                {!n.read && <View style={s.notifDot} />}
              </View>
              <Text style={s.notifMsg}>{n.message}</Text>
            </TouchableOpacity>
          ))
        )}
      </AppModal>
    </View>
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
  logoutBody:  { fontSize: FontSize.md, color: Colors.gray600, lineHeight: 22 },
  emptyNotif:  { fontSize: FontSize.sm, color: Colors.gray400, textAlign: 'center', paddingVertical: Spacing.md },
  notifItem:   { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  notifUnread: { backgroundColor: Colors.primaryLight },
  notifRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle:  { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black, flex: 1 },
  notifDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: Spacing.xs },
  notifMsg:    { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2, lineHeight: 16 },
});

// ─── Guest styles ─────────────────────────────────────────────────────────────

const guestStyles = StyleSheet.create({
  scroll:       { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
  hero:         { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.glow,
  },
  heading: {
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.black,
    letterSpacing: -0.6, textAlign: 'center', lineHeight: 32, marginBottom: Spacing.sm,
  },
  sub:          { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  featureCard: {
    width: '47.5%', backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder,
    padding: Spacing.md, gap: Spacing.xs, ...Shadow.sm,
  },
  featureIconWrap: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  featureTitle:    { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black, letterSpacing: -0.1, lineHeight: 18 },
  featureDesc:     { fontSize: 11, color: Colors.gray500, lineHeight: 16, fontWeight: '400' },
  ctaWrap:         { gap: Spacing.sm },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full, paddingVertical: 16, ...Shadow.glow,
  },
  signInText:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.white, letterSpacing: 0.2 },
  registerBtn:  { paddingVertical: Spacing.sm, alignItems: 'center' },
  registerText: { fontSize: FontSize.sm, color: Colors.gray500, fontWeight: '500' },
  registerLink: { color: Colors.primary, fontWeight: '700' },
});

export default ProfileScreen;
