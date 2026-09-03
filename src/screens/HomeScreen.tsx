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
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  BottomTabParamList,
  RootStackParamList,
} from '../types/navigation';
import {
  searchMOpticLocations,
  getEmbedUrl,
  groupHours,
  type PlaceLocation,
} from '../services/placesService';
import FramesSection from '../components/ui/Home/FramesSection';
import AnnouncementSection from '../components/ui/Home/AnnounmentsSection';
import BrandSection from '../components/ui/Home/BrandSection';
import { useHome } from '../hook/useHome';
import HeroSlider from '../components/ui/Home/HeroSlider';
import HomeSkeleton from '../components/ui/Loading/HomeLoadingScreen';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import { useTranslation } from 'react-i18next';
import AppText from '../components/AppText';

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
            <AppText style={promoStyles.discountValue}>30%</AppText>
            <AppText style={promoStyles.discountLabel}>OFF</AppText>
          </View>
        </View>

        {/* Body */}
        <View style={promoStyles.body}>
          <AppText style={promoStyles.tag}>🌸 Spring Sale</AppText>
          <AppText style={promoStyles.title}>
            Exclusive offer{'\n'}just for you
          </AppText>
          <AppText style={promoStyles.desc}>
            Get 30% off all prescription frames this season. Limited time only.
          </AppText>

          {/* Promo code row */}
          <View style={promoStyles.codeRow}>
            <View style={promoStyles.codeChip}>
              <Ionicons
                name="pricetag-outline"
                size={13}
                color={Colors.primary}
              />
              <AppText style={promoStyles.codeText}>SPRING30</AppText>
            </View>
            <AppText style={promoStyles.codeHint}>Valid until Apr 30</AppText>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={promoStyles.ctaBtn}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <AppText style={promoStyles.ctaText}>Shop Now</AppText>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            style={promoStyles.skipBtn}
          >
            <AppText style={promoStyles.skipText}>Maybe later</AppText>
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

// ─── Best Sellers data ───────────────────────────────────────────────────────

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

// ─── Announcements data ──────────────────────────────────────────────────────
type Announcement = {
  id: string;
  title: string;
  date: string;
  body: string;
  type: 'info' | 'promo' | 'alert' | 'update';
  imageUri: string;
};

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

type GlassScreenNav = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Glass'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// ─── HomeScreen ──────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<PlaceLocation[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [showPromo, setShowPromo] = useState(true);
  const navigation = useNavigation<GlassScreenNav>();
  const { t } = useTranslation();

  const { data, loading, refreshing, error, onRefresh } = useHome();

  useEffect(() => {
    searchMOpticLocations()
      .then(setLocations)
      .finally(() => setLocLoading(false));
  }, []);

  const openMaps = (placeId: string) =>
    Linking.openURL(`https://www.google.com/maps/place/?q=place_id:${placeId}`);

  const callStore = (phone: string) =>
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);

  if (loading) {
    return <HomeSkeleton />;
  }

  if (error || !data) {
    return (
      <ErrorComponent headerTitle={t('homeErrorTitle')} onRetry={onRefresh} />
    );
  }

  return (
    <View style={styles.root}>
      {/* {showPromo && <PromoModal onClose={() => setShowPromo(false)} />} */}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl + 80,
        }}
      >
        <HeroSlider slides={data?.banners || []} signinLabel={t('SignIn')} />

        {/* Scan CTA */}
        <TouchableOpacity
          style={styles.scanBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Scan')}
        >
          <View style={styles.scanIconWrap}>
            <Ionicons name="scan-outline" size={22} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.scanTitle}>{t('homeScanTitle')}</AppText>
            <AppText style={styles.scanSubtitle}>
              {t('homeScanSubtitle')}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View
          style={[styles.pad, styles.sectionRow, { marginTop: Spacing.lg }]}
        >
          <AppText style={styles.sectionTitle}>{t('homeBestSellers')}</AppText>

          <TouchableOpacity>
            <AppText style={styles.seeAll}>{t('commonSeeAll')}</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}
          style={{ marginBottom: Spacing.lg }}
        >
          {data?.new_arrivals.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={[{ width: 160 }, i === 0 && { marginLeft: Spacing.lg }]}
              onPress={() =>
                navigation.navigate('GlassDetail', { id: item.id })
              }
            >
              <GlassView
                intensity="light"
                borderRadius={BorderRadius.lg}
                style={{ overflow: 'hidden' }}
              >
                <View style={{ height: 120, width: '100%' }}>
                  <Image
                    source={{ uri: item.image }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <View style={StyleSheet.absoluteFillObject} />
                </View>

                <View style={{ padding: Spacing.sm + 2, gap: 3 }}>
                  <AppText style={styles.bsBrand}>{item?.brand?.name}</AppText>

                  <AppText style={styles.bsName} numberOfLines={1}>
                    {item.name}
                  </AppText>

                  <View style={styles.bsFooter}>
                    <AppText style={styles.bsPrice}>${item.price}</AppText>

                    <TouchableOpacity
                      style={styles.tryOnBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="glasses-outline"
                        size={11}
                        color={Colors.white}
                      />

                      <AppText style={styles.tryOnText}>
                        {t('homeTryOn')}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassView>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <BrandSection
          title={t('homeBrands')}
          brands={data?.brands || []}
          onPressBrand={brand => {
            navigation.navigate('GlassesList', {
              from: 'brand',
              brandId: brand.id,
              brandName: brand.name,
            });
          }}
        />

        <FramesSection
          title={t('homeFrameTypes')}
          frames={data?.frame_shapes}
          onPressFrame={frame => {
            navigation.navigate('GlassesList', {
              from: 'frame',
              frameShape: frame.name,
            });
          }}
        />

        <AnnouncementSection annoucements={data?.announcements || []} />
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

  // Scan CTA
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginHorizontal: Spacing.md,
  },
  scanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: -0.1,
  },
  scanSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '500',
    marginTop: 2,
  },

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
