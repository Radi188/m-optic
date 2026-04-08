import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  Button,
  Badge,
  AppModal,
  Input,
  GlassBackground,
} from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type {
  BottomTabParamList,
  RootStackParamList,
  GlassItem,
} from '../types/navigation';

import { useAppDispatch, useAppSelector } from '../store';
import {
  selectFilteredGlasses,
  selectBrands,
  selectSelectedBrand,
  selectSearchQuery,
  setSelectedBrand,
  setSearchQuery,
  addItem,
} from '../store/slices/glassSlice';

type GlassScreenNav = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Glass'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const statusVariant: Record<string, 'success' | 'warning' | 'error'> = {
  'In Stock': 'success',
  'Low Stock': 'warning',
  'Out of Stock': 'error',
};
const STOCK_COLORS: Record<string, string> = {
  'In Stock': Colors.success,
  'Low Stock': Colors.warning,
  'Out of Stock': Colors.error,
};

const { width } = Dimensions.get('window');
const CARD_GAP = Spacing.sm;
const CARD_WIDTH = (width - Spacing.lg * 2 - CARD_GAP) / 2;
const IMAGE_H = CARD_WIDTH * 0.9;

// ─── Add Frame Form State ─────────────────────────────────────────────────────

interface AddFrameForm {
  name: string;
  brand: string;
  price: string;
  stock: string;
}

const EMPTY_FORM: AddFrameForm = { name: '', brand: '', price: '', stock: '' };

// ─── Screen ───────────────────────────────────────────────────────────────────

const GlassScreen: React.FC = () => {
  const navigation = useNavigation<GlassScreenNav>();
  const dispatch = useAppDispatch();

  // ── Redux state ────────────────────────────────────────────────────────────
  const filtered = useAppSelector(selectFilteredGlasses);
  const brands = useAppSelector(selectBrands);
  const selectedBrand = useAppSelector(selectSelectedBrand);
  const searchQuery = useAppSelector(selectSearchQuery);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState<AddFrameForm>(EMPTY_FORM);

  const handleAddFrame = () => {
    if (!form.name.trim() || !form.brand.trim() || !form.price.trim()) return;

    const stock = parseInt(form.stock, 10) || 0;
    const newItem: GlassItem = {
      id: `user_${Date.now()}`,
      name: form.name.trim(),
      brand: form.brand.trim(),
      price: parseFloat(form.price) || 0,
      stock,
      status: stock === 0 ? 'Out of Stock' : stock <= 3 ? 'Low Stock' : 'In Stock',
      frameShape: 'rectangle',
      image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&w=400&q=75',
      description: '',
    };

    dispatch(addItem(newItem));
    setForm(EMPTY_FORM);
    setAddModal(false);
  };

  const renderCard = ({ item }: { item: GlassItem }) => {
    const accent = STOCK_COLORS[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GlassDetail', { glass: item })}
        activeOpacity={0.88}
      >
        <View style={styles.cardInner}>
          {/* Image */}
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} pointerEvents="none" />
            <View style={styles.imageHighlight} pointerEvents="none" />
            <View style={[styles.statusDot, { backgroundColor: accent }]} />
            <View style={styles.pill3d}>
              <Ionicons name="cube-outline" size={9} color={Colors.primary} />
              <Text style={styles.pill3dText}> 3D</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoArea}>
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand}
            </Text>
            <Text style={styles.frameName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.infoDiv} />
            <View style={styles.priceRow}>
              <Text style={styles.price}>${item.price}</Text>
              <Badge
                label={
                  item.status === 'In Stock'
                    ? `${item.stock} left`
                    : item.status === 'Low Stock'
                    ? 'Low'
                    : 'Out'
                }
                variant={statusVariant[item.status]}
                dot={item.status !== 'Out of Stock'}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Inventory</Text>
            <Text style={styles.title}>Glass Frames</Text>
          </View>
          <Button title="+ Add" size="sm" onPress={() => setAddModal(true)} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search frames or brand…"
            value={searchQuery}
            onChangeText={text => dispatch(setSearchQuery(text))}
            leftIcon={
              <Ionicons
                name="search-outline"
                size={16}
                color={Colors.gray400}
              />
            }
            containerStyle={styles.searchContainer}
          />
        </View>

        {/* Brand Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabs}
        >
          {brands.map(b => {
            const active = selectedBrand === b;
            return (
              <TouchableOpacity
                key={b}
                onPress={() => dispatch(setSelectedBrand(b))}
                activeOpacity={0.75}
                style={[styles.tab, active && styles.tabActive]}
              >
                {active && (
                  <View style={styles.tabHighlight} pointerEvents="none" />
                )}
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {b}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Count */}
        <Text style={styles.countLine}>
          {filtered.length} frame{filtered.length !== 1 ? 's' : ''}
          {selectedBrand !== 'All' ? ` · ${selectedBrand}` : ''}
        </Text>

        {/* Grid */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="glasses-outline"
                size={40}
                color={Colors.gray300}
              />
              <Text style={styles.emptyText}>No frames found</Text>
            </View>
          }
        />

        {/* Add Modal */}
        <AppModal
          visible={addModal}
          onClose={() => { setAddModal(false); setForm(EMPTY_FORM); }}
          title="Add Glass Frame"
          actions={[
            {
              label: 'Add Frame',
              onPress: handleAddFrame,
              variant: 'primary',
            },
            {
              label: 'Cancel',
              onPress: () => { setAddModal(false); setForm(EMPTY_FORM); },
              variant: 'ghost',
            },
          ]}
        >
          <Input
            label="Frame Name"
            placeholder="e.g. Classic Round"
            value={form.name}
            onChangeText={v => setForm(f => ({ ...f, name: v }))}
            required
          />
          <Input
            label="Brand"
            placeholder="e.g. Ray-Ban"
            value={form.brand}
            onChangeText={v => setForm(f => ({ ...f, brand: v }))}
            required
          />
          <Input
            label="Price ($)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={form.price}
            onChangeText={v => setForm(f => ({ ...f, price: v }))}
            required
          />
          <Input
            label="Initial Stock"
            placeholder="0"
            keyboardType="number-pad"
            value={form.stock}
            onChangeText={v => setForm(f => ({ ...f, stock: v }))}
          />
        </AppModal>
      </SafeAreaView>
    </GlassBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
  },

  searchWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchContainer: { marginBottom: 0 },

  tabs: { marginBottom: Spacing.sm },
  tabsContent: { paddingHorizontal: Spacing.lg },
  tab: {
    marginRight: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassSurfaceMid,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadow.sm,
  },
  tabHighlight: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
    paddingTop: 6,
    paddingBottom: 16,
  },
  tabTextActive: { color: Colors.white },

  countLine: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl + 80 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: { width: CARD_WIDTH, borderRadius: BorderRadius.xl, ...Shadow.md },
  cardInner: {
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },

  imageWrap: { width: CARD_WIDTH, height: IMAGE_H, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239,230,223,0.15)',
  },
  imageHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
  },
  statusDot: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  pill3d: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassSurfaceHigh,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  pill3dText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },

  infoArea: {
    paddingHorizontal: Spacing.sm + 2,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm + 2,
  },
  brandText: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  frameName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  description: {
    fontSize: 11,
    color: Colors.gray500,
    lineHeight: 15,
    marginTop: 4,
  },
  infoDiv: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.4,
  },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
  },
});

export default GlassScreen;
