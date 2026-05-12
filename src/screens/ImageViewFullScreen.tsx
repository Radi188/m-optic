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
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMB_SIZE = 70;
const HEADER_CONTENT_HEIGHT = 72;
const THUMB_BAR_HEIGHT = 110;

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
  const zoomAreaHeight = SCREEN_HEIGHT - headerHeight - THUMB_BAR_HEIGHT;

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
            paddingBottom: THUMB_BAR_HEIGHT,
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
      <StatusBar barStyle="light-content" backgroundColor="#000" />
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
              <Ionicons name="close-outline" size={26} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {productName}
              </Text>
              <Text style={styles.headerCount}>
                {validImages.length
                  ? `${activeIndex + 1}/${validImages.length}`
                  : '0/0'}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.85}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.85}
                onPress={() => console.log('wishlist')}
              >
                <Ionicons name="heart-outline" size={20} color="#FFF" />
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
      </SafeAreaView>
    </View>
  );
};

export default ProductImageViewScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: '700',
    maxWidth: '90%',
  },

  headerCount: {
    color: 'rgba(255,255,255,0.75)',
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
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
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
