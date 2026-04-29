import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import RNBottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Ionicons from '@react-native-vector-icons/ionicons';
import { GlassView } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { searchMOpticLocations, groupHours } from '../services/placesService';
import type { PlaceLocation } from '../services/placesService';
import { TAB_BAR_HEIGHT } from '../navigation/BottomTabNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Map HTML (Leaflet + Esri satellite, centered on Phnom Penh) ──────────────

const buildMapHTML = (locs: PlaceLocation[]): string => {
  if (!locs.length) return '<html><body style="background:#1a1a1a"/></html>';

  const locsJson = JSON.stringify(
    locs.map(l => ({ id: l.placeId, lat: l.lat, lng: l.lng }))
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
    .leaflet-tile-pane{filter:grayscale(100%) contrast(1.1) brightness(1.05)}

    .leaflet-control-attribution{font-size:8px!important;opacity:.4!important;background:rgba(255,255,255,.7)!important;color:#666!important}
    .leaflet-control-attribution a{color:#888!important}

    .leaflet-top.leaflet-left{top:50%!important;transform:translateY(-50%);left:14px!important}
    .leaflet-control-zoom{border:none!important;box-shadow:0 4px 18px rgba(0,0,0,.4)!important;border-radius:16px!important;overflow:hidden;margin:0!important}
    .leaflet-control-zoom a{width:38px!important;height:38px!important;line-height:38px!important;color:#9C8178!important;background:rgba(255,255,255,.95)!important;border:none!important;font-size:18px!important;font-weight:600!important;transition:background .15s}
    .leaflet-control-zoom a:hover{background:#fff!important}
    .leaflet-bar a:first-child{border-bottom:1px solid rgba(156,129,120,.12)!important}

    .mpin{display:flex;flex-direction:column;align-items:center}
    .mpin-body{
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      border:3px solid #fff;
      transition:width .2s,height .2s,background .2s,filter .2s
    }
    .mpin-body.active{
      width:52px;height:52px;
      background:#9C8178;
      filter:drop-shadow(0 8px 18px rgba(156,129,120,.70))
    }
    .mpin-body.inactive{
      width:38px;height:38px;
      background:rgba(156,129,120,.60);
      border-width:2.5px;border-color:rgba(255,255,255,.80);
      filter:drop-shadow(0 3px 10px rgba(100,65,50,.30))
    }
    .mpin-letter{
      transform:rotate(45deg);color:#fff;
      font-weight:900;
      font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;
      line-height:1
    }
    .mpin-body.active  .mpin-letter{font-size:20px}
    .mpin-body.inactive .mpin-letter{font-size:14px}
    .mpin-shadow{
      border-radius:50%;
      background:rgba(70,35,15,.16);
      filter:blur(2px);margin-top:3px
    }
    .mpin-body.active  ~ .mpin-shadow{width:18px;height:5px}
    .mpin-body.inactive~ .mpin-shadow{width:12px;height:3px}
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

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
  attribution:'© <a href="https://carto.com">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  maxZoom:19,subdomains:'abcd'
}).addTo(map);

function makeIcon(id){
  var a=id===activeId, sz=a?60:46;
  return L.divIcon({
    className:'',
    html:'<div class="mpin"><div class="mpin-body '+(a?'active':'inactive')+'"><span class="mpin-letter">M</span></div><div class="mpin-shadow"></div></div>',
    iconSize:[sz,sz+10],
    iconAnchor:[sz/2,sz+8]
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

// ─── Location Info Sheet ──────────────────────────────────────────────────────

const LocationSheet: React.FC<{ location: PlaceLocation }> = ({ location }) => {
  const openDirections = () => {
    const q = encodeURIComponent(location.address);
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url);
  };

  const callStore = () => Linking.openURL(`tel:${location.phone.replace(/[\s-]/g, '')}`);

  const hours = groupHours(location.weekdayText);

  return (
    <View style={s.sheetInner}>
      {/* Header */}
      <View style={s.sheetHead}>
        <GlassView intensity="medium" borderRadius={BorderRadius.md} style={s.sheetLogo} shadow={false}>
          <Text style={s.sheetLogoLetter}>M</Text>
        </GlassView>
        <View style={{ flex: 1 }}>
          <Text style={s.locationName} numberOfLines={2}>{location.name}</Text>
          <View style={s.metaRow}>
            {location.rating > 0 && (
              <>
                <Text style={s.star}>★</Text>
                <Text style={s.ratingNum}>{location.rating.toFixed(1)}</Text>
                <Text style={s.reviewCount}>({location.userRatingCount})</Text>
              </>
            )}
            <View style={[s.dot, { backgroundColor: location.isOpen ? Colors.success : Colors.error }]} />
            <Text style={[s.openStatus, { color: location.isOpen ? Colors.success : Colors.error }]}>
              {location.isOpen ? 'Open now' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.sep} />

      {/* Address & phone */}
      {[
        { icon: 'location-outline', text: location.address },
        ...(location.phone ? [{ icon: 'call-outline', text: location.phone }] : []),
      ].map(row => (
        <View key={row.icon} style={s.detailRow}>
          <View style={s.detailIcon}>
            <Ionicons name={row.icon as any} size={15} color={Colors.primary} />
          </View>
          <Text style={s.detailText}>{row.text}</Text>
        </View>
      ))}

      {/* Hours */}
      {hours.length > 0 && (
        <>
          <View style={s.sep} />
          <Text style={s.sectionLabel}>HOURS</Text>
          {hours.map((h, i) => (
            <View key={i} style={s.hoursRow}>
              <Text style={s.hoursDay}>{h.days}</Text>
              <Text style={s.hoursTime}>{h.time}</Text>
            </View>
          ))}
        </>
      )}

      <View style={s.sep} />

      {/* CTA */}
      <View style={s.ctaRow}>
        <TouchableOpacity style={s.ctaOutline} onPress={openDirections} activeOpacity={0.75}>
          <Ionicons name="navigate-outline" size={17} color={Colors.primary} />
          <Text style={s.ctaOutlineText}>Directions</Text>
        </TouchableOpacity>
        {location.phone ? (
          <TouchableOpacity style={s.ctaFill} onPress={callStore} activeOpacity={0.75}>
            <Ionicons name="call-outline" size={17} color="#fff" />
            <Text style={s.ctaFillText}>Call Store</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const StoreScreen: React.FC = () => {
  const [locations, setLocations] = useState<PlaceLocation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeId, setActiveId]   = useState('');
  const webViewRef  = useRef<WebView>(null);
  const sheetRef    = useRef<RNBottomSheet>(null);
  const insets      = useSafeAreaInsets();
  const bottomInset = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);

  useEffect(() => {
    searchMOpticLocations()
      .then(locs => {
        setLocations(locs);
        if (locs.length) setActiveId(locs[0].placeId);
      })
      .finally(() => setLoading(false));
  }, []);

  const mapHTML        = useMemo(() => buildMapHTML(locations), [locations]);
  const snapPoints     = useMemo(() => ['44%', '75%'], []);
  const activeLocation = locations.find(l => l.placeId === activeId);

  const selectLocation = useCallback((id: string) => {
    setActiveId(id);
    webViewRef.current?.injectJavaScript(`setActive(${JSON.stringify(id)});true;`);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const onWebMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'markerClick') selectLocation(d.id);
    } catch {}
  }, [selectLocation]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.25} />
    ), [],
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsRow}
        >
          {locations.map(loc => {
            const active = loc.placeId === activeId;
            return (
              <TouchableOpacity
                key={loc.placeId}
                onPress={() => selectLocation(loc.placeId)}
                activeOpacity={0.8}
                style={[s.tab, active && s.tabActive]}
              >
                {active && <View style={s.tabPip} />}
                <Text style={[s.tabLabel, active && s.tabLabelActive]} numberOfLines={1}>
                  {loc.branch || loc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Location info bottom sheet */}
      {activeLocation && (
        <RNBottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          bottomInset={bottomInset}
          detached
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={s.sheetIndicator}
          backgroundStyle={s.sheetBg}
          style={s.sheetDetached}
        >
          <BottomSheetScrollView>
            <LocationSheet location={activeLocation} />
          </BottomSheetScrollView>
        </RNBottomSheet>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1 },
  map:    { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Tabs overlay
  tabsArea: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    gap: 6,
    ...Shadow.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  tabPip: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  tabLabel:       { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray600, maxWidth: 120 },
  tabLabelActive: { color: '#fff' },

  // Bottom sheet
  sheetDetached: {
    marginHorizontal: 12,
  },
  sheetBg: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    ...Shadow.lg,
  },
  sheetIndicator: {
    backgroundColor: Colors.gray300,
    width: 36, height: 4,
    borderRadius: BorderRadius.full,
  },
  sheetInner: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 48,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sheetLogo: {
    width: 50, height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.glassBorderStrong,
    flexShrink: 0,
    ...Shadow.glow,
  },
  sheetLogoLetter: {
    color: Colors.primary,
    fontSize: FontSize.xl,
    fontWeight: '900',
  },
  locationName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star:        { color: '#F7A440', fontSize: FontSize.sm, fontWeight: '700' },
  ratingNum:   { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black },
  reviewCount: { fontSize: FontSize.xs, color: Colors.gray400 },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  openStatus: { fontSize: FontSize.xs, fontWeight: '600' },

  sep: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailIcon: {
    width: 28, height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
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
    paddingTop: 4,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hoursDay:  { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray600 },
  hoursTime: { fontSize: FontSize.sm, color: Colors.gray400 },

  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  ctaOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    backgroundColor: Colors.primaryLight,
  },
  ctaOutlineText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  ctaFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
  },
  ctaFillText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
});

export default StoreScreen;
