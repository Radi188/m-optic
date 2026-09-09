import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
import LensTechSection from '../components/ui/Lens/LensTechSection';
import AnnouncementSection from '../components/ui/Home/AnnounmentsSection';
import BrandSection from '../components/ui/Home/BrandSection';
import { useHome } from '../hook/useHome';
import HeroSlider from '../components/ui/Home/HeroSlider';
import HomeHeader from '../components/ui/Home/HomeHeader';
import HomeSkeleton from '../components/ui/Loading/HomeLoadingScreen';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import { useTranslation } from 'react-i18next';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';

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
          <AppImage
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
const SCAN_GOLD = '#E3B778';

/**
 * One of the two Scan & Try On entry points.
 *
 * Dark and gold, matching the prescription and membership cards — these are
 * the app's signature features, and a pair of plain white tiles inside a
 * tinted panel read as a form, not as something worth trying.
 */
const ScanTile: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, cta, onPress }) => (
  <TouchableOpacity
    style={styles.scanTile}
    activeOpacity={0.9}
    onPress={onPress}
  >
    <LinearGradient
      colors={['#5A4232', '#3A2A20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <View pointerEvents="none" style={styles.scanTileSheen} />

    <View style={styles.scanTileIcon}>
      <Ionicons name={icon as any} size={20} color={SCAN_GOLD} />
    </View>

    <AppText style={styles.scanTileTitle} numberOfLines={2}>
      {title}
    </AppText>
    <AppText style={styles.scanTileSub} numberOfLines={3}>
      {subtitle}
    </AppText>

    <View style={styles.scanTileCta}>
      <AppText style={styles.scanTileCtaText}>{cta}</AppText>
      <Ionicons name="arrow-forward" size={13} color={SCAN_GOLD} />
    </View>
  </TouchableOpacity>
);

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

      <HomeHeader signinLabel={t('SignIn')} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl + 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <HeroSlider slides={data?.banners || []} />

        {/* Scan & Try On — two entry points, each opening straight into its
            own instructions. The pair used to sit inside a tinted card, so
            two white tiles were nested in a third surface; the heading now
            sits on the page and the tiles are the only cards. */}
        <View style={[styles.pad, styles.scanHead]}>
          <AppText style={styles.sectionTitle}>{t('homeScanTitle')}</AppText>
          <AppText style={styles.scanCardSubtitle}>
            {t('homeScanSubtitle')}
          </AppText>
        </View>

        <View style={[styles.pad, styles.scanTileRow]}>
          <ScanTile
            icon="scan-outline"
            title={t('FaceDetection')}
            subtitle={t('FaceDetectionSub')}
            cta={t('Start')}
            onPress={() => navigation.navigate('Scan', { mode: 'face' })}
          />

          <ScanTile
            icon="eye-outline"
            title={t('EyeTestExam')}
            subtitle={t('EyeTestExamSub')}
            cta={t('Start')}
            onPress={() => navigation.navigate('Scan', { mode: 'refraction' })}
          />
        </View>

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
                {/* `cover` cropped the frame out of shot: product shots are
                    eyewear centred on a plain background, so filling a 160x120
                    box means cutting the temples off. `contain` on a light
                    tile shows the whole frame, which is what the rest of the
                    app's product cards do. */}
                <View style={styles.bsImageWrap}>
                  <AppImage
                    source={{ uri: item.image }}
                    style={styles.bsImage}
                    resizeMode="contain"
                  />

                  <View style={styles.rankBadge}>
                    <AppText style={styles.rankText}>#{i + 1}</AppText>
                  </View>
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

        <LensTechSection />

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

  // Scan & Try On card
  scanHead: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  scanCardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    fontWeight: '500',
    marginTop: 2,
  },
  scanTileRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  // Equal halves; minHeight keeps the pair level when one label wraps.
  scanTile: {
    flex: 1,
    minHeight: 176,
    borderRadius: 20,
    padding: 14,
    overflow: 'hidden',
    backgroundColor: '#3A2A20',
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.16)',
    shadowColor: '#2A160A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  scanTileSheen: {
    position: 'absolute',
    top: -110,
    right: -80,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,226,182,0.10)',
    transform: [{ rotate: '18deg' }],
  },
  scanTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(227,183,120,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scanTileTitle: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.1,
  },
  scanTileSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 16,
  },
  scanTileCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    paddingTop: Spacing.sm,
  },
  scanTileCtaText: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    color: SCAN_GOLD,
    letterSpacing: 0.3,
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
  bsImageWrap: {
    height: 132,
    width: '100%',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  bsImage: {
    width: '100%',
    height: '100%',
  },
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
