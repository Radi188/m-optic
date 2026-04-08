import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Card, Button, AppModal, Input, Alert, Badge, Divider, GlassView, GlassBackground } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';

import { useAppDispatch, useAppSelector } from '../store';
import { selectUser, selectUserInitials, updateUser, clearUser } from '../store/slices/authSlice';
import { selectUnreadCount, selectNotifications, markAsRead, markAllRead } from '../store/slices/notificationsSlice';

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const initials = useAppSelector(selectUserInitials);
  const unreadCount = useAppSelector(selectUnreadCount);
  const notifications = useAppSelector(selectNotifications);

  const [editModal, setEditModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [notifModal, setNotifModal] = useState(false);

  // Edit form mirrors current user fields
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
    dispatch(updateUser({ name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() }));
    setEditModal(false);
  };

  const handleLogout = () => {
    dispatch(clearUser());
    setLogoutModal(false);
  };

  return (
    <GlassBackground>
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar Section */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
              <Badge
                label={user?.role === 'owner' ? 'Store Owner' : user?.role === 'manager' ? 'Manager' : 'Staff'}
                variant="primary"
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          </View>
          <Button
            title="Edit Profile"
            variant="outline"
            size="sm"
            fullWidth
            onPress={openEditModal}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Stats */}
        <View style={styles.miniStats}>
          {[
            { label: 'Sales', value: '2,480' },
            { label: 'Revenue', value: '$384K' },
            { label: 'Since', value: '2022' },
          ].map(s => (
            <View key={s.label} style={styles.miniStat}>
              <Text style={styles.miniValue}>{s.value}</Text>
              <Text style={styles.miniLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Alert
          type="success"
          message="Your account is verified and in good standing."
        />

        {/* Notifications Row */}
        <Divider label="Notifications" />
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setNotifModal(true)} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={styles.menuSub}>{unreadCount} unread</Text>
              )}
            </View>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Account Settings */}
        <Divider label="Account" />
        <Card style={styles.menuCard}>
          {[
            { icon: <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />, label: 'Change Password', onPress: () => setPwModal(true) },
            { icon: <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />, label: 'Two-Factor Auth', onPress: () => {} },
            { icon: <Ionicons name="globe-outline" size={20} color={Colors.primary} />, label: 'Language', subtitle: 'English', onPress: () => {} },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  {item.icon}
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {'subtitle' in item && item.subtitle && (
                    <Text style={styles.menuSub}>{item.subtitle}</Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </Card>

        {/* Logout */}
        <Divider />
        <Button
          title="Sign Out"
          variant="danger"
          fullWidth
          onPress={() => setLogoutModal(true)}
          style={{ marginBottom: Spacing.xxl }}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <AppModal
        visible={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Profile"
        actions={[
          { label: 'Save Changes', onPress: handleSaveProfile, variant: 'primary' },
          { label: 'Cancel', onPress: () => setEditModal(false), variant: 'ghost' },
        ]}
      >
        <Input
          label="Full Name"
          value={editName}
          onChangeText={setEditName}
          required
        />
        <Input
          label="Email"
          value={editEmail}
          onChangeText={setEditEmail}
          keyboardType="email-address"
          required
        />
        <Input
          label="Phone"
          value={editPhone}
          onChangeText={setEditPhone}
          keyboardType="phone-pad"
          placeholder="+1 234 567 8900"
        />
      </AppModal>

      {/* Change Password Modal */}
      <AppModal
        visible={pwModal}
        onClose={() => setPwModal(false)}
        title="Change Password"
        actions={[
          { label: 'Update Password', onPress: () => setPwModal(false), variant: 'primary' },
          { label: 'Cancel', onPress: () => setPwModal(false), variant: 'ghost' },
        ]}
      >
        <Input label="Current Password" secureTextEntry secureToggle required />
        <Input label="New Password" secureTextEntry secureToggle required />
        <Input label="Confirm Password" secureTextEntry secureToggle required />
      </AppModal>

      {/* Logout Confirmation Modal */}
      <AppModal
        visible={logoutModal}
        onClose={() => setLogoutModal(false)}
        title="Sign Out"
        actions={[
          { label: 'Sign Out', onPress: handleLogout, variant: 'danger' },
          { label: 'Cancel', onPress: () => setLogoutModal(false), variant: 'ghost' },
        ]}
      >
        <Text style={styles.logoutText}>
          Are you sure you want to sign out of M-Optic?
        </Text>
      </AppModal>

      {/* Notifications Modal */}
      <AppModal
        visible={notifModal}
        onClose={() => setNotifModal(false)}
        title="Notifications"
        actions={[
          { label: 'Mark All Read', onPress: () => dispatch(markAllRead()), variant: 'outline' },
          { label: 'Close', onPress: () => setNotifModal(false), variant: 'ghost' },
        ]}
      >
        {notifications.length === 0 ? (
          <Text style={styles.emptyNotif}>No notifications yet.</Text>
        ) : (
          notifications.map(n => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifItem, !n.read && styles.notifUnread]}
              onPress={() => dispatch(markAsRead(n.id))}
              activeOpacity={0.75}
            >
              <View style={styles.notifRow}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                {!n.read && <View style={styles.notifDot} />}
              </View>
              <Text style={styles.notifMsg}>{n.message}</Text>
            </TouchableOpacity>
          ))
        )}
      </AppModal>
    </SafeAreaView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: Spacing.lg },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
    letterSpacing: -0.5,
  },
  profileCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  avatarSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.glassBorderStrong,
    ...Shadow.glow,
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.black, letterSpacing: -0.3 },
  profileEmail: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
  miniStats: {
    flexDirection: 'row',
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  miniStat: { flex: 1, alignItems: 'center' },
  miniValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary, letterSpacing: -0.3 },
  miniLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  menuCard: { padding: 0, overflow: 'hidden', marginBottom: Spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.black },
  menuSub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.gray300, fontWeight: '300' },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 54 + Spacing.md },
  logoutText: { fontSize: FontSize.md, color: Colors.gray600, lineHeight: 22 },

  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginRight: Spacing.xs,
  },
  unreadBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  emptyNotif: { fontSize: FontSize.sm, color: Colors.gray400, textAlign: 'center', paddingVertical: Spacing.md },
  notifItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    backgroundColor: 'transparent',
  },
  notifUnread: { backgroundColor: Colors.primaryLight },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black, flex: 1 },
  notifDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginLeft: Spacing.xs,
  },
  notifMsg: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2, lineHeight: 16 },
});

export default ProfileScreen;
