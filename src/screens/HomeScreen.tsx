import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  Button,
  StatCard,
  Card,
  AppModal,
  Alert,
  Toast,
  AppBottomSheetModal,
  Badge,
  Divider,
  GlassView,
  GlassBackground,
} from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';

const HomeScreen: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showToast = (type: typeof toastType) => {
    setToastType(type);
    setToastVisible(true);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>Good morning</Text>
                <Ionicons name="sunny-outline" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.name}>M-Optic Store</Text>
            </View>

            {/* Avatar glass pill */}
            <GlassView
              intensity="light"
              borderRadius={BorderRadius.full}
              style={styles.avatarGlass}
            >
              <Text style={styles.avatarText}>M</Text>
              {/* Notification dot */}
              <View style={styles.notifDot} />
            </GlassView>
          </View>

          {/* ── Quick metrics strip ── */}
          <GlassView intensity="ultralight" borderRadius={BorderRadius.xl} style={styles.metricStrip}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>$3,240</Text>
              <Text style={styles.metricLbl}>Revenue</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: Colors.success }]}>+12%</Text>
              <Text style={styles.metricLbl}>vs yesterday</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>24</Text>
              <Text style={styles.metricLbl}>Orders</Text>
            </View>
          </GlassView>

          {/* ── Stats ── */}
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Sales Today"
              value="24"
              color={Colors.primary}
              icon={<Ionicons name="cash-outline" size={20} color={Colors.primary} />}
              style={styles.statHalf}
            />
            <StatCard
              label="New Orders"
              value="8"
              color={Colors.success}
              icon={<Ionicons name="cube-outline" size={20} color={Colors.success} />}
              style={styles.statHalf}
            />
            <StatCard
              label="In Stock"
              value="142"
              color={Colors.warning}
              icon={<Ionicons name="glasses-outline" size={20} color={Colors.warning} />}
              style={styles.statHalf}
            />
            <StatCard
              label="Customers"
              value="310"
              color={Colors.info}
              icon={<Ionicons name="people-outline" size={20} color={Colors.info} />}
              style={styles.statHalf}
            />
          </View>

          {/* ── Alerts ── */}
          <Divider label="Alerts" />
          <Alert type="info"    title="New shipment"  message="Your order #1042 has been dispatched." dismissible />
          <Alert type="success" message="3 glasses sold successfully today." />
          <Alert type="warning" title="Low stock"     message="Oakley frame (black) has only 2 left." dismissible />
          <Alert type="error"   message="Payment failed for order #1039. Review needed." />

          {/* ── Buttons ── */}
          <Divider label="Components" />

          <Text style={styles.subLabel}>Buttons</Text>
          <View style={styles.btnRow}>
            <Button title="Primary"   variant="primary"   style={styles.btnFlex} />
            <Button title="Secondary" variant="secondary" style={styles.btnFlex} />
          </View>
          <View style={styles.btnRow}>
            <Button title="Outline"   variant="outline"   style={styles.btnFlex} />
            <Button title="Danger"    variant="danger"    style={styles.btnFlex} />
          </View>
          <Button title="Loading State" variant="primary" loading fullWidth style={{ marginBottom: Spacing.sm }} />
          <Button title="Disabled"      variant="primary" disabled fullWidth style={{ marginBottom: Spacing.sm }} />

          {/* ── Badges ── */}
          <Text style={styles.subLabel}>Badges</Text>
          <View style={styles.badgeRow}>
            <Badge label="Primary" variant="primary" />
            <Badge label="Success" variant="success" dot />
            <Badge label="Warning" variant="warning" dot />
            <Badge label="Error"   variant="error" />
            <Badge label="Neutral" variant="neutral" />
          </View>

          {/* ── Cards ── */}
          <Text style={styles.subLabel}>Cards</Text>
          <Card style={{ marginBottom: Spacing.sm }}>
            <View style={styles.cardDemoRow}>
              <GlassView intensity="medium" borderRadius={BorderRadius.md} style={styles.cardIcon} shadow={false}>
                <Ionicons name="glasses-outline" size={22} color={Colors.primary} />
              </GlassView>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardDemoTitle}>Classic Round</Text>
                <Text style={styles.cardDemoSub}>Ray-Ban · $120</Text>
              </View>
              <Badge label="In Stock" variant="success" dot />
            </View>
          </Card>

          {/* ── Toasts ── */}
          <Text style={styles.subLabel}>Toasts</Text>
          <View style={styles.btnRow}>
            <Button title="✓ Success" variant="secondary" onPress={() => showToast('success')} style={styles.btnFlex} size="sm" />
            <Button title="✕ Error"   variant="outline"   onPress={() => showToast('error')}   style={styles.btnFlex} size="sm" />
          </View>
          <View style={styles.btnRow}>
            <Button title="! Warning" variant="ghost" onPress={() => showToast('warning')} style={styles.btnFlex} size="sm" />
            <Button title="i Info"    variant="ghost" onPress={() => showToast('info')}    style={styles.btnFlex} size="sm" />
          </View>

          {/* ── Overlays ── */}
          <Divider label="Overlays" />
          <Button
            title="Open Modal"
            variant="primary"
            fullWidth
            onPress={() => setModalVisible(true)}
            style={{ marginBottom: Spacing.sm }}
          />
          <Button
            title="Open Bottom Sheet"
            variant="secondary"
            fullWidth
            onPress={() => bottomSheetRef.current?.present()}
            style={{ marginBottom: Spacing.xxl + 80 }}
          />
        </ScrollView>

        {/* ── Modal ── */}
        <AppModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title="Add New Glass Frame"
          actions={[
            { label: 'Save Frame', onPress: () => setModalVisible(false), variant: 'primary' },
            { label: 'Cancel',     onPress: () => setModalVisible(false), variant: 'ghost' },
          ]}
        >
          <Text style={styles.modalText}>
            Fill in the frame details to add it to your inventory. Stock will be updated immediately.
          </Text>
          <Alert type="info" message="SKU will be auto-generated on save." />
        </AppModal>

        {/* ── Bottom Sheet ── */}
        <AppBottomSheetModal ref={bottomSheetRef} title="Quick Actions" snapPoints={['45%']}>
          <View style={styles.sheetContent}>
            <Button title="Add New Frame"  variant="primary"   fullWidth style={{ marginBottom: Spacing.sm }} />
            <Button title="Record Sale"    variant="secondary" fullWidth style={{ marginBottom: Spacing.sm }} />
            <Button title="View Reports"   variant="outline"   fullWidth style={{ marginBottom: Spacing.sm }} />
            <Button title="Close"          variant="ghost"     fullWidth onPress={() => bottomSheetRef.current?.dismiss()} />
          </View>
        </AppBottomSheetModal>

        {/* ── Toast ── */}
        <Toast
          visible={toastVisible}
          type={toastType}
          message={`This is a ${toastType} toast!`}
          onHide={() => setToastVisible(false)}
        />
      </SafeAreaView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: FontSize.sm, color: Colors.gray500, fontWeight: '500' },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    marginTop: 3,
    letterSpacing: -0.5,
  },
  avatarGlass: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: FontSize.lg,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.glassHighlight,
  },

  // Metric strip
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metricItem:    { flex: 1, alignItems: 'center' },
  metricVal:     { fontSize: FontSize.lg, fontWeight: '800', color: Colors.black, letterSpacing: -0.3 },
  metricLbl:     { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2, fontWeight: '500' },
  metricDivider: { width: 1, height: 32, backgroundColor: Colors.divider },

  // Section labels
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.gray700,
    marginBottom: Spacing.md,
    letterSpacing: 0.1,
  },
  subLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray600,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    letterSpacing: 0.1,
  },

  // Grids
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statHalf: { flex: 1, minWidth: '45%' },

  // Buttons
  btnRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  btnFlex: { flex: 1 },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // Card demo
  cardDemoRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  cardDemoTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.black },
  cardDemoSub:   { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },

  // Modal / sheet
  modalText: {
    fontSize: FontSize.md,
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  sheetContent: { padding: Spacing.lg },
});

export default HomeScreen;
