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
import { Card, StatCard, Badge, Divider, GlassBackground, GlassView } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';

const PERIODS = ['Today', 'Week', 'Month', 'Year'];

const REPORT_DATA = {
  Today:  { revenue: '$1,240',   orders: 8,    customers: 6,    topFrame: 'Classic Round' },
  Week:   { revenue: '$8,530',   orders: 54,   customers: 41,   topFrame: 'Aviator Pro' },
  Month:  { revenue: '$32,100',  orders: 210,  customers: 162,  topFrame: 'Wayfarer Plus' },
  Year:   { revenue: '$384,200', orders: 2480, customers: 1840, topFrame: 'Cat-Eye Chic' },
};

const RECENT_SALES = [
  { id: '#1042', customer: 'Ahmed Ali',    frame: 'Classic Round', amount: '$120', status: 'Paid'    },
  { id: '#1041', customer: 'Sara Mohamed', frame: 'Aviator Pro',   amount: '$150', status: 'Paid'    },
  { id: '#1040', customer: 'Omar Hassan',  frame: 'Cat-Eye Chic',  amount: '$200', status: 'Pending' },
  { id: '#1039', customer: 'Layla Nour',   frame: 'Gucci Slim',    amount: '$250', status: 'Failed'  },
];

const statusVariant: Record<string, 'success' | 'warning' | 'error'> = {
  Paid: 'success',
  Pending: 'warning',
  Failed: 'error',
};

const ReportScreen: React.FC = () => {
  const [period, setPeriod] = useState<keyof typeof REPORT_DATA>('Week');
  const data = REPORT_DATA[period];

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Reports</Text>

          {/* Period Selector */}
          <GlassView intensity="light" borderRadius={BorderRadius.lg} style={styles.periodRow} shadow={false}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p as keyof typeof REPORT_DATA)}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </GlassView>

          {/* Revenue Card — branded glass */}
          <Card style={styles.revenueCard}>
            {/* Tinted brand overlay */}
            <View style={styles.revenueTint} pointerEvents="none" />
            <View style={styles.revenueHighlight} pointerEvents="none" />
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>{data.revenue}</Text>
            <Badge label="↑ 12.5% vs last period" variant="success" style={{ marginTop: Spacing.sm }} />
          </Card>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Orders"
              value={String(data.orders)}
              color={Colors.primary}
              icon={<Ionicons name="cube-outline" size={20} color={Colors.primary} />}
              style={styles.statHalf}
            />
            <StatCard
              label="Customers"
              value={String(data.customers)}
              color={Colors.info}
              icon={<Ionicons name="people-outline" size={20} color={Colors.info} />}
              style={styles.statHalf}
            />
          </View>

          {/* Top Frame */}
          <Card style={styles.topFrameCard}>
            <Text style={styles.topFrameLabel}>Top Selling Frame</Text>
            <View style={styles.topFrameRow}>
              <GlassView intensity="light" borderRadius={BorderRadius.md} style={styles.topFrameIcon} shadow={false}>
                <Ionicons name="glasses-outline" size={22} color={Colors.primary} />
              </GlassView>
              <Text style={styles.topFrameName}>{data.topFrame}</Text>
            </View>
          </Card>

          {/* Recent Sales */}
          <Divider label="Recent Sales" />
          {RECENT_SALES.map(sale => (
            <Card key={sale.id} style={styles.saleCard}>
              <View style={styles.saleRow}>
                <GlassView intensity="light" borderRadius={BorderRadius.md} style={styles.saleIcon} shadow={false}>
                  <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
                </GlassView>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleId}>{sale.id}</Text>
                  <Text style={styles.saleCustomer}>{sale.customer}</Text>
                  <Text style={styles.saleFrame}>{sale.frame}</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleAmount}>{sale.amount}</Text>
                  <Badge
                    label={sale.status}
                    variant={statusVariant[sale.status]}
                    dot
                    style={{ marginTop: 4 }}
                  />
                </View>
              </View>
            </Card>
          ))}

          <View style={{ height: Spacing.xxl + 80 }} />
        </ScrollView>
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
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },

  // Period selector
  periodRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    ...Shadow.sm,
  },
  periodText: { fontSize: FontSize.sm, color: Colors.gray500, fontWeight: '600' },
  periodTextActive: { color: Colors.primary, fontWeight: '700' },

  // Revenue card
  revenueCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  revenueTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.glassTint,
    borderRadius: BorderRadius.lg,
  },
  revenueHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
  },
  revenueLabel: { fontSize: FontSize.sm, color: Colors.gray500, fontWeight: '600' },
  revenueValue: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
    letterSpacing: -1,
  },

  statsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statHalf: { flex: 1 },

  // Top frame
  topFrameCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  topFrameLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  topFrameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  topFrameIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  topFrameName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.black, letterSpacing: -0.3 },

  // Sale cards
  saleCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  saleIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  saleInfo: { flex: 1 },
  saleId: { fontSize: FontSize.xs, color: Colors.gray400, fontWeight: '600' },
  saleCustomer: { fontSize: FontSize.md, fontWeight: '700', color: Colors.black, marginTop: 2 },
  saleFrame: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 1 },
  saleRight: { alignItems: 'flex-end' },
  saleAmount: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.black, letterSpacing: -0.3 },
});

export default ReportScreen;
