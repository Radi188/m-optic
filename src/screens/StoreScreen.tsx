import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Card, Button, AppModal, Input, Alert, Divider, GlassBackground, GlassView } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  rightEl?: React.ReactNode;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, subtitle, onPress, rightEl, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
      {icon}
    </View>
    <View style={styles.menuText}>
      <Text style={[styles.menuLabel, danger && { color: Colors.error }]}>{label}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {rightEl ?? <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

const StoreScreen: React.FC = () => {
  const [editModal, setEditModal] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Store</Text>

          {/* Store Info Card */}
          <Card style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <GlassView intensity="medium" borderRadius={BorderRadius.lg} style={styles.storeLogo} shadow={false}>
                {/* Specular on logo */}
                <Text style={styles.storeLogoText}>M</Text>
              </GlassView>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>M-Optic Store</Text>
                <Text style={styles.storeAddr}>123 Vision Street, City</Text>
                <Text style={styles.storePhone}>+1 234 567 8900</Text>
              </View>
            </View>
            <Button
              title="Edit Store Info"
              variant="outline"
              size="sm"
              fullWidth
              onPress={() => setEditModal(true)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>

          {/* Alert */}
          <Alert
            type="warning"
            title="Subscription"
            message="Your Pro plan renews on May 1, 2026."
          />

          {/* Settings */}
          <Divider label="Settings" />
          <Card style={styles.menuCard}>
            <MenuItem
              icon={<Ionicons name="notifications-outline" size={20} color={Colors.primary} />}
              label="Notifications"
              subtitle="Sales, stock, and order alerts"
              onPress={() => {}}
              rightEl={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Ionicons name="cloud-outline" size={20} color={Colors.primary} />}
              label="Auto Backup"
              subtitle="Daily cloud backup"
              onPress={() => {}}
              rightEl={
                <Switch
                  value={autoBackup}
                  onValueChange={setAutoBackup}
                  trackColor={{ true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <MenuItem icon={<Ionicons name="print-outline" size={20} color={Colors.primary} />} label="Receipt Printer" subtitle="Not connected" onPress={() => {}} />
            <View style={styles.divider} />
            <MenuItem icon={<Ionicons name="cash-outline" size={20} color={Colors.primary} />} label="Currency" subtitle="USD ($)" onPress={() => {}} />
          </Card>

          <Divider label="Manage" />
          <Card style={styles.menuCard}>
            <MenuItem icon={<Ionicons name="people-outline" size={20} color={Colors.primary} />} label="Staff Accounts" subtitle="3 active staff" onPress={() => {}} />
            <View style={styles.divider} />
            <MenuItem icon={<Ionicons name="pricetag-outline" size={20} color={Colors.primary} />} label="Pricing Rules" subtitle="Discounts & promotions" onPress={() => {}} />
            <View style={styles.divider} />
            <MenuItem icon={<Ionicons name="receipt-outline" size={20} color={Colors.primary} />} label="Tax Settings" subtitle="15% VAT" onPress={() => {}} />
          </Card>

          <Divider label="Danger Zone" />
          <Card style={styles.menuCard}>
            <MenuItem icon={<Ionicons name="trash-outline" size={20} color={Colors.error} />} label="Clear All Data" onPress={() => {}} danger />
          </Card>

          <View style={{ height: Spacing.xxl + 80 }} />
        </ScrollView>

        {/* Edit Modal */}
        <AppModal
          visible={editModal}
          onClose={() => setEditModal(false)}
          title="Edit Store Info"
          actions={[
            { label: 'Save Changes', onPress: () => setEditModal(false), variant: 'primary' },
            { label: 'Cancel', onPress: () => setEditModal(false), variant: 'ghost' },
          ]}
        >
          <Input label="Store Name" defaultValue="M-Optic Store" required />
          <Input label="Address" defaultValue="123 Vision Street, City" />
          <Input label="Phone" defaultValue="+1 234 567 8900" keyboardType="phone-pad" />
          <Input label="Email" defaultValue="info@moptic.com" keyboardType="email-address" />
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
  storeCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  storeHeader: { flexDirection: 'row', alignItems: 'center' },
  storeLogo: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.glassBorderStrong,
    ...Shadow.glow,
  },
  storeLogoText: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '900' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.black, letterSpacing: -0.3 },
  storeAddr: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
  storePhone: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
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
  menuIconDanger: {
    backgroundColor: Colors.errorLight,
    borderColor: 'rgba(240, 82, 82, 0.25)',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.black },
  menuSubtitle: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.gray300, fontWeight: '300' },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 56 + Spacing.md },
});

export default StoreScreen;
