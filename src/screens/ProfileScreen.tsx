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
      sub: unreadCount > 0 ? `${unreadCount} unread` : undefined,
      badge: unreadCount > 0 ? unreadCount : undefined,
      onPress: () => setNotifModal(true),
    },
    {
      icon: 'lock-closed-outline',
      label: 'Change Password',
      sub: undefined,
      badge: undefined,
      onPress: () => setPwModal(true),
    },
    {
      icon: 'globe-outline',
      label: 'Language',
      sub: 'English',
      badge: undefined,
      onPress: () => {},
    },
  ];

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#5C4340', Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { paddingTop: insets.top + Spacing.sm }]}
        >
          <View style={s.heroBar}>
            <Text style={s.heroBarLabel}>Profile</Text>
            <TouchableOpacity style={s.editBtn} onPress={openEditModal} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.heroName}>{user.name}</Text>
          <Text style={s.heroSub}>{user.phone || user.email || '—'}</Text>

          <View style={s.pillsRow}>
            {user.isMember && (
              <View style={s.pill}>
                <Ionicons name="star" size={10} color="rgba(255,255,255,0.9)" />
                <Text style={s.pillText}>Member</Text>
              </View>
            )}
            {user.gender && (
              <View style={s.pill}>
                <Ionicons name="person-outline" size={10} color="rgba(255,255,255,0.9)" />
                <Text style={s.pillText}>{user.gender}</Text>
              </View>
            )}
            <View style={s.pill}>
              <Ionicons name="trophy-outline" size={10} color="rgba(255,255,255,0.9)" />
              <Text style={s.pillText}>Tier {user.loyaltyTierId}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Body ─────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* Loyalty card */}
          <GlassView intensity="light" borderRadius={BorderRadius.lg}>
            <View style={s.loyaltyInner}>
              <View style={s.loyaltyLeft}>
                <View style={s.loyaltyIconBox}>
                  <Ionicons name="star" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={s.loyaltyLabel}>Loyalty Points</Text>
                  <Text style={s.loyaltyPoints}>{user.loyaltyPoints.toLocaleString()}</Text>
                </View>
              </View>
              <View style={s.loyaltyRight}>
                <View style={s.tierBadge}>
                  <Text style={s.tierText}>Tier {user.loyaltyTierId}</Text>
                </View>
                <Text style={s.loyaltyTotal}>{user.loyaltyTotalPoints.toLocaleString()} total</Text>
              </View>
            </View>
          </GlassView>

          {/* Account info */}
          <Text style={s.sectionLabel}>Account</Text>
          <GlassView intensity="light" borderRadius={BorderRadius.lg} style={{ overflow: 'hidden' }}>
            {([
              { icon: 'call-outline',     label: 'Phone',  value: user.phone || '—' },
              { icon: 'mail-outline',     label: 'Email',  value: user.email || 'Not provided' },
              { icon: 'location-outline', label: 'Branch', value: user.branchId ? `Branch #${user.branchId}` : '—' },
            ] as { icon: string; label: string; value: string }[]).map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={s.infoRow}>
                  <View style={s.iconBox}>
                    <Ionicons name={row.icon as any} size={16} color={Colors.primary} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{row.label}</Text>
                    <Text style={s.rowValue}>{row.value}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={s.sep} />}
              </React.Fragment>
            ))}
          </GlassView>

          {/* Preferences */}
          <Text style={s.sectionLabel}>Preferences</Text>
          <GlassView intensity="light" borderRadius={BorderRadius.lg} style={{ overflow: 'hidden' }}>
            {SETTINGS.map((item, i, arr) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity style={s.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                  <View style={s.iconBox}>
                    <Ionicons name={item.icon as any} size={16} color={Colors.primary} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    {item.sub ? <Text style={s.menuSub}>{item.sub}</Text> : null}
                  </View>
                  {item.badge ? (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={15} color={Colors.gray300} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={s.sep} />}
              </React.Fragment>
            ))}
          </GlassView>

          {/* Sign out */}
          <TouchableOpacity style={s.signOutBtn} onPress={() => setLogoutModal(true)} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color="#E74C3C" />
            <Text style={s.signOutText}>Sign Out</Text>
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

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + 8,
  },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  heroBarLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.glow,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '400',
    marginBottom: Spacing.lg,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },

  // Body
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },

  // Loyalty
  loyaltyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loyaltyIconBox: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  loyaltyPoints: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  loyaltyRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  tierBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  loyaltyTotal: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
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
    backgroundColor: Colors.primaryLight,
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

  // Separator
  sep: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 36 + Spacing.md + Spacing.md,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.xs,
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.18)',
    ...Shadow.sm,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#E74C3C',
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
