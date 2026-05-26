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
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import RNBottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import Ionicons from '@react-native-vector-icons/ionicons';
import { GlassView } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { searchMOpticLocations, groupHours } from '../services/placesService';
import type { PlaceLocation } from '../services/placesService';

// ─── Map HTML (Leaflet + OpenStreetMap) ───────────────────────────────────────

const buildMapHTML = (locs: PlaceLocation[]): string => {
  if (!locs.length) return '<html><body style="background:#1a1a1a"/></html>';

  const locsJson = JSON.stringify(
    locs.map(l => ({ id: l.placeId, lat: l.lat, lng: l.lng })),
  );
  const c = locs[0];

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#e8e8e8}
    #map{width:100%;height:100%;touch-action:none}
    .leaflet-tile-pane{filter:none}

    .leaflet-control-attribution{font-size:8px!important;opacity:.4!important;background:rgba(255,255,255,.7)!important;color:#666!important}
    .leaflet-control-attribution a{color:#888!important}

    .leaflet-top.leaflet-left{top:50%!important;transform:translateY(-50%);left:14px!important}
    .leaflet-control-zoom{border:none!important;box-shadow:0 4px 18px rgba(0,0,0,.4)!important;border-radius:16px!important;overflow:hidden;margin:0!important}
    .leaflet-control-zoom a{width:38px!important;height:38px!important;line-height:38px!important;color:#9C8178!important;background:rgba(255,255,255,.95)!important;border:none!important;font-size:18px!important;font-weight:600!important;transition:background .15s}
    .leaflet-control-zoom a:hover{background:#fff!important}
    .leaflet-bar a:first-child{border-bottom:1px solid rgba(156,129,120,.12)!important}

    .pin-wrap{display:inline-block;line-height:0}
    .pin-active{filter:drop-shadow(0 8px 22px rgba(156,129,120,.72))}
    .pin-inactive{filter:drop-shadow(0 3px 10px rgba(100,65,50,.28))}
  </style>
</head>
<body>
<div id="map"></div>
<script>
var LOCS=${locsJson};
var activeId=${JSON.stringify(c.placeId)};
var markers={};

var map=L.map('map',{zoomControl:false,attributionControl:true,touchZoom:true,dragging:true,tap:false})
          .setView([${c.lat},${c.lng}],13);
L.control.zoom({position:'topleft'}).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  maxZoom:19,subdomains:'abc'
}).addTo(map);

function makeIcon(id){
  var a=id===activeId;
  var html=a
    ? '<div class="pin-wrap pin-active">'
      + '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="70" viewBox="0 0 56 70">'
      + '<circle cx="28" cy="26" r="24" fill="#9C8178" stroke="white" stroke-width="3.5"/>'
      + '<circle cx="28" cy="26" r="18.5" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.5"/>'
      + '<text x="28" y="33" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="900" font-size="21" letter-spacing="1" fill="white">M</text>'
      + '<line x1="18" y1="38" x2="38" y2="38" stroke="rgba(255,255,255,.45)" stroke-width="1"/>'
      + '<path d="M17 46 L28 66 L39 46 Q28 53 17 46Z" fill="#9C8178" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<ellipse cx="28" cy="68" rx="5.5" ry="2.5" fill="rgba(0,0,0,.10)"/>'
      + '</svg></div>'
    : '<div class="pin-wrap pin-inactive">'
      + '<svg xmlns="http://www.w3.org/2000/svg" width="42" height="54" viewBox="0 0 42 54">'
      + '<circle cx="21" cy="19" r="17.5" fill="rgba(156,129,120,.7)" stroke="rgba(255,255,255,.92)" stroke-width="2.5"/>'
      + '<circle cx="21" cy="19" r="12.5" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>'
      + '<text x="21" y="25" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="900" font-size="15" letter-spacing=".5" fill="rgba(255,255,255,.95)">M</text>'
      + '<line x1="13" y1="30" x2="29" y2="30" stroke="rgba(255,255,255,.35)" stroke-width="1"/>'
      + '<path d="M12 34 L21 50 L30 34 Q21 40 12 34Z" fill="rgba(156,129,120,.7)" stroke="rgba(255,255,255,.92)" stroke-width="2" stroke-linejoin="round"/>'
      + '<ellipse cx="21" cy="52" rx="4" ry="2" fill="rgba(0,0,0,.08)"/>'
      + '</svg></div>';
  return L.divIcon({
    className:'',
    html:html,
    iconSize:a?[56,70]:[42,54],
    iconAnchor:a?[28,67]:[21,51]
  });
}

LOCS.forEach(function(loc){
  var m=L.marker([loc.lat,loc.lng],{icon:makeIcon(loc.id)}).addTo(map);
  m.on('click',function(){
    if(window.ReactNativeWebView)
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick',id:loc.id}));
  });
  markers[loc.id]={m:m,lat:loc.lat,lng:loc.lng};
});

var allLatLngs=LOCS.map(function(l){return[l.lat,l.lng];});
map.fitBounds(allLatLngs,{padding:[80,60],maxZoom:15});

function setActive(id){
  activeId=id;
  Object.keys(markers).forEach(function(k){markers[k].m.setIcon(makeIcon(k));});
  var t=markers[id];
  if(t) map.flyTo([t.lat,t.lng],15,{duration:0.7,easeLinearity:0.35});
}

function onMsg(e){
  try{var d=JSON.parse(e.data);if(d.type==='setActive')setActive(d.id);}catch(x){}
}
window.addEventListener('message',onMsg);
document.addEventListener('message',onMsg);
</script>
</body>
</html>`;
};

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
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={s.logoBadgeLetter}>M</Text>
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

// ─── Screen ───────────────────────────────────────────────────────────────────

const StoreScreen: React.FC = () => {
  const [locations, setLocations] = useState<PlaceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('');
  const webViewRef = useRef<WebView>(null);
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

  const mapHTML = useMemo(() => buildMapHTML(locations), [locations]);
  // First snap: peek with header + address visible. Second: full content.
  const snapPoints = useMemo(() => ['42%', '88%'], []);
  const activeLocation = locations.find(l => l.placeId === activeId);

  const selectLocation = useCallback((id: string) => {
    setActiveId(id);
    webViewRef.current?.injectJavaScript(
      `setActive(${JSON.stringify(id)});true;`,
    );
    sheetRef.current?.snapToIndex(0);

    const layout = tabLayouts.current[id];
    if (layout && tabsContainerW.current > 0) {
      const scrollX = layout.x - (tabsContainerW.current - layout.width) / 2;
      tabsScrollRef.current?.scrollTo({
        x: Math.max(0, scrollX),
        animated: true,
      });
    }
  }, []);

  const onWebMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const d = JSON.parse(e.nativeEvent.data);
        if (d.type === 'markerClick') selectLocation(d.id);
      } catch {}
    },
    [selectLocation],
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
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={s.map}
        onMessage={onWebMessage}
        javaScriptEnabled
        scrollEnabled={false}
        originWhitelist={['*']}
        mixedContentMode="always"
      />

      {/* Floating store tabs */}
      <SafeAreaView style={s.tabsArea} pointerEvents="box-none">
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
      </SafeAreaView>

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
    ...Shadow.glow,
  },
  logoBadgeLetter: {
    color: '#fff',
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    ...Shadow.sm,
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

export default StoreScreen;
