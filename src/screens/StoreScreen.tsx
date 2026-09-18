import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
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
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { fetchBranches, groupHours } from '../services/branchService';
import StoreSkeleton from '../components/ui/Loading/StoreLoadingScreen';
import type { StoreLocation } from '../services/branchService';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';

const MARKER_LOGO = require('../assets/logo_icon_transparent.png');

const todayIndex = () => (new Date().getDay() + 6) % 7;

// Every branch is in or around Phnom Penh, so this is where the map opens when
// no branch has coordinates to centre on.
const PHNOM_PENH_REGION = {
  latitude: 11.5564,
  longitude: 104.9282,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};


/**
 * Full-screen photo viewer for a branch gallery.
 *
 * Paged horizontally so the customer can swipe through the shopfront without
 * returning to the sheet, and dismissed by the close button or the hardware
 * back button.
 */
const PhotoViewer: React.FC<{
  photos: string[];
  index: number | null;
  onClose: () => void;
}> = ({ photos, index, onClose }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  if (index === null || !photos.length) return null;

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.viewerRoot}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: index * width, y: 0 }}
          onMomentumScrollEnd={e =>
            setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        >
          {photos.map(uri => (
            <View key={uri} style={{ width, height }}>
              <AppImage
                source={{ uri }}
                style={s.viewerImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[s.viewerClose, { top: insets.top + 12 }]}
          activeOpacity={0.8}
          onPress={onClose}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {photos.length > 1 && (
          <View style={[s.viewerDots, { bottom: insets.bottom + 24 }]}>
            {photos.map((uri, i) => (
              <View
                key={uri}
                style={[s.viewerDot, i === current && s.viewerDotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const LocationSheet: React.FC<{ location: StoreLocation }> = ({ location }) => {
  const { t } = useTranslation();
  const today = todayIndex();
  const hours = groupHours(location.weekdayText);

  /** Index of the photo open in the viewer, or null when it is closed. */
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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
  }, [location.id]);

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
    // A branch that has coordinates ships its own Google Maps link; it points at
    // the exact spot, whereas the address strings are often just "Phnom Penh".
    if (location.mapsLink) {
      Linking.openURL(location.mapsLink);
      return;
    }

    const q = encodeURIComponent(location.address || location.name);
    const url =
      Platform.OS === 'ios'
        ? `maps://maps.apple.com/?q=${q}`
        : `https://www.google.com/maps/search/?api=1&query=${q}`;

    Linking.openURL(url);
  };

  const callStore = () => {
    if (!location.phone) return;
    Linking.openURL(`tel:${location.phone.replace(/[\s-]/g, '')}`);
  };

  return (
    <View style={s.sheetInner}>
      <Animated.View style={[s.headerRow, headerStyle]}>
        <View style={s.logoBadge}>
          <LinearGradient
            colors={['#E8DAD2', '#CDB4A8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <AppImage
            source={
              location.photoUri ? { uri: location.photoUri } : MARKER_LOGO
            }
            style={s.logoBadgeImg}
            resizeMode="contain"
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            style={s.locationName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {location.name}
          </AppText>

          <View style={s.metaRow}>
            {location.rating > 0 && (
              <View style={s.ratingPill}>
                <AppText style={s.ratingStar}>★</AppText>
                <AppText style={s.ratingNum}>
                  {location.rating.toFixed(1)}
                </AppText>
                <AppText style={s.reviewCount}>
                  {' '}
                  ({location.userRatingCount})
                </AppText>
              </View>
            )}

            {/* A branch with no opening hours set reports 'Unknown'. Showing
                that as "Closed" would be a claim the data does not support, so
                the pill is omitted entirely instead. */}
            {location.status !== 'unknown' && (
              <View
                style={[
                  s.statusPill,
                  location.status === 'open' ? s.statusOpen : s.statusClosed,
                ]}
              >
                <View
                  style={[
                    s.statusDot,
                    location.status === 'open'
                      ? s.statusDotOpen
                      : s.statusDotClosed,
                  ]}
                />
                <AppText
                  style={[
                    s.statusText,
                    location.status === 'open'
                      ? s.statusTextOpen
                      : s.statusTextClosed,
                  ]}
                >
                  {location.status === 'open' ? t('OpenNow') : t('Closed')}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View style={detailsStyle}>
        <View style={s.sep} />

        {/* Address and phone sit side by side: both are short, and stacking
            them pushed the hours and the gallery below the fold. The phone
            takes only the width it needs, so a long address keeps the rest. */}
        <View style={s.detailRow}>
          <View style={s.detailItem}>
            <View style={s.detailIconWrap}>
              <Ionicons
                name="location-outline"
                size={15}
                color={Colors.primary}
              />
            </View>
            <AppText style={s.detailText} numberOfLines={2}>
              {location.address}
            </AppText>
          </View>

          {!!location.phone && (
            <TouchableOpacity
              style={s.detailItemPhone}
              activeOpacity={0.72}
              onPress={callStore}
            >
              <View style={s.detailIconWrap}>
                <Ionicons name="call-outline" size={15} color={Colors.primary} />
              </View>
              <AppText style={s.detailTextPhone} numberOfLines={1}>
                {location.phone}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {location.photos.length > 0 && (
          <>
            <View style={s.sep} />

            {/* Only some branches have a gallery, so the whole block is
                omitted rather than leaving an empty strip. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.galleryRow}
            >
              {location.photos.map((uri, index) => (
                <TouchableOpacity
                  key={uri}
                  activeOpacity={0.85}
                  onPress={() => setViewerIndex(index)}
                >
                  <AppImage source={{ uri }} style={s.galleryImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {hours.length > 0 && (
          <>
            <View style={s.sep} />

            <View style={s.sectionHeader}>
              <Ionicons name="time-outline" size={13} color={Colors.gray400} />
              <AppText style={s.sectionLabel}>{t('Hours')}</AppText>
            </View>

            <View style={s.hoursCard}>
              {location.weekdayText.map((raw, i) => {
                const sep = raw.indexOf(': ');
                const day = sep >= 0 ? raw.slice(0, sep) : raw;
                const time = sep >= 0 ? raw.slice(sep + 2) : '';
                const isToday = i === today;

                return (
                  <View
                    key={i}
                    style={[s.hoursRow, isToday && s.hoursRowToday]}
                  >
                    <AppText style={[s.hoursDay, isToday && s.hoursDayToday]}>
                      {day}
                    </AppText>
                    <AppText style={[s.hoursTime, isToday && s.hoursTimeToday]}>
                      {time}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={s.sep} />
      </Animated.View>

      <PhotoViewer
        photos={location.photos}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />

      <Animated.View style={[s.ctaRow, ctaStyle]}>
        <TouchableOpacity
          style={s.ctaOutline}
          onPress={openDirections}
          activeOpacity={0.72}
        >
          <View style={s.ctaIconCircle}>
            <Ionicons name="navigate" size={15} color={Colors.primary} />
          </View>
          <AppText style={s.ctaOutlineText}>{t('Directions')}</AppText>
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
            <AppText style={s.ctaFillText}>{t('CallStore')}</AppText>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
};

const StoreMarker: React.FC<{
  location: StoreLocation;
  active: boolean;
  onPress: () => void;
}> = ({ location, active, onPress }) => {
  const [loaded, setLoaded] = useState(false);
  const [settled, setSettled] = useState(false);
  // A branch logo that 404s would leave an empty pin, so a failed load falls
  // back to the app mark rather than showing nothing.
  const [logoFailed, setLogoFailed] = useState(false);

  const markerLogo =
    location.photoUri && !logoFailed
      ? { uri: location.photoUri }
      : MARKER_LOGO;

  useEffect(() => {
    setSettled(false);
    if (!loaded) return;

    const timer = setTimeout(() => setSettled(true), 600);
    return () => clearTimeout(timer);
  }, [active, loaded]);

  return (
    <Marker
      coordinate={{ latitude: location.lat, longitude: location.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={!loaded || !settled}
    >
      <View style={mk.wrap}>
        <View style={[mk.head, active ? mk.headActive : mk.headInactive]}>
          <Image
            source={markerLogo}
            style={mk.logo}
            resizeMode="contain"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLogoFailed(true);
              setLoaded(true);
            }}
          />
        </View>
        <View style={[mk.tail, active ? mk.tailActive : mk.tailInactive]} />
      </View>
    </Marker>
  );
};

const StoreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState('');

  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<RNBottomSheet>(null);
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const tabsContainerW = useRef(0);

  // `showLoader` off keeps the map and the sheet on screen while the branches
  // are refetched, so a pull-to-refresh doesn't tear the map down.
  const loadBranches = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const locs = await fetchBranches();
      setLocations(locs);
      // Keep the branch the user is looking at selected across a refresh.
      setActiveId(prev =>
        locs.some(l => l.id === prev) ? prev : locs[0]?.id ?? '',
      );
    } catch (err: any) {
      console.warn('[Store] branches failed:', err.message);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBranches(false);
  }, [loadBranches]);

  useEffect(() => {
    loadBranches(true);
  }, [loadBranches]);

  useEffect(() => {
    if (!locations.length) return;

    const timer = setTimeout(() => sheetRef.current?.snapToIndex(0), 350);
    return () => clearTimeout(timer);
  }, [locations.length]);

  const animationConfigs = useBottomSheetSpringConfigs({
    duration: 460,
    dampingRatio: 0.76,
    overshootClamping: false,
  });

  const snapPoints = useMemo(() => ['42%', '88%'], []);

  const activeLocation = locations.find(
    location => location.id === activeId,
  );

  // Most branches have no coordinates yet. They still get a tab and a details
  // sheet — only the map has to leave them out.
  const mappable = useMemo(
    () => locations.filter(location => location.hasCoords),
    [locations],
  );

  const initialRegion = useMemo(() => {
    // Falls back to Phnom Penh rather than undefined: with no mappable branch
    // the map would otherwise open on whatever region it defaults to.
    if (!mappable.length) return PHNOM_PENH_REGION;

    const firstLocation = mappable[0];

    return {
      latitude: firstLocation.lat,
      longitude: firstLocation.lng,
      latitudeDelta: 0.4,
      longitudeDelta: 0.4,
    };
  }, [mappable]);

  const fitToAll = useCallback(() => {
    if (mappable.length < 2) return;

    mapRef.current?.fitToCoordinates(
      mappable.map(location => ({
        latitude: location.lat,
        longitude: location.lng,
      })),
      {
        edgePadding: { top: 120, right: 60, bottom: 360, left: 60 },
        animated: false,
      },
    );
  }, [mappable]);

  const selectLocation = useCallback(
    (id: string) => {
      setActiveId(id);

      const selectedLocation = locations.find(
        location => location.id === id,
      );

      // Without coordinates there is nowhere to fly to; leave the map put and
      // just open the sheet.
      if (selectedLocation?.hasCoords) {
        mapRef.current?.animateToRegion(
          {
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
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

  // The backdrop is a full-screen view that swallows every touch above the
  // sheet whenever the sheet sits above `disappearsOnIndex` — even while it is
  // fully transparent. Keeping it at -1 therefore killed panning and zooming on
  // the map the moment the sheet opened at 42%.
  //
  // Tied to index 0 instead, the backdrop is inert at the half snap (the map
  // behaves exactly as it does with the sheet closed) and only takes over at
  // the 88% snap, where it dims the sliver of map left and a tap collapses the
  // sheet back to 42%.
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={0}
        appearsOnIndex={1}
        opacity={0.22}
        pressBehavior="collapse"
      />
    ),
    [],
  );

  if (loading) {
    return <StoreSkeleton />;
  }

  return (
    <View style={s.root}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={initialRegion}
        onMapReady={fitToAll}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {mappable.map(location => (
          <StoreMarker
            key={location.id}
            location={location}
            active={location.id === activeId}
            onPress={() => selectLocation(location.id)}
          />
        ))}
      </MapView>

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
            onLayout={event => {
              tabsContainerW.current = event.nativeEvent.layout.width;
            }}
          >
            {locations.map(location => {
              const active = location.id === activeId;

              return (
                <TouchableOpacity
                  key={location.id}
                  onPress={() => selectLocation(location.id)}
                  activeOpacity={0.75}
                  style={[s.tab, active && s.tabActive]}
                  onLayout={event => {
                    tabLayouts.current[location.id] = {
                      x: event.nativeEvent.layout.x,
                      width: event.nativeEvent.layout.width,
                    };
                  }}
                >
                  {active && <View style={s.tabDot} />}

                  <AppText
                    style={[s.tabLabel, active && s.tabLabelActive]}
                    numberOfLines={1}
                  >
                    {location.branch || location.name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

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
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          >
            <LocationSheet location={activeLocation} />
          </BottomSheetScrollView>
        </RNBottomSheet>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  tabsArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
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
    // Branch names are full Khmer strings ("សាខាស្ទឹងមានជ៍យ"), not the short
    // codes the tabs used to show, so they need more room before truncating.
    maxWidth: 180,
  },
  tabLabelActive: { color: Colors.primary, fontWeight: '800' },

  sheetBg: {
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
  sheetInner: {
    paddingTop: 4,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerImage: {
    flex: 1,
    width: '100%',
  },
  viewerClose: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerDots: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  viewerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  viewerDotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },

  galleryRow: {
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
  },

  galleryImage: {
    width: 168,
    height: 122,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
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
  // A bordered chip on the sheet's own surface rather than a solid tint
  // block: the rest of this screen is white cards with hairline borders, and
  // the filled pill read as a button sitting in the middle of the title.
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingLeft: 7,
    paddingRight: 10,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 1,
  },
  statusOpen: {
    backgroundColor: 'rgba(45,189,126,0.08)',
    borderColor: 'rgba(45,189,126,0.28)',
  },
  statusClosed: {
    backgroundColor: 'rgba(217,45,32,0.06)',
    borderColor: 'rgba(217,45,32,0.22)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // The dot carries a soft halo so "open" reads as a live indicator rather
  // than a bullet point.
  statusDotOpen: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  statusDotClosed: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusTextOpen: { color: '#1F8A54' },
  statusTextClosed: { color: Colors.error },
  sep: {
    height: 1,
    backgroundColor: 'rgba(156,129,120,0.14)',
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  // `minWidth: 0` is what actually lets this half shrink: without it a flex
  // child refuses to go below its content width and pushes into its sibling.
  detailItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  // Sized to its number rather than sharing the width evenly — the address is
  // the variable-length half.
  detailItemPhone: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailTextPhone: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
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
    minWidth: 0,
    lineHeight: 20,
  },
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

const mk = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
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
