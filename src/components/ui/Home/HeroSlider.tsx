import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  Linking,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import { BannerItem } from '../../../types/home';
import { buildFileUrl } from '../../../utils/fileUrlHelper';
import AppText from '../../AppText';
import AppImage from '../../AppImage';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Banner geometry.
 *
 * The old slider was a full-bleed 380pt panel that drew every banner with
 * `contain` on a near-black backdrop. That made the artwork the shop uploads
 * do all the work: it had to be the right shape, dark enough for the white
 * logo and Sign In button on top of it, and carry its own headline — anything
 * else left letterbox bands down the sides.
 *
 * A fixed 16:9 card fixes all three. `cover` means any uploaded photo fills it
 * cleanly, the crop is shallow because the ratio is a common one, and the
 * headline comes from the API rather than being baked into the image.
 */
const GUTTER = Spacing.md;
const GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - GUTTER * 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (9 / 16));
const SNAP = CARD_WIDTH + GAP;

const AUTOPLAY_MS = 4200;

type HeroSliderProps = {
  slides?: BannerItem[];
};

const DEFAULT_SLIDES: BannerItem[] = [];

const HeroSlider: React.FC<HeroSliderProps> = ({ slides = DEFAULT_SLIDES }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<BannerItem>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeSlides = slides?.length ? slides : DEFAULT_SLIDES;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safeSlides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % safeSlides.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
  }, [safeSlides.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const openBanner = (item: BannerItem) => {
    if (!item.cta_link) return;
    Linking.openURL(item.cta_link).catch(() => {});
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={safeSlides}
        keyExtractor={item => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={styles.list}
        onMomentumScrollEnd={startTimer}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SNAP,
          offset: SNAP * index,
          index,
        })}
        renderItem={({ item }) => {
          const imageUrl =
            item.image_url || buildFileUrl(item.image_path) || '';
          const hasCaption = !!item.title || !!item.description;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={item.cta_link ? 0.9 : 1}
              disabled={!item.cta_link}
              onPress={() => openBanner(item)}
            >
              <AppImage
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />

              {/* The scrim is only drawn when there is copy to protect, so a
                  banner that is purely artwork stays untouched. */}
              {hasCaption && (
                <>
                  <LinearGradient
                    colors={['transparent', 'rgba(16,10,6,0.78)']}
                    start={{ x: 0.5, y: 0.25 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />

                  <View style={styles.caption}>
                    {!!item.title && (
                      <AppText
                        style={[
                          styles.title,
                          !!item.text_color && { color: item.text_color },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </AppText>
                    )}

                    {!!item.description && (
                      <AppText style={styles.description} numberOfLines={1}>
                        {item.description}
                      </AppText>
                    )}

                    {!!item.cta_text && !!item.cta_link && (
                      <View
                        style={[
                          styles.cta,
                          !!item.button_color && {
                            backgroundColor: item.button_color,
                          },
                        ]}
                      >
                        <AppText style={styles.ctaText}>
                          {item.cta_text}
                        </AppText>
                        <Ionicons
                          name="arrow-forward"
                          size={12}
                          color={Colors.white}
                        />
                      </View>
                    )}
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {safeSlides.length > 1 && (
        <View style={styles.dots}>
          {safeSlides.map((item, index) => (
            <View
              key={item.id}
              style={[styles.dot, activeIndex === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default HeroSlider;

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: GUTTER,
    paddingTop: Spacing.sm,
    gap: GAP,
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
  },

  caption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 3,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  ctaText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.white,
  },

  dots: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gray300,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
});
