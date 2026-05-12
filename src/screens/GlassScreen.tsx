import React, { useMemo, useState } from 'react';
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

import { AppModal, Input, GlassBackground } from '../components/ui';
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
import GlassCard from '../components/ui/GlassesCard/GlassesCard';
import { brandsData } from '../components/ui/Home/BrandSection';
import SearchTrigger from '../components/ui/Search/SearchBar';
import { Product } from '../types/glasses';
import { useProductList } from '../hook/useProductList';
import GlassScreenSkeleton from '../components/ui/Loading/loadingGlassesScreen';
import FilterModal from '../components/ui/Modal/FilterModal';

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
const CARD_GAP = Spacing.xs;
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

  const selectedBrand = useAppSelector(selectSelectedBrand);
  const searchQuery = useAppSelector(selectSearchQuery);

  const {
    products,
    brands,
    meta,
    loading,
    brandLoading,
    error,
    filters,
    setFilters,
    refetch,
  } = useProductList({
    page: 1,
    is_active_mobile: true,
    limit: 10,
  });

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState<AddFrameForm>(EMPTY_FORM);

  const [filterModal, setFilterModal] = useState(false);
  const [tempBrand, setTempBrand] = useState<number | 'all'>(
    filters.brand_1 ? Number(filters.brand_1) : 'all',
  );
  const [tempFrame, setTempFrame] = useState<string>('all');
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');

  const frameOptions = [
    { label: 'All', value: 'all' },
    { label: 'Round', value: 'round' },
    { label: 'Rectangle', value: 'rectangle' },
    { label: 'Square', value: 'square' },
    { label: 'Cat Eye', value: 'cat-eye' },
    { label: 'Aviator', value: 'aviator' },
  ];

  const openFilterModal = () => {
    setTempBrand(filters.brand_1 ? Number(filters.brand_1) : 'all');
    setTempFrame(filters.frame_shape ? String(filters.frame_shape) : 'all');
    setTempMinPrice(filters.min_price ? String(filters.min_price) : '');
    setTempMaxPrice(filters.max_price ? String(filters.max_price) : '');
    setFilterModal(true);
  };

  const applyFilters = () => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      brand_1: tempBrand === 'all' ? undefined : tempBrand,
      frame_shape: tempFrame === 'all' ? undefined : tempFrame,
      min_price: tempMinPrice.trim() ? Number(tempMinPrice) : undefined,
      max_price: tempMaxPrice.trim() ? Number(tempMaxPrice) : undefined,
    }));

    setFilterModal(false);
  };

  const resetFilters = () => {
    setTempBrand('all');
    setTempFrame('all');
    setTempMinPrice('');
    setTempMaxPrice('');

    setFilters(prev => ({
      ...prev,
      page: 1,
      brand_1: undefined,
      frame_shape: undefined,
      min_price: undefined,
      max_price: undefined,
    }));

    setFilterModal(false);
  };

  const handleSelectBrand = (brandId: number | 'all') => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      brand_1: brandId === 'all' ? undefined : brandId,
    }));
  };

  const handleAddFrame = () => {
    if (!form.name.trim() || !form.brand.trim() || !form.price.trim()) return;

    const stock = parseInt(form.stock, 10) || 0;
    const newItem: GlassItem = {
      id: `user_${Date.now()}`,
      name: form.name.trim(),
      brand: form.brand.trim(),
      price: parseFloat(form.price) || 0,
      stock,
      status:
        stock === 0 ? 'Out of Stock' : stock <= 3 ? 'Low Stock' : 'In Stock',
      frameShape: 'rectangle',
      image:
        'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&w=400&q=75',
      description: '',
    };

    dispatch(addItem(newItem));
    setForm(EMPTY_FORM);
    setAddModal(false);
  };

  const formatData = (data: any[], numColumns: number) => {
    const newData = [...data];
    const remainder = newData.length % numColumns;

    if (remainder !== 0) {
      for (let i = 0; i < numColumns - remainder; i++) {
        newData.push({ id: `empty-${i}`, empty: true });
      }
    }

    return newData;
  };

  const brandTabs = useMemo(
    () => [{ id: 'all', name: 'All' }, ...brands],
    [brands],
  );

  const renderCard = ({ item }: { item: Product }) => {
    if (item.empty) {
      return <View style={[styles.card, { opacity: 0 }]} />;
    }
    return (
      <GlassCard
        item={item}
        onPress={() => navigation.navigate('GlassDetail', { id: item.id })}
        onTryOn={() => navigation.navigate('VirtualTryOn', { glass: item })}
      />
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
          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.8}
            onPress={openFilterModal}
          >
            <Ionicons name="options-outline" size={20} color={Colors.primary} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>
        {/* Search */}
        {/* <View style={styles.searchWrap}>
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
        </View> */}
        <View style={styles.searchContainer}>
          <SearchTrigger onPress={() => navigation.navigate('SearchScreen')} />
        </View>

        {/* Brand Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabs}
        >
          {brandLoading
            ? [1, 2, 3, 4].map(item => (
                <View key={item} style={styles.tab}>
                  <View style={styles.brandSkeleton} />
                </View>
              ))
            : brandTabs.map(b => {
                const active =
                  b.id === 'all' ? !filters.brand_1 : filters.brand_1 === b.id;

                return (
                  <TouchableOpacity
                    key={b.id || b.name}
                    onPress={() =>
                      handleSelectBrand(b.id === 'all' ? 'all' : Number(b.id))
                    }
                    activeOpacity={0.75}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    {active && (
                      <View style={styles.tabHighlight} pointerEvents="none" />
                    )}

                    {b.name === 'All' || !b.logo ? (
                      <Text
                        style={[styles.tabText, active && styles.tabTextActive]}
                      >
                        {b.name}
                      </Text>
                    ) : (
                      <Image
                        source={{ uri: b.logo }}
                        style={styles.logo}
                        resizeMode="contain"
                      />
                    )}
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
        {loading ? (
          <GlassScreenSkeleton />
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color={Colors.error}
            />
            <Text style={styles.emptyText}>{error}</Text>

            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={formatData(products, 2)}
            keyExtractor={item => String(item.id)}
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
        )}
        {/* Add Modal */}
        <AppModal
          visible={addModal}
          onClose={() => {
            setAddModal(false);
            setForm(EMPTY_FORM);
          }}
          title="Add Glass Frame"
          actions={[
            {
              label: 'Add Frame',
              onPress: handleAddFrame,
              variant: 'primary',
            },
            {
              label: 'Cancel',
              onPress: () => {
                setAddModal(false);
                setForm(EMPTY_FORM);
              },
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

        <FilterModal
          visible={filterModal}
          onClose={() => setFilterModal(false)}
          onApply={applyFilters}
          onReset={resetFilters}
          brandTabs={brandTabs}
          frameOptions={frameOptions}
          tempBrand={tempBrand}
          tempFrame={tempFrame}
          tempMinPrice={tempMinPrice}
          tempMaxPrice={tempMaxPrice}
          setTempBrand={setTempBrand}
          setTempFrame={setTempFrame}
          setTempMinPrice={setTempMinPrice}
          setTempMaxPrice={setTempMaxPrice}
        />
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
  searchContainer: { marginBottom: Spacing.md },

  tabs: { marginBottom: Spacing.md, height: 60 },
  tabsContent: { paddingHorizontal: Spacing.lg },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.gray500,
  },
  tabTextActive: { color: Colors.primary },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    transform: [{ scale: 1.4 }],
  },

  tab: {
    width: 85,
    height: 35,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.gray200,
  },

  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#b09080',
  },
  tabHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.sm,
  },
  brandSkeleton: {
    width: 50,
    height: 14,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
  },

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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },

  filterBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },

  retryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});

export default GlassScreen;
