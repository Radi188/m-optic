import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import { selectUser } from '../../../store/slices/authSlice';
import type { RootStackParamList } from '../../../types/navigation';
import { BannerItem } from '../../../types/home';
import { buildFileUrl } from '../../../utils/fileUrlHelper';
import AppText from '../../AppText';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Height of the banner itself; the safe-area inset is added on top (see
// totalHeight), since the slider sits under the status bar.
const SLIDER_HEIGHT = 380;

// Banners are uploaded at whatever shape the shop has to hand — the live set is
// two 3:4 portraits and one 16:9 landscape — so no single box can match them
// all. 'cover' filled the box but paid for it by cropping: 15% off the portrait
// banners and fully HALF of the 16:9 one, which cut the product out of frame.
// 'contain' shows every banner whole; this is what fills the leftover band.
//
// Deliberately dark: the logo and the Sign In button are white and sit over the
// top of the banner, so a light band would swallow them.
const BANNER_BACKDROP = '#141727';

type HeroSliderProps = {
  signinLabel: string;
  slides?: BannerItem[];
};

const DEFAULT_SLIDES: BannerItem[] = [];

const HeroSlider: React.FC<HeroSliderProps> = ({
  slides = DEFAULT_SLIDES,
  signinLabel,
}) => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<BannerItem>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeSlides = slides?.length ? slides : DEFAULT_SLIDES;
  const totalHeight = SLIDER_HEIGHT + insets.top;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (safeSlides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % safeSlides.length;

        if (Number.isFinite(next)) {
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
          });
        }

        return next;
      });
    }, 3800);
  };

  useEffect(() => {
    if (safeSlides.length <= 1) return;

    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [safeSlides.length]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  if (!safeSlides.length) {
    return null;
  }

  return (
    <View style={{ height: totalHeight }}>
      <FlatList
        ref={flatListRef}
        data={safeSlides}
        keyExtractor={item => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={startTimer}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => {
          const imageUrl =
            item.image_url || buildFileUrl(item.image_path) || '';

          return (
            <View style={[styles.slide, { height: totalHeight }]}>
              <Image
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="contain"
              />
            </View>
          );
        }}
      />

      <View style={styles.dots}>
        {safeSlides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, activeIndex === index && styles.dotActive]}
          />
        ))}
      </View>

      <View
        style={[styles.header, { paddingTop: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <AppText style={styles.brandName}>M Optic</AppText>
        </View>

        {user ? (
          <View style={styles.avatarWrap}>
            <AppText style={styles.avatarText}>
              {user.name
                .split(' ')
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AppText>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.signInBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="person-outline" size={14} color={Colors.white} />
            <AppText style={styles.signInText}>{signinLabel}</AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default HeroSlider;

const styles = StyleSheet.create({
  // Height is applied at render time — it depends on the safe-area inset.
  slide: {
    width: SCREEN_WIDTH,
    backgroundColor: BANNER_BACKDROP,
  },

  dots: {
    position: 'absolute',
    bottom: Spacing.lg,
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
  dotActive: {
    width: 18,
    backgroundColor: Colors.white,
  },
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
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
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
