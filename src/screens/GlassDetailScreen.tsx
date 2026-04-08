import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import GlassModelScene from '../ar/GlassModelScene';
import GlassTryOnScene from '../ar/GlassTryOnScene';

type RouteProps = RouteProp<RootStackParamList, 'GlassDetail'>;
type NavProps = NativeStackNavigationProp<RootStackParamList, 'GlassDetail'>;

// ─── Per-frame mock spec data ─────────────────────────────────────────────────

const SPECS: Record<
  string,
  {
    material: string;
    lensType: string;
    uv: string;
    weight: string;
    fit: string;
    color: string;
  }
> = {
  '1': {
    material: 'Acetate',
    lensType: 'CR-39 UV400',
    uv: 'UV400',
    weight: '22g',
    fit: 'Medium',
    color: 'Tortoise',
  },
  '2': {
    material: 'Acetate',
    lensType: 'CR-39',
    uv: 'UV400',
    weight: '20g',
    fit: 'Medium',
    color: 'Black',
  },
  '3': {
    material: 'Acetate + Metal',
    lensType: 'CR-39 Polarized',
    uv: 'UV400',
    weight: '25g',
    fit: 'Wide',
    color: 'Havana',
  },
  '4': {
    material: 'Titanium',
    lensType: 'Polarized Glass',
    uv: 'UV400',
    weight: '15g',
    fit: 'Medium',
    color: 'Gold',
  },
  '5': {
    material: 'Titanium',
    lensType: 'Prizm Lens',
    uv: 'UV400',
    weight: '18g',
    fit: 'Large',
    color: 'Gunmetal',
  },
  '6': {
    material: 'O-Matter Nylon',
    lensType: 'Prizm Road',
    uv: 'UV400',
    weight: '26g',
    fit: 'Large',
    color: 'Matte Black',
  },
  '7': {
    material: 'Acetate',
    lensType: 'Blue-Light Filter',
    uv: 'UV420',
    weight: '21g',
    fit: 'Slim',
    color: 'Transparent',
  },
  '8': {
    material: 'Acetate + Metal',
    lensType: 'CR-39',
    uv: 'UV400',
    weight: '28g',
    fit: 'Wide',
    color: 'Black',
  },
  '9': {
    material: 'Acetate',
    lensType: 'CR-39 Gradient',
    uv: 'UV400',
    weight: '24g',
    fit: 'Large',
    color: 'Rose',
  },
  '10': {
    material: 'Acetate',
    lensType: 'CR-39 Gradient',
    uv: 'UV400',
    weight: '23g',
    fit: 'Medium',
    color: 'Burgundy',
  },
  '11': {
    material: 'Nylon',
    lensType: 'Polarized',
    uv: 'UV400',
    weight: '19g',
    fit: 'Sport',
    color: 'Red',
  },
  '12': {
    material: 'Acetate + Metal',
    lensType: 'CR-39',
    uv: 'UV400',
    weight: '22g',
    fit: 'Medium',
    color: 'Black',
  },
  '13': {
    material: 'Acetate',
    lensType: 'CR-39 Tinted',
    uv: 'UV400',
    weight: '27g',
    fit: 'Large',
    color: 'Gold',
  },
  '14': {
    material: 'Acetate',
    lensType: 'CR-39',
    uv: 'UV400',
    weight: '24g',
    fit: 'Medium',
    color: 'Black',
  },
  '15': {
    material: 'Metal',
    lensType: 'CR-39 Gradient',
    uv: 'UV400',
    weight: '20g',
    fit: 'Slim',
    color: 'Gold',
  },
  '16': {
    material: 'Acetate',
    lensType: 'CR-39',
    uv: 'UV400',
    weight: '26g',
    fit: 'Wide',
    color: 'Dark Havana',
  },
  '17': {
    material: 'Acetate + Metal',
    lensType: 'CR-39 Polarized',
    uv: 'UV400',
    weight: '28g',
    fit: 'Wide',
    color: 'Black',
  },
  '18': {
    material: 'Titanium',
    lensType: 'CR-39',
    uv: 'UV400',
    weight: '17g',
    fit: 'Medium',
    color: 'Silver',
  },
};

const STOCK_COLORS: Record<string, string> = {
  'In Stock': Colors.success,
  'Low Stock': Colors.warning,
  'Out of Stock': Colors.error,
};

// ─── Full-screen viewer modal ─────────────────────────────────────────────────

type ViewMode = '3d' | 'tryon';

interface ViewerModalProps {
  visible: boolean;
  mode: ViewMode;
  glass: RootStackParamList['GlassDetail']['glass'];
  onClose: () => void;
}

const ViewerModal: React.FC<ViewerModalProps> = ({
  visible,
  mode,
  glass,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={viewer.root}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Header */}
        <View style={[viewer.header, { paddingTop: insets.top + Spacing.xs }]}>
          <View style={viewer.headerHighlight} pointerEvents="none" />
          <TouchableOpacity
            style={viewer.closeBtn}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={viewer.title} numberOfLines={1}>
              {mode === '3d' ? '3D Model' : 'Try On'} — {glass.name}
            </Text>
            <Text style={viewer.subtitle}>
              {glass.brand} · ${glass.price}
            </Text>
          </View>
          <View
            style={[
              viewer.modePill,
              {
                backgroundColor:
                  mode === '3d' ? Colors.primaryLight : Colors.infoLight,
              },
            ]}
          >
            <Ionicons
              name={mode === '3d' ? 'cube-outline' : 'camera-outline'}
              size={12}
              color={mode === '3d' ? Colors.primary : Colors.info}
            />
            <Text
              style={[
                viewer.modeLabel,
                { color: mode === '3d' ? Colors.primary : Colors.info },
              ]}
            >
              {mode === '3d' ? '3D' : 'AR'}
            </Text>
          </View>
        </View>

        {/* Scene */}
        <View style={viewer.scene}>
          {mode === '3d' ? (
            <GlassModelScene glass={glass} />
          ) : (
            <GlassTryOnScene glass={glass} />
          )}
        </View>

        {/* Bottom hint */}
        <View
          style={[viewer.hint, { paddingBottom: insets.bottom + Spacing.xs }]}
        >
          <Ionicons
            name={mode === '3d' ? 'hand-left-outline' : 'camera-outline'}
            size={12}
            color="rgba(255,255,255,0.4)"
          />
          <Text style={viewer.hintText}>
            {mode === '3d'
              ? 'Drag to rotate · Pinch to zoom'
              : 'AR try-on simulation'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const GlassDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavProps>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { glass } = route.params;

  const [viewerMode, setViewerMode] = useState<ViewMode | null>(null);

  const spec = SPECS[glass.id];
  const accentColor = STOCK_COLORS[glass.status] ?? Colors.primary;

  const openViewer = (mode: ViewMode) => setViewerMode(mode);
  const closeViewer = () => setViewerMode(null);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Fixed Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {glass.name}
        </Text>
        <View
          style={[
            styles.stockBadge,
            {
              backgroundColor: accentColor + '20',
              borderColor: accentColor + '50',
            },
          ]}
        >
          <View style={[styles.stockDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.stockText, { color: accentColor }]}>
            {glass.status === 'In Stock' ? `${glass.stock} left` : glass.status}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Hero Image ──────────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: glass.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.brandPill}>
            <Text style={styles.brandPillText}>{glass.brand}</Text>
          </View>
        </View>

        {/* ── Name + Price ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.nameRow}>
            <Text style={styles.frameName}>{glass.name}</Text>
            <Text style={styles.framePrice}>${glass.price}</Text>
          </View>
          {glass.description ? (
            <Text style={styles.description}>{glass.description}</Text>
          ) : null}
        </View>

        {/* ── Specs ────────────────────────────────────────────────────────── */}
        {spec && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specsCard}>
              <View style={styles.specsHighlight} pointerEvents="none" />
              {[
                {
                  icon: 'layers-outline',
                  label: 'Frame Material',
                  value: spec.material,
                },
                {
                  icon: 'eye-outline',
                  label: 'Lens Type',
                  value: spec.lensType,
                },
                {
                  icon: 'sunny-outline',
                  label: 'UV Protection',
                  value: spec.uv,
                },
                {
                  icon: 'barbell-outline',
                  label: 'Weight',
                  value: spec.weight,
                },
                { icon: 'resize-outline', label: 'Fit', value: spec.fit },
                {
                  icon: 'color-palette-outline',
                  label: 'Color',
                  value: spec.color,
                },
              ].map((row, i, arr) => (
                <React.Fragment key={row.label}>
                  <View style={styles.specRow}>
                    <View style={styles.specIconWrap}>
                      <Ionicons
                        name={row.icon as any}
                        size={15}
                        color={Colors.primary}
                      />
                    </View>
                    <Text style={styles.specLabel}>{row.label}</Text>
                    <Text style={styles.specValue}>{row.value}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.specDiv} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ── Stock Info ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={[styles.stockCard, { borderColor: accentColor + '40' }]}>
            <View
              style={[styles.stockAccent, { backgroundColor: accentColor }]}
            />
            <View style={styles.stockCardContent}>
              <View
                style={[
                  styles.stockIconWrap,
                  { backgroundColor: accentColor + '18' },
                ]}
              >
                <Ionicons name="cube-outline" size={20} color={accentColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stockCardStatus, { color: accentColor }]}>
                  {glass.status}
                </Text>
                <Text style={styles.stockCardUnits}>
                  {glass.stock > 0
                    ? `${glass.stock} units available`
                    : 'Currently out of stock'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Floating Action Bar ──────────────────────────────────────────────── */}
      <View
        style={[styles.floatBar, { paddingBottom: insets.bottom + Spacing.sm }]}
      >
        <View style={styles.floatBarInner}>
          <View style={styles.floatBarHighlight} pointerEvents="none" />

          {/* 3D Model button */}
          <TouchableOpacity
            style={styles.floatBtn3d}
            onPress={() => openViewer('3d')}
            activeOpacity={0.88}
          >
            <View style={styles.floatBtn3dHighlight} pointerEvents="none" />
            <Ionicons name="cube-outline" size={18} color={Colors.white} />
            <Text style={styles.floatBtn3dLabel}>3D Model</Text>
          </TouchableOpacity>

          {/* Try On button */}
          <TouchableOpacity
            style={styles.floatBtnTryon}
            onPress={() => openViewer('tryon')}
            activeOpacity={0.88}
          >
            <View style={styles.floatBtnTryonHighlight} pointerEvents="none" />
            <Ionicons name="camera-outline" size={18} color={Colors.primary} />
            <Text style={styles.floatBtnTryonLabel}>Try On</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Viewer Modal ─────────────────────────────────────────────────────── */}
      {viewerMode !== null && (
        <ViewerModal
          visible={viewerMode !== null}
          mode={viewerMode}
          glass={glass}
          onClose={closeViewer}
        />
      )}
    </View>
  );
};

export default GlassDetailScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.glassSurfaceHigh,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassSurfaceMid,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Hero image
  heroWrap: { width: '100%', height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '80%' },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239,230,223,0.12)',
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // height: 80,
    backgroundColor: Colors.background,
    // Simulate gradient with opacity
    // opacity: 0.9,
  },
  brandPill: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.glassSurfaceHigh,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    ...Shadow.sm,
  },
  brandPillText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // Name + price
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  frameName: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
    marginRight: Spacing.sm,
  },
  framePrice: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  description: { fontSize: FontSize.sm, color: Colors.gray500, lineHeight: 20 },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    ...Shadow.md,
  },
  actionBtnInner: {
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    gap: Spacing.xs,
  },
  actionHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  actionSub: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
  },

  // Specs card
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  specsCard: {
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  specsHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.sm,
  },
  specIconWrap: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontWeight: '500',
  },
  specValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black },
  specDiv: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 46 + Spacing.md,
  },

  // Stock card
  stockCard: {
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  stockAccent: { height: 3 },
  stockCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  stockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockCardStatus: {
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  stockCardUnits: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    marginTop: 2,
  },

  // ── Floating action bar ──
  floatBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.glassSurfaceHigh,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    ...Shadow.lg,
  },
  floatBarInner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  floatBarHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.glassHighlight,
  },

  // 3D Model — solid primary fill, stands out
  floatBtn3d: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    overflow: 'hidden',
    ...Shadow.glow,
  },
  floatBtn3dHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  floatBtn3dLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },

  // Try On — glass outline secondary
  floatBtnTryon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
    paddingVertical: 14,
    overflow: 'hidden',
  },
  floatBtnTryonHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: Colors.glassHighlight,
  },
  floatBtnTryonLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
});

// ─── Viewer Modal Styles ───────────────────────────────────────────────────────

const viewer = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0B09' },
  scene: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: 'rgba(156,129,120,0.38)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  modeLabel: { fontSize: FontSize.xs, fontWeight: '700' },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingTop: Spacing.sm,
  },
  hintText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
});
