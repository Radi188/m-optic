import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import WebView from 'react-native-webview';
import { Badge, GlassView } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import {
  searchMOpticLocations,
  getEmbedUrl,
  groupHours,
  type PlaceLocation,
} from '../services/placesService';

// ─── Promo Modal ─────────────────────────────────────────────────────────────
const PromoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <TouchableOpacity
        style={promoStyles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Card */}
      <Animated.View
        style={[
          promoStyles.cardWrap,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        pointerEvents="box-none"
      >
        {/* Header — real image base + gradient overlay */}
        <View style={promoStyles.header}>
          {/* Real product image — base layer */}
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=85',
            }}
            style={promoStyles.headerImage}
            resizeMode="cover"
          />
          {/* Gradient overlay so text is readable */}
          <LinearGradient
            colors={['transparent', 'rgba(100, 55, 40, 0.72)']}
            style={promoStyles.headerOverlay}
          />

          {/* Close button */}
          <TouchableOpacity
            style={promoStyles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color={Colors.white} />
          </TouchableOpacity>

          {/* Discount pill */}
          <View style={promoStyles.discountPill}>
            <Text style={promoStyles.discountValue}>30%</Text>
            <Text style={promoStyles.discountLabel}>OFF</Text>
          </View>
        </View>

        {/* Body */}
        <View style={promoStyles.body}>
          <Text style={promoStyles.tag}>🌸 Spring Sale</Text>
          <Text style={promoStyles.title}>
            Exclusive offer{'\n'}just for you
          </Text>
          <Text style={promoStyles.desc}>
            Get 30% off all prescription frames this season. Limited time only.
          </Text>

          {/* Promo code row */}
          <View style={promoStyles.codeRow}>
            <View style={promoStyles.codeChip}>
              <Ionicons
                name="pricetag-outline"
                size={13}
                color={Colors.primary}
              />
              <Text style={promoStyles.codeText}>SPRING30</Text>
            </View>
            <Text style={promoStyles.codeHint}>Valid until Apr 30</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={promoStyles.ctaBtn}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={promoStyles.ctaText}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            style={promoStyles.skipBtn}
          >
            <Text style={promoStyles.skipText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const promoStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 12, 8, 0.62)',
  },
  cardWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    width: Dimensions.get('window').width - 48,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
    elevation: 20,
  },
  header: {
    height: 190,
    overflow: 'hidden',
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountPill: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  discountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  discountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 1,
    marginTop: 4,
  },
  body: {
    padding: 24,
  },
  tag: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 20,
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  codeHint: {
    fontSize: 12,
    color: Colors.gray400,
    fontWeight: '500',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    color: Colors.gray400,
    fontWeight: '500',
  },
});

// ─── Constants ───────────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_HEIGHT = 300;

// ─── Hero Slider data ────────────────────────────────────────────────────────
type Slide = {
  id: string;
  imageUri: string;
  title: string;
  subtitle: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    id: 's1',
    imageUri:
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=85',
    title: 'New Spring\nCollection',
    subtitle: 'Fresh frames for the season — in store now',
    cta: 'Explore',
  },
  {
    id: 's2',
    imageUri:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=85',
    title: 'Up to 30%\nOff Selected',
    subtitle: 'Limited-time deals on premium eyewear brands',
    cta: 'Shop Deals',
  },
  {
    id: 's3',
    imageUri:
      'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=800&q=85',
    title: 'Try Before\nYou Buy',
    subtitle: 'Virtual try-on available in our AR catalog',
    cta: 'Try On',
  },
];

// ─── HeroSlider ──────────────────────────────────────────────────────────────
const HeroSlider: React.FC = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalHeight = SLIDER_HEIGHT + insets.top;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3800);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null)
        setActiveIndex(viewableItems[0].index);
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return (
    <View style={{ height: totalHeight }}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={startTimer}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_d, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, height: totalHeight }}>
            {/* Clean full-bleed image — no overlay */}
            <Image
              source={{ uri: item.imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {/* ── Fixed header overlay (never moves with slides) ── */}
      <View
        style={[sliderStyles.header, { paddingTop: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        {/* Left: logo + brand name */}
        <View style={sliderStyles.headerLeft}>
          <View style={sliderStyles.logoWrap}>
            <Image
              source={require('../assets/logo.jpg')}
              style={sliderStyles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={sliderStyles.brandName}>M Optic</Text>
        </View>

        {/* Right: avatar initials or sign-in pill */}
        {user ? (
          <View style={sliderStyles.avatarWrap}>
            <Text style={sliderStyles.avatarText}>
              {user.name
                .split(' ')
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={sliderStyles.signInBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="person-outline" size={14} color={Colors.white} />
            <Text style={sliderStyles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  // Glass content card
  cardWrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
  },
  card: { overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.92)' },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  slideTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 3,
  },
  slideSub: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    fontWeight: '400',
    lineHeight: 17,
  },
  ctaBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Dots
  dots: {
    position: 'absolute',
    bottom: Spacing.lg + 72,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: { width: 18, backgroundColor: Colors.white },

  // Header overlay
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  logo: { width: 36, height: 36 },
  brandName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  signInText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});

// ─── Best Sellers data ───────────────────────────────────────────────────────
type GlassItem = {
  id: string;
  name: string;
  brand: string;
  price: string;
  sold: number;
  imageUri: string;
  rank?: string;
};

const BEST_SELLERS: GlassItem[] = [
  {
    id: 'b1',
    name: 'Wayfarer Classic',
    brand: 'Ray-Ban',
    price: '$159',
    sold: 48,
    imageUri:
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&w=400&q=80',
    rank: '#1',
  },
  {
    id: 'b2',
    name: 'Holbrook',
    brand: 'Oakley',
    price: '$129',
    sold: 35,
    imageUri:
      'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&w=400&q=80',
  },
  {
    id: 'b3',
    name: 'Aviator Grand',
    brand: 'Ray-Ban',
    price: '$195',
    sold: 29,
    imageUri:
      'https://images.unsplash.com/photo-1516741547-bfbfb07f2dfd?auto=format&w=400&q=80',
  },
  {
    id: 'b4',
    name: 'Round Metal',
    brand: 'Ray-Ban',
    price: '$149',
    sold: 21,
    imageUri:
      'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&w=400&q=80',
  },
];

// ─── Promotions data ─────────────────────────────────────────────────────────
type Promo = {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  accent: string;
  imageUri: string;
};

const PROMOTIONS: Promo[] = [
  {
    id: 'p1',
    title: 'Spring Sale',
    description: 'All prescription frames',
    discount: '30%',
    validUntil: 'Apr 30, 2026',
    accent: Colors.primary,
    imageUri:
      'https://images.unsplash.com/photo-1516741547-bfbfb07f2dfd?auto=format&w=600&q=80',
  },
  {
    id: 'p2',
    title: 'Bundle Deal',
    description: 'Frame + lenses combo',
    discount: '20%',
    validUntil: 'May 15, 2026',
    accent: Colors.info,
    imageUri:
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&w=600&q=80',
  },
  {
    id: 'p3',
    title: 'Student Offer',
    description: 'Valid student ID required',
    discount: '15%',
    validUntil: 'Jun 30, 2026',
    accent: Colors.success,
    imageUri:
      'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&w=600&q=80',
  },
];

// ─── Announcements data ──────────────────────────────────────────────────────
type Announcement = {
  id: string;
  title: string;
  date: string;
  body: string;
  type: 'info' | 'promo' | 'alert' | 'update';
  imageUri: string;
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    type: 'update',
    title: 'New Spring Stock Arriving',
    date: 'Apr 20, 2026',
    body: '40+ new frames from Ray-Ban, Oakley, and Gucci arriving this weekend.',
    imageUri:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'a2',
    type: 'promo',
    title: 'Weekend Promotion — 20% Off',
    date: 'Apr 19–20, 2026',
    body: 'Apply code SPRING20 at checkout. Valid on all prescription frames this weekend.',
    imageUri:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'a3',
    type: 'alert',
    title: 'Closed on Public Holiday',
    date: 'Apr 25, 2026',
    body: 'The store will be closed on the upcoming public holiday. We reopen Apr 26.',
    imageUri:
      'https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=800&q=80',
  },
];

const ANN_CONFIG: Record<
  Announcement['type'],
  { color: string; bg: string; icon: string; label: string }
> = {
  update: {
    color: Colors.info,
    bg: 'rgba(77,168,218,0.18)',
    icon: 'cube-outline',
    label: 'Update',
  },
  promo: {
    color: Colors.success,
    bg: 'rgba(45,189,126,0.18)',
    icon: 'pricetag-outline',
    label: 'Promo',
  },
  alert: {
    color: Colors.warning,
    bg: 'rgba(247,164,64,0.18)',
    icon: 'warning-outline',
    label: 'Notice',
  },
  info: {
    color: Colors.primary,
    bg: Colors.primaryLight,
    icon: 'information-circle-outline',
    label: 'Info',
  },
};

// ─── Store locations fetched from Google Places API ───────────────────────────

// ─── HomeScreen ──────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<PlaceLocation[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [showPromo, setShowPromo] = useState(true);

  useEffect(() => {
    searchMOpticLocations()
      .then(setLocations)
      .finally(() => setLocLoading(false));
  }, []);

  const openMaps = (placeId: string) =>
    Linking.openURL(`https://www.google.com/maps/place/?q=place_id:${placeId}`);

  const callStore = (phone: string) =>
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);

  return (
    <View style={styles.root}>
      {showPromo && <PromoModal onClose={() => setShowPromo(false)} />}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl + 80,
        }}
      >
        {/* ─── Hero Slider ─────────────────────────────────────── */}
        <HeroSlider />

        {/* ─── Best Sellers ────────────────────────────────────── */}
        <View
          style={[styles.pad, styles.sectionRow, { marginTop: Spacing.lg }]}
        >
          <Text style={styles.sectionTitle}>Best Sellers</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}
          style={{ marginBottom: Spacing.lg }}
        >
          {BEST_SELLERS.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={[{ width: 160 }, i === 0 && { marginLeft: Spacing.lg }]}
            >
              <GlassView
                intensity="light"
                borderRadius={BorderRadius.lg}
                style={{ overflow: 'hidden' }}
              >
                {/* Image */}
                <View style={{ height: 120, width: '100%' }}>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <View style={StyleSheet.absoluteFillObject} />
                  {item.rank && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{item.rank}</Text>
                    </View>
                  )}
                </View>
                {/* Info */}
                <View style={{ padding: Spacing.sm + 2, gap: 3 }}>
                  <Text style={styles.bsBrand}>{item.brand}</Text>
                  <Text style={styles.bsName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.bsFooter}>
                    <Text style={styles.bsPrice}>{item.price}</Text>
                    <TouchableOpacity
                      style={styles.tryOnBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="glasses-outline"
                        size={11}
                        color={Colors.white}
                      />
                      <Text style={styles.tryOnText}>Try On</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassView>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Promotions ──────────────────────────────────────── */}
        <View style={[styles.pad, styles.sectionRow]}>
          <Text style={styles.sectionTitle}>Promotions</Text>
          <Badge label="Active" variant="success" dot />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}
          style={{ marginBottom: Spacing.lg }}
        >
          {PROMOTIONS.map((promo, i) => (
            <TouchableOpacity
              key={promo.id}
              activeOpacity={0.85}
              style={[
                { width: SCREEN_WIDTH * 0.72 },
                i === 0 && { marginLeft: Spacing.lg },
              ]}
            >
              <GlassView
                intensity="light"
                borderRadius={BorderRadius.lg}
                style={{ overflow: 'hidden' }}
              >
                {/* Image with gradient + overlaid text */}
                <View style={{ height: 180 }}>
                  <Image
                    source={{ uri: promo.imageUri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(12,6,3,0.78)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {/* Discount pill — top right */}
                  <View
                    style={[styles.promoPill, { backgroundColor: promo.accent }]}
                  >
                    <Text style={styles.promoPillText}>
                      {promo.discount} OFF
                    </Text>
                  </View>
                  {/* Title + desc overlaid at bottom of image */}
                  <View style={styles.promoOverlay}>
                    <Text style={styles.promoOverlayTitle}>{promo.title}</Text>
                    <Text style={styles.promoOverlayDesc}>
                      {promo.description}
                    </Text>
                  </View>
                </View>

                {/* Minimal footer — just the validity date */}
                <View style={styles.promoCardFooter}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={Colors.gray400}
                  />
                  <Text style={styles.promoCardDate}>
                    Valid until {promo.validUntil}
                  </Text>
                </View>
              </GlassView>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Announcements ───────────────────────────────────── */}
        <View style={[styles.pad, styles.sectionRow]}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          <Badge label={`${ANNOUNCEMENTS.length} new`} variant="error" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}
          style={{ marginBottom: Spacing.lg }}
        >
          {ANNOUNCEMENTS.map((item, i) => {
            const cfg = ANN_CONFIG[item.type];
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.87}
                style={[
                  { width: SCREEN_WIDTH * 0.72 },
                  i === 0 && { marginLeft: Spacing.lg },
                ]}
              >
                <GlassView
                  intensity="light"
                  borderRadius={BorderRadius.lg}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Poster image */}
                  <View style={{ height: 130 }}>
                    <Image
                      source={{ uri: item.imageUri }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    {/* gradient-like scrim */}
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: 'rgba(20,10,5,0.48)' },
                      ]}
                    />
                  </View>

                  {/* Text body */}
                  <View style={styles.annBody}>
                    <Text style={styles.annTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.annText} numberOfLines={3}>
                      {item.body}
                    </Text>
                    {/* Bottom accent line */}
                    <View
                      style={[
                        styles.annBottomBar,
                        { backgroundColor: cfg.color },
                      ]}
                    />
                  </View>
                </GlassView>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Store Locations ─────────────────────────────────── */}
        <View
          style={[styles.pad, styles.sectionRow, { marginTop: Spacing.xl }]}
        >
          <Text style={styles.sectionTitle}>Find Us</Text>
          {!locLoading && (
            <Badge
              label={`${locations.length} location${
                locations.length !== 1 ? 's' : ''
              }`}
              variant="info"
            />
          )}
        </View>

        {locLoading ? (
          <View style={styles.locLoading}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: Spacing.sm,
              paddingRight: Spacing.lg,
              borderRadius: BorderRadius.xl,
            }}
            style={{ marginBottom: Spacing.lg }}
          >
            {locations.map((loc, i) => (
              <View
                key={loc.placeId}
                style={[
                  styles.locationCardWrap,
                  i === 0 ? { marginLeft: Spacing.lg } : undefined,
                ]}
              >
                <GlassView
                  intensity="light"
                  borderRadius={BorderRadius.xl}
                  tint={Colors.glassTint}
                  style={styles.locationCard}
                >
                  {/* Store photo (top of card) */}
                  <View style={styles.locationImg}>
                    {loc.photoUri ? (
                      <Image
                        source={{ uri: loc.photoUri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : (
                      <WebView
                        source={{ uri: getEmbedUrl(loc.placeId) }}
                        style={StyleSheet.absoluteFillObject}
                        scrollEnabled={false}
                        pointerEvents="none"
                      />
                    )}
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: 'rgba(0,0,0,0.18)' },
                      ]}
                      pointerEvents="none"
                    />
                    {/* Branch badge */}
                    <View style={styles.branchBadge}>
                      <Ionicons
                        name="location"
                        size={11}
                        color={Colors.white}
                      />
                      <Text style={styles.branchText}>{loc.branch}</Text>
                    </View>
                  </View>

                  {/* Info */}
                  <View style={styles.locationInfo}>
                    {/* Grouped content rows */}
                    <View>
                      {/* Address */}
                      <View style={styles.infoRow}>
                        <View
                          style={[
                            styles.infoIcon,
                            { backgroundColor: Colors.primaryLight },
                          ]}
                        >
                          <Ionicons
                            name="location-outline"
                            size={15}
                            color={Colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Address</Text>
                          <Text style={styles.infoValue}>
                            {loc.address || 'No information'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoDivider} />

                      {/* Hours */}
                      <View style={styles.infoRow}>
                        <View
                          style={[
                            styles.infoIcon,
                            { backgroundColor: Colors.primaryLight },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={15}
                            color={Colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Opening Hours</Text>
                          {loc.weekdayText.length > 0 ? (
                            groupHours(loc.weekdayText).map(h => (
                              <View key={h.days} style={styles.hoursRow}>
                                <Text style={styles.hoursDays}>{h.days}</Text>
                                <Text style={styles.hoursTime}>{h.time}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noInfo}>No information</Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.infoDivider} />

                      {/* Phone */}
                      <TouchableOpacity
                        style={styles.infoRow}
                        onPress={() => loc.phone && callStore(loc.phone)}
                        activeOpacity={loc.phone ? 0.7 : 1}
                      >
                        <View
                          style={[
                            styles.infoIcon,
                            { backgroundColor: Colors.primaryLight },
                          ]}
                        >
                          <Ionicons
                            name="call-outline"
                            size={15}
                            color={Colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Phone</Text>
                          <Text
                            style={[
                              styles.infoValue,
                              loc.phone ? { color: Colors.primary } : undefined,
                            ]}
                          >
                            {loc.phone || 'No information'}
                          </Text>
                        </View>
                        {loc.phone ? (
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={Colors.gray500}
                          />
                        ) : null}
                      </TouchableOpacity>
                    </View>

                    {/* Directions button */}
                    <TouchableOpacity
                      style={styles.directionsBtn}
                      onPress={() => openMaps(loc.placeId)}
                      activeOpacity={0.82}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={15}
                        color={Colors.white}
                      />
                      <Text style={styles.directionsBtnText}>
                        Get Directions
                      </Text>
                    </TouchableOpacity>
                  </View>
                </GlassView>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  scroll: { flex: 1 },
  pad: { paddingHorizontal: Spacing.lg },

  // Section headers
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.gray700,
    letterSpacing: 0.1,
  },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  // Best Sellers
  rankBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rankText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  bsBrand: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bsName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.1,
  },
  bsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bsPrice: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  tryOnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tryOnText: { fontSize: 10, color: Colors.white, fontWeight: '700' },

  // Promotions
  promoPill: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  promoPillText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  promoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: 3,
  },
  promoOverlayTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  promoOverlayDesc: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  promoCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  promoCardDate: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
  },

  // Announcements
  annBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  annBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  annDateWrap: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  annDateOverlay: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  annBody: { padding: Spacing.md, gap: Spacing.xs },
  annTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  annText: { fontSize: FontSize.xs, color: Colors.gray600, lineHeight: 17 },
  annBottomBar: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.sm,
    width: 32,
  },

  // Store Location cards
  locLoading: { height: 120, alignItems: 'center', justifyContent: 'center' },
  locationCardWrap: {
    width: SCREEN_WIDTH * 0.78,
    height: 450,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    marginVertical: 12,
    ...Shadow.lg,
  },
  locationCard: { flex: 1, overflow: 'hidden' },
  locationImg: { height: 160, width: '100%', overflow: 'hidden' },
  branchBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
  },
  branchText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },

  // Info rows
  locationInfo: {
    padding: Spacing.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '500',
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 34 + Spacing.md,
  },

  // Hours
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  hoursDays: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    fontWeight: '400',
  },
  hoursTime: { fontSize: FontSize.sm, color: Colors.black, fontWeight: '500' },
  noInfo: { fontSize: FontSize.sm, color: Colors.gray500, fontStyle: 'italic' },

  // Directions button
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  directionsBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});

export default HomeScreen;
