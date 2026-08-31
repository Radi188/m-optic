import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Share,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import AppText from '../components/AppText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMB_SIZE = 70;
const HEADER_CONTENT_HEIGHT = 72;
// Was 110dp reserved for a thumbnail strip that is never rendered, which left a
// dead band under the photo and shrank it for no reason. Now just enough for
// the page dots.
const BOTTOM_BAR_HEIGHT = 56;

/**
 * Warm studio backdrop, shared with the 3-D viewer (GlassModelScene) so both
 * read as the same room.
 *
 * The product shots are transparent PNG/AVIF — genuinely transparent, not white
 * — so whatever sits behind them IS the photo's background. Pure black was the
 * worst case for this catalogue: the frames are pale gold with clear lenses,
 * and thin light metal on black loses its edges. Warm rather than neutral grey,
 * because the brand accent is a taupe (#9C8178) and a cold grey turns the gold
 * green.
 */
const STUDIO = {
  centre: '#F6F3EF',
  mid: '#DED8D2',
  edge: '#B9B1AA',
  ink: '#2B2523',
  inkSoft: 'rgba(43,37,35,0.58)',
  chip: 'rgba(43,37,35,0.06)',
  chipBorder: 'rgba(43,37,35,0.12)',
};

// A radial sweep rather than a flat fill: light behind the product, falling off
// towards the edges, so the frame sits in a pool of light instead of on a wall.
const StudioBackdrop: React.FC = () => (
  <Svg
    style={StyleSheet.absoluteFill}
    width={SCREEN_WIDTH}
    height={SCREEN_HEIGHT}
    pointerEvents="none"
  >
    <Defs>
      <RadialGradient id="studioSweep" cx="50%" cy="42%" rx="82%" ry="64%">
        <Stop offset="0" stopColor={STUDIO.centre} />
        <Stop offset="0.58" stopColor={STUDIO.mid} />
        <Stop offset="1" stopColor={STUDIO.edge} />
      </RadialGradient>
    </Defs>
    <Rect
      x="0"
      y="0"
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      fill="url(#studioSweep)"
    />
  </Svg>
);

type ProductImageViewScreenProps = {
  navigation: any;
  route: {
    params: {
      images: string[];
      initialIndex?: number;
      productName?: string;
    };
  };
};

const ProductImageViewScreen: React.FC<ProductImageViewScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const {
    images = [],
    initialIndex = 0,
    productName = 'Product Images',
  } = route.params || {};

  const flatListRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const validImages = useMemo(
    () => images.filter(item => typeof item === 'string' && item.trim()),
    [images],
  );

  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const zoomAreaHeight = SCREEN_HEIGHT - headerHeight - BOTTOM_BAR_HEIGHT;

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const goToImage = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setActiveIndex(index);
  };

  const handleShare = async () => {
    try {
      const currentImage = validImages[activeIndex];
      if (!currentImage) return;

      await Share.share({
        message: currentImage,
        url: currentImage,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const renderImage = ({ item }: { item: string }) => (
    <View style={styles.page}>
      <View
        style={[
          styles.imageCenterArea,
          {
            paddingTop: headerHeight,
            paddingBottom: BOTTOM_BAR_HEIGHT,
          },
        ]}
      >
        <ImageZoom
          uri={item}
          minScale={1}
          maxScale={4}
          doubleTapScale={2.5}
          isDoubleTapEnabled
          isPanEnabled
          isPinchEnabled
          resizeMode="contain"
          style={[
            styles.zoomWrapper,
            {
              height: zoomAreaHeight,
            },
          ]}
          onInteractionStart={() => setIsZoomed(true)}
          onResetAnimationEnd={() => setIsZoomed(false)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StudioBackdrop />
      {/* Dark glyphs now that the backdrop is light. */}
      <StatusBar barStyle="dark-content" backgroundColor={STUDIO.centre} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View pointerEvents="box-none" style={styles.headerLayer}>
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 8,
                height: headerHeight,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close-outline" size={26} color={STUDIO.ink} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <AppText style={styles.headerTitle} numberOfLines={1}>
                {productName}
              </AppText>
              <AppText style={styles.headerCount}>
                {validImages.length
                  ? `${activeIndex + 1}/${validImages.length}`
                  : '0/0'}
              </AppText>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.85}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={20} color={STUDIO.ink} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.85}
                onPress={() => console.log('wishlist')}
              >
                <Ionicons name="heart-outline" size={20} color={STUDIO.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={validImages}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={renderImage}
          horizontal
          pagingEnabled={!isZoomed}
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={styles.mainSlider}
        />

        {/* Fills the band the phantom thumbnail strip used to occupy. */}
        {validImages.length > 1 && (
          <View style={styles.dotsRow} pointerEvents="box-none">
            {validImages.map((img, index) => (
              <TouchableOpacity
                key={`${img}-${index}`}
                onPress={() => goToImage(index)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Image ${index + 1}`}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <View
                  style={[
                    styles.dot,
                    index === activeIndex && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default ProductImageViewScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Painted under the SVG sweep so there is no black flash before it draws.
    backgroundColor: STUDIO.mid,
  },

  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  headerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 50,
  },

  header: {
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },

  headerTitle: {
    color: STUDIO.ink,
    fontSize: FontSize.md,
    fontWeight: '700',
    maxWidth: '90%',
  },

  headerCount: {
    color: STUDIO.inkSoft,
    fontSize: FontSize.sm,
    marginTop: 2,
    fontWeight: '500',
  },

  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    // A translucent scrim rather than solid white: it keeps the buttons legible
    // over whichever part of the sweep they sit on, without stamping hard discs
    // onto the backdrop.
    backgroundColor: STUDIO.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 40,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(43,37,35,0.22)',
  },

  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },

  mainSlider: {
    flex: 1,
  },

  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  imageCenterArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomWrapper: {
    width: SCREEN_WIDTH,
  },

  thumbSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    zIndex: 40,
    elevation: 40,
  },

  thumbList: {
    paddingHorizontal: 16,
  },

  thumbItem: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#111',
  },

  thumbItemActive: {
    borderColor: Colors.primary,
  },

  thumbImage: {
    width: '100%',
    height: '100%',
  },

  zoomHintWrap: {
    position: 'absolute',
    bottom: 106,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    zIndex: 30,
  },

  zoomHintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
});
