import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import RNBottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { GlassView } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { searchMOpticLocations, groupHours } from '../services/placesService';
import type { PlaceLocation } from '../services/placesService';

const MARKER_LOGO = require('../assets/logo_icon_transparent.png');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Google Places weekdayText is Mon=index 0, matching (getDay()+6)%7
const todayIndex = () => (new Date().getDay() + 6) % 7;

// ─── Location Info Sheet ──────────────────────────────────────────────────────

const LocationSheet: React.FC<{ location: PlaceLocation }> = ({ location }) => {
  const today = todayIndex();
  const hours = groupHours(location.weekdayText);

  // Staggered entrance animations
  const headerOpacity = useSharedValue(0);
  const headerOffset = useSharedValue(10);
  const detailsOpacity = useSharedValue(0);
  const detailsOffset = useSharedValue(12);
  const ctaOpacity = useSharedValue(0);
  const ctaOffset = useSharedValue(12);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: ease });
    headerOffset.value = withTiming(0, { duration: 320, easing: ease });
    detailsOpacity.value = withDelay(
      80,
      withTiming(1, { duration: 300, easing: ease }),
    );
    detailsOffset.value = withDelay(
      80,
      withTiming(0, { duration: 300, easing: ease }),
    );
    ctaOpacity.value = withDelay(
      160,
      withTiming(1, { duration: 280, easing: ease }),
    );
    ctaOffset.value = withDelay(
      160,
      withTiming(0, { duration: 280, easing: ease }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.placeId]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerOffset.value }],
  }));
  const detailsStyle = useAnimatedStyle(() => ({
    opacity: detailsOpacity.value,
    transform: [{ translateY: detailsOffset.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaOffset.value }],
  }));

  const openDirections = () => {
    const q = encodeURIComponent(location.address);
    const url =
      Platform.OS === 'ios'
        ? `maps://maps.apple.com/?q=${q}`
        : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url);
  };

  const callStore = () =>
    Linking.openURL(`tel:${location.phone.replace(/[\s-]/g, '')}`);

  return (
    <View style={s.sheetInner}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Animated.View style={[s.headerRow, headerStyle]}>
        {/* Logo badge */}
        <View style={s.logoBadge}>
          <LinearGradient
            colors={['#E8DAD2', '#CDB4A8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Image
            source={MARKER_LOGO}
            style={s.logoBadgeImg}
            resizeMode="contain"
          />
        </View>

        {/* Name + meta */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={s.locationName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {location.name}
          </Text>

          <View style={s.metaRow}>
            {location.rating > 0 && (
              <View style={s.ratingPill}>
                <Text style={s.ratingStar}>★</Text>
                <Text style={s.ratingNum}>{location.rating.toFixed(1)}</Text>
                <Text style={s.reviewCount}> ({location.userRatingCount})</Text>
              </View>
            )}

            <View
              style={[
                s.statusPill,
                location.isOpen ? s.statusOpen : s.statusClosed,
              ]}
            >
              <View
                style={[
                  s.statusDot,
                  {
                    backgroundColor: location.isOpen
                      ? Colors.success
                      : Colors.error,
                  },
                ]}
              />
              <Text
                style={[
                  s.statusText,
                  { color: location.isOpen ? Colors.success : Colors.error },
                ]}
              >
                {location.isOpen ? 'Open now' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ── Details ────────────────────────────────────────────────────── */}
      <Animated.View style={detailsStyle}>
        <View style={s.sep} />

        {/* Address & phone info rows */}
        {[
          { icon: 'location-outline', text: location.address },
          ...(location.phone
            ? [{ icon: 'call-outline', text: location.phone }]
            : []),
        ].map(row => (
          <View key={row.icon} style={s.detailRow}>
            <View style={s.detailIconWrap}>
              <Ionicons
                name={row.icon as any}
                size={15}
                color={Colors.primary}
              />
            </View>
            <Text style={s.detailText}>{row.text}</Text>
          </View>
        ))}

        {/* Hours */}
        {hours.length > 0 && (
          <>
            <View style={s.sep} />
            <View style={s.sectionHeader}>
              <Ionicons name="time-outline" size={13} color={Colors.gray400} />
              <Text style={s.sectionLabel}>HOURS</Text>
            </View>

            <View style={s.hoursCard}>
              {location.weekdayText.map((raw, i) => {
                const sep = raw.indexOf(': ');
                const day = raw.slice(0, sep);
                const time = raw.slice(sep + 2);
                const isToday = i === today;
                return (
                  <View
                    key={i}
                    style={[s.hoursRow, isToday && s.hoursRowToday]}
                  >
                    <Text style={[s.hoursDay, isToday && s.hoursDayToday]}>
                      {day}
                    </Text>
                    <Text style={[s.hoursTime, isToday && s.hoursTimeToday]}>
                      {time}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={s.sep} />
      </Animated.View>

      {/* ── CTA Buttons ────────────────────────────────────────────────── */}
      <Animated.View style={[s.ctaRow, ctaStyle]}>
        <TouchableOpacity
          style={s.ctaOutline}
          onPress={openDirections}
          activeOpacity={0.72}
        >
          <View style={s.ctaIconCircle}>
            <Ionicons name="navigate" size={15} color={Colors.primary} />
          </View>
          <Text style={s.ctaOutlineText}>Directions</Text>
        </TouchableOpacity>

        {location.phone ? (
          <TouchableOpacity
            style={s.ctaFill}
            onPress={callStore}
            activeOpacity={0.72}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={s.ctaIconCircleWhite}>
              <Ionicons name="call" size={15} color="#fff" />
            </View>
            <Text style={s.ctaFillText}>Call Store</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
};

// ─── Custom Map Marker ────────────────────────────────────────────────────────

const StoreMarker: React.FC<{
  location: PlaceLocation;
  active: boolean;
  onPress: () => void;
}> = ({ location, active, onPress }) => {
  // Keep the native marker tracking view changes until the logo image has
  // actually painted (it loads async), otherwise the marker snapshots an empty
  // circle. Re-enable whenever the active state flips the appearance.
  const [loaded, setLoaded] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // Re-snapshot when active styling changes.
    setSettled(false);
    if (!loaded) return;
    const t = setTimeout(() => setSettled(true), 600);
    return () => clearTimeout(t);
  }, [active, loaded]);

  const handleLogoLoad = () => setLoaded(true);

  const tracks = !loaded || !settled;

  return (
    <Marker
      coordinate={{ latitude: location.lat, longitude: location.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
    >
      <View style={mk.wrap}>
        <View style={[mk.head, active ? mk.headActive : mk.headInactive]}>
          <Image
            source={MARKER_LOGO}
            style={mk.logo}
            resizeMode="contain"
            onLoad={handleLogoLoad}
          />
        </View>
        <View style={[mk.tail, active ? mk.tailActive : mk.tailInactive]} />
      </View>
    </Marker>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const StoreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<PlaceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('');
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<RNBottomSheet>(null);
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const tabsContainerW = useRef(0);

  useEffect(() => {
    searchMOpticLocations()
      .then(locs => {
        setLocations(locs);
        if (locs.length) setActiveId(locs[0].placeId);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!locations.length) return;
    const t = setTimeout(() => sheetRef.current?.snapToIndex(0), 350);
    return () => clearTimeout(t);
  }, [locations.length]);

  // Fluid spring — slight natural bounce, no hard clamping
  const animationConfigs = useBottomSheetSpringConfigs({
    duration: 460,
    dampingRatio: 0.76,
    overshootClamping: false,
  });

  // First snap: peek with header + address visible. Second: full content.
  const snapPoints = useMemo(() => ['42%', '88%'], []);
  const activeLocation = locations.find(l => l.placeId === activeId);

  const initialRegion = useMemo(() => {
    if (!locations.length) return undefined;
    const c = locations[0];
    return {
      latitude: c.lat,
      longitude: c.lng,
      latitudeDelta: 0.4,
      longitudeDelta: 0.4,
    };
  }, [locations]);

  const fitToAll = useCallback(() => {
    if (locations.length < 2) return;
    mapRef.current?.fitToCoordinates(
      locations.map(l => ({ latitude: l.lat, longitude: l.lng })),
      {
        edgePadding: { top: 120, right: 60, bottom: 360, left: 60 },
        animated: false,
      },
    );
  }, [locations]);

  const selectLocation = useCallback(
    (id: string) => {
      setActiveId(id);
      const loc = locations.find(l => l.placeId === id);
      if (loc) {
        mapRef.current?.animateToRegion(
          {
            latitude: loc.lat,
            longitude: loc.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          600,
        );
      }
      sheetRef.current?.snapToIndex(0);

      const layout = tabLayouts.current[id];
      if (layout && tabsContainerW.current > 0) {
        const scrollX = layout.x - (tabsContainerW.current - layout.width) / 2;
        tabsScrollRef.current?.scrollTo({
          x: Math.max(0, scrollX),
          animated: true,
        });
      }
    },
    [locations],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
        opacity={0.22}
        pressBehavior="collapse"
      />
    ),
    [],
  );

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={initialRegion}
        onMapReady={fitToAll}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {locations.map(loc => (
          <StoreMarker
            key={loc.placeId}
            location={loc}
            active={loc.placeId === activeId}
            onPress={() => selectLocation(loc.placeId)}
          />
        ))}
      </MapView>

      {/* Floating store tabs */}
      <View
        style={[s.tabsArea, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <View style={s.tabsContainer}>
          <ScrollView
            ref={tabsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabsRow}
            onLayout={e => {
              tabsContainerW.current = e.nativeEvent.layout.width;
            }}
          >
            {locations.map(loc => {
              const active = loc.placeId === activeId;
              return (
                <TouchableOpacity
                  key={loc.placeId}
                  onPress={() => selectLocation(loc.placeId)}
                  activeOpacity={0.75}
                  style={[s.tab, active && s.tabActive]}
                  onLayout={e => {
                    tabLayouts.current[loc.placeId] = {
                      x: e.nativeEvent.layout.x,
                      width: e.nativeEvent.layout.width,
                    };
                  }}
                >
                  {active && <View style={s.tabDot} />}
                  <Text
                    style={[s.tabLabel, active && s.tabLabelActive]}
                    numberOfLines={1}
                  >
                    {loc.branch || loc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Location info bottom sheet — full width, sits above tab bar */}
      {activeLocation && (
        <RNBottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          animationConfigs={animationConfigs}
          enablePanDownToClose
          overDragResistanceFactor={14}
          topInset={80}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={s.sheetIndicator}
          backgroundStyle={s.sheetBg}
        >
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.sheetScroll}
          >
            <LocationSheet location={activeLocation} />
          </BottomSheetScrollView>
        </RNBottomSheet>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // ── Tabs overlay ──────────────────────────────────────────────────────────
  tabsArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  // Single dark-glass pill that contains all tabs
  tabsContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(26, 16, 10, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 3,
    ...Shadow.md,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  // Each tab — no background by default, gets white pill when active
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...Shadow.sm,
  },
  tabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    maxWidth: 130,
  },
  tabLabelActive: { color: Colors.primary, fontWeight: '800' },

  // ── Bottom sheet chrome ───────────────────────────────────────────────────
  sheetBg: {
    // Warm parchment tint — matches app background, looks glassy not modal-white
    backgroundColor: 'rgba(245, 238, 232, 0.97)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    ...Shadow.lg,
  },
  sheetIndicator: {
    backgroundColor: Colors.gray300,
    width: 32,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  sheetScroll: {
    paddingBottom: 8,
  },

  // ── Sheet inner layout ────────────────────────────────────────────────────
  sheetInner: {
    paddingTop: 4,
    paddingBottom: 36,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    ...Shadow.glow,
  },
  logoBadgeImg: {
    width: '100%',
    height: '100%',
  },

  locationName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,164,64,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingStar: { color: '#F7A440', fontSize: FontSize.xs, fontWeight: '800' },
  ratingNum: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray700,
    marginLeft: 3,
  },
  reviewCount: { fontSize: FontSize.xs, color: Colors.gray400 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusOpen: { backgroundColor: Colors.successLight },
  statusClosed: { backgroundColor: Colors.errorLight },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  // ── Separator ─────────────────────────────────────────────────────────────
  sep: {
    height: 1,
    backgroundColor: 'rgba(156,129,120,0.14)',
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },

  // ── Detail rows ───────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  detailText: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    flex: 1,
    lineHeight: 20,
    paddingTop: 5,
  },

  // ── Hours ─────────────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gray400,
    letterSpacing: 1.0,
  },
  hoursCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  hoursRowToday: {
    backgroundColor: Colors.primaryLight,
  },
  hoursDay: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.gray500 },
  hoursDayToday: { fontWeight: '700', color: Colors.primary },
  hoursTime: { fontSize: FontSize.sm, color: Colors.gray400 },
  hoursTimeToday: { fontWeight: '600', color: Colors.primary },

  // ── CTA buttons ───────────────────────────────────────────────────────────
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },

  ctaOutline: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    backgroundColor: Colors.primaryLight,
    ...(Platform.OS === 'android' ? { elevation: 0 } : Shadow.sm),
  },
  ctaIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(156,129,120,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOutlineText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  ctaFill: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadow.md,
  },
  ctaIconCircleWhite: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaFillText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── Marker styles ────────────────────────────────────────────────────────────

const mk = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  // Circular "balloon" head holding the logo
  head: {
    borderRadius: 999,
    overflow: 'hidden',
    borderColor: '#fff',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  headInactive: {
    width: 36,
    height: 36,
    borderWidth: 2.5,
    padding: 6,
  },
  headActive: {
    width: 50,
    height: 50,
    borderWidth: 3,
    padding: 9,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  // Downward triangle tail forming the pin point
  tail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: -2,
  },
  tailInactive: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
  },
  tailActive: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
  },
});

export default StoreScreen;
