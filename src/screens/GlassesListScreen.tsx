import React, { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppModal, Input, GlassBackground } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList, GlassItem } from '../types/navigation';

import { useAppDispatch, useAppSelector } from '../store';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import { FREE_PRICE_PREVIEW, isPriceVisible } from '../utils/priceGate';
import { addItem } from '../store/slices/glassSlice';
import GlassCard from '../components/ui/GlassesCard/GlassesCard';
import SearchTrigger from '../components/ui/Search/SearchBar';
import { Product } from '../types/glasses';
import { useProductList } from '../hook/useProductList';
import GlassScreenSkeleton from '../components/ui/Loading/loadingGlassesScreen';
import FilterModal from '../components/ui/Modal/FilterModal';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import AppText from '../components/AppText';

type GlassesListNav = NativeStackNavigationProp<RootStackParamList>;
type GlassesListRoute = NativeStackScreenProps<
  RootStackParamList,
  'GlassesList'
>['route'];

const { width } = Dimensions.get('window');
const CARD_GAP = Spacing.xs;
const CARD_WIDTH = (width - Spacing.lg * 2 - CARD_GAP) / 2;

interface AddFrameForm {
  name: string;
  brand: string;
  price: string;
  stock: string;
}

const EMPTY_FORM: AddFrameForm = {
  name: '',
  brand: '',
  price: '',
  stock: '',
};

const normalize = (value?: string) => value?.toLowerCase().trim();

const GlassesListScreen: React.FC = () => {
  const navigation = useNavigation<GlassesListNav>();
  const route = useRoute<GlassesListRoute>();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const goToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const from = route.params?.from || 'brand';
  const initialBrandId = route.params?.brandId;
  const initialBrandName = route.params?.brandName;
  const initialFrameShape = route.params?.frameShape;

  const [activeBrandId, setActiveBrandId] = useState<number | 'all'>(
    from === 'brand' && initialBrandId && initialBrandId !== 'all'
      ? Number(initialBrandId)
      : 'all',
  );

  const [activeFrame, setActiveFrame] = useState<string>(
    from === 'frame' && initialFrameShape
      ? normalize(initialFrameShape) || 'all'
      : 'all',
  );

  const {
    products,
    brands,
    frameShapes,
    loading,
    isRefreshing,
    brandLoading,
    frameLoading,
    error,
    filters,
    setFilters,
    refetch,
    refresh,
    refetchBrands,
    refetchFrames,
    meta,
  } = useProductList({
    page: 1,
    is_active_mobile: true,
    limit: 10,
    brand_1:
      from === 'brand' && initialBrandId && initialBrandId !== 'all'
        ? Number(initialBrandId)
        : undefined,
    frame_shape:
      from === 'frame' && initialFrameShape && initialFrameShape !== 'all'
        ? normalize(initialFrameShape)
        : undefined,
  });

  const brandTabs = useMemo(() => {
    const allTab = { id: 'all', name: 'All' };

    if (!initialBrandId || initialBrandId === 'all') {
      return [allTab, ...brands];
    }

    const selectedBrand = brands.find(
      brand => String(brand.id) === String(initialBrandId),
    );

    const otherBrands = brands.filter(
      brand => String(brand.id) !== String(initialBrandId),
    );

    return selectedBrand
      ? [allTab, selectedBrand, ...otherBrands]
      : [allTab, ...brands];
  }, [brands, initialBrandId]);

  const frameTabs = useMemo(() => {
    const allTab = { id: 'all', name: 'All', image: '' };

    if (!initialFrameShape || initialFrameShape === 'all') {
      return [allTab, ...frameShapes];
    }

    const selectedFrame = frameShapes.find(
      frame => normalize(frame.name) === normalize(initialFrameShape),
    );

    const otherFrames = frameShapes.filter(
      frame => normalize(frame.name) !== normalize(initialFrameShape),
    );

    return selectedFrame
      ? [allTab, selectedFrame, ...otherFrames]
      : [allTab, ...frameShapes];
  }, [frameShapes, initialFrameShape]);

  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState<AddFrameForm>(EMPTY_FORM);

  const [filterModal, setFilterModal] = useState(false);
  const [tempBrand, setTempBrand] = useState<number | 'all'>(activeBrandId);
  const [tempFrame, setTempFrame] = useState<string>(activeFrame);
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');

  const hasActiveFilters =
    activeBrandId !== 'all' ||
    activeFrame !== 'all' ||
    !!filters.min_price ||
    !!filters.max_price;

  const openFilterModal = () => {
    setTempBrand(activeBrandId);
    setTempFrame(activeFrame);
    setTempMinPrice(filters.min_price ? String(filters.min_price) : '');
    setTempMaxPrice(filters.max_price ? String(filters.max_price) : '');
    setFilterModal(true);
  };

  const applyFilters = () => {
    setActiveBrandId(tempBrand);
    setActiveFrame(tempFrame);

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
    setActiveBrandId('all');
    setActiveFrame('all');

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
    setActiveBrandId(brandId);

    setFilters(prev => ({
      ...prev,
      page: 1,
      brand_1: brandId === 'all' ? undefined : brandId,
    }));
  };

  const handleSelectFrame = (frame: string) => {
    const value = frame === 'all' ? 'all' : normalize(frame) || frame;

    setActiveFrame(value);

    setFilters(prev => ({
      ...prev,
      page: 1,
      frame_shape: value === 'all' ? undefined : value,
    }));
  };

  const hasMore =
    meta?.current_page && meta?.last_page
      ? meta.current_page < meta.last_page
      : products.length >= Number(filters.limit || 10);

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;

    setFilters(prev => ({
      ...prev,
      page: Number(prev.page || 1) + 1,
    }));
  }, [loading, hasMore, setFilters]);

  const handleRetry = () => {
    refetch();

    if (from === 'brand') {
      refetchBrands?.();
    } else {
      refetchFrames?.();
    }
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

  const renderCard = ({ item, index }: { item: Product; index: number }) => {
    if ((item as any).empty) {
      return <View style={[styles.card, { opacity: 0 }]} />;
    }

    // formatData only pads the LAST row, so a real item's position in the
    // padded list is still its position in `products`.
    return (
      <GlassCard
        item={item}
        priceLocked={!isPriceVisible(isAuthenticated, index)}
        onRequestLogin={goToLogin}
        onPress={() => navigation.navigate('GlassDetail', { id: item.id })}
        onTryOn={() => navigation.navigate('VirtualTryOn', { glass: item })}
      />
    );
  };

  if (error && products.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <AppText style={styles.title}>
              {from === 'brand'
                ? initialBrandName || 'Brands'
                : initialFrameShape || 'Frames'}
            </AppText>
          </View>
        </View>

        <ErrorComponent onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <AppText style={styles.title}>
              {from === 'brand'
                ? initialBrandName || 'Brands'
                : initialFrameShape || 'Frames'}
            </AppText>

            <AppText style={styles.subtitle}>
              {from === 'brand'
                ? initialBrandName
                  ? `${initialBrandName} frames`
                  : 'Choose brand'
                : initialFrameShape
                ? `${initialFrameShape} frame shape`
                : 'Choose frame shape'}
            </AppText>
          </View>

          <TouchableOpacity
            style={[
              styles.filterBtn,
              hasActiveFilters && styles.filterBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={openFilterModal}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? Colors.white : Colors.primary}
            />

            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <SearchTrigger onPress={() => navigation.navigate('SearchScreen')} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabs}
        >
          {from === 'brand'
            ? brandLoading
              ? [1, 2, 3, 4].map(item => (
                  <View key={item} style={styles.tab}>
                    <View style={styles.brandSkeleton} />
                  </View>
                ))
              : brandTabs.map(b => {
                  const active =
                    b.id === 'all'
                      ? activeBrandId === 'all'
                      : String(activeBrandId) === String(b.id);

                  // brandTabs mixes real brands with the synthetic "All" entry,
                  // which has no logo field — read it defensively once rather
                  // than reaching into the union at three call sites.
                  const logoUri =
                    b.name === 'All'
                      ? undefined
                      : (b as { logo?: string | null }).logo || undefined;

                  return (
                    <TouchableOpacity
                      key={String(b.id || b.name)}
                      onPress={() =>
                        handleSelectBrand(b.id === 'all' ? 'all' : Number(b.id))
                      }
                      activeOpacity={0.75}
                      style={[
                        styles.tab,
                        logoUri && styles.tabLogo,
                        active && styles.tabActive,
                      ]}
                    >
                      {!logoUri ? (
                        <AppText
                          numberOfLines={1}
                          style={[
                            styles.tabText,
                            active && styles.tabTextActive,
                          ]}
                        >
                          {b.name}
                        </AppText>
                      ) : (
                        <Image
                          source={{ uri: logoUri }}
                          style={styles.logo}
                          resizeMode="contain"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
            : frameLoading
            ? [1, 2, 3, 4].map(item => (
                <View key={item} style={styles.tab}>
                  <View style={styles.brandSkeleton} />
                </View>
              ))
            : frameTabs.map(frame => {
                const value =
                  frame.name === 'All'
                    ? 'all'
                    : normalize(frame.name) || frame.name;
                const active = activeFrame === value;

                return (
                  <TouchableOpacity
                    key={String(frame.id || frame.name)}
                    onPress={() => handleSelectFrame(value)}
                    activeOpacity={0.75}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    <AppText
                      numberOfLines={1}
                      style={[styles.tabText, active && styles.tabTextActive]}
                    >
                      {frame.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>

        {!loading && !error && (
          <AppText style={styles.countLine}>
            {products.length} frame{products.length !== 1 ? 's' : ''}
          </AppText>
        )}

        {/* Only worth showing once there is actually a hidden price to reveal. */}
        {!isAuthenticated && products.length > FREE_PRICE_PREVIEW && (
          <TouchableOpacity
            style={styles.priceGateBanner}
            activeOpacity={0.85}
            onPress={goToLogin}
          >
            <Ionicons name="lock-closed" size={16} color={Colors.primary} />
            <AppText style={styles.priceGateText}>
              Log in to see the price on every frame.
            </AppText>
            <AppText style={styles.priceGateAction}>Log in</AppText>
          </TouchableOpacity>
        )}

        {loading && products.length === 0 ? (
          <GlassScreenSkeleton />
        ) : (
          <FlatList
            data={formatData(products, 2)}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={renderCard}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loading && products.length > 0 ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name="glasses-outline"
                  size={42}
                  color={Colors.gray300}
                />

                <AppText style={styles.emptyTitle}>No frames found</AppText>

                <AppText style={styles.emptyText}>
                  Try another brand, frame shape, or filter.
                </AppText>
              </View>
            }
          />
        )}

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
          frameOptions={frameTabs.map(frame => ({
            label: frame.name,
            value:
              frame.name === 'All'
                ? 'all'
                : normalize(frame.name) || frame.name,
          }))}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadow.sm,
  },

  headerTitleWrap: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
    marginTop: 2,
  },

  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadow.sm,
  },

  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  searchContainer: {
    marginBottom: Spacing.md,
  },

  tabs: {
    marginBottom: Spacing.sm,
    height: 60,
  },

  tabsContent: {
    paddingHorizontal: Spacing.lg,
  },

  // Sizes to its label. A fixed width left "All" swimming in empty space while
  // "ARMANI EXCHANGE" was crushed into the same 95dp, which is what made the
  // row read as untidy. minWidth keeps the very short labels from looking
  // pinched, and the padding is what actually sets the width now.
  // Width follows the label: `minWidth` stops "All" from becoming a nub and
  // `maxWidth` stops one long brand or frame name from filling the row — past
  // that the label ellipsises rather than the chip stretching.
  tab: {
    minWidth: 64,
    maxWidth: 180,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
  },

  // A logo has no text to measure, so those tabs keep a fixed box. The image
  // inside is width:'100%', which would collapse to nothing in an auto-width
  // container.
  tabLogo: {
    width: 95,
    maxWidth: 95,
    paddingHorizontal: 0,
  },

  tabActive: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#b09080',
  },

  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
    textAlign: 'center',
  },

  tabTextActive: {
    color: Colors.primary,
  },

  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    transform: [{ scale: 1.4 }],
  },

  brandSkeleton: {
    width: 50,
    height: 14,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
  },

  priceGateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  priceGateText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray700,
  },
  priceGateAction: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  countLine: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  list: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xxl + 80,
  },

  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    ...Shadow.md,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },

  errorTitle: {
    marginTop: Spacing.md,
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.black,
  },

  errorText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },

  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },

  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },

  retryBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: 34,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },

  retryText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlassesListScreen;
