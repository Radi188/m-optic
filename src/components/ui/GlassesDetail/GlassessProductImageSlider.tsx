import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GlassessProductImageSliderProps = {
  images: string[];
  onPressArTryOn?: () => void;
  onPress3DModel?: () => void;
};

const GlassessProductImageSlider: React.FC<GlassessProductImageSliderProps> = ({
  images,
  onPressArTryOn,
  onPress3DModel,
}) => {
  const flatListRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const validImages = useMemo(
    () => images?.filter(item => typeof item === 'string' && item.trim()) || [],
    [images],
  );

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    setActiveIndex(newIndex);
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setActiveIndex(index);
  };

  const renderItem = ({ item }: { item: string }) => {
    return (
      <View style={styles.slide}>
        <Image
          source={{ uri: item }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  };

  if (!validImages.length) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>No image available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={validImages}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {validImages.length > 1 && (
        <View style={styles.pagination}>
          {validImages.map((_, index) => {
            const isActive = index === activeIndex;

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => handleDotPress(index)}
                style={[styles.dot, isActive && styles.activeDot]}
              />
            );
          })}
        </View>
      )}

      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.9}
          onPress={onPressArTryOn}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="scan-outline" size={16} color={Colors.black} />
          </View>
          <Text style={styles.floatingButtonText}>AR Try On</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.9}
          onPress={onPress3DModel}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="cube-outline" size={16} color={Colors.black} />
          </View>
          <Text style={styles.floatingButtonText}>3D Model</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GlassessProductImageSlider;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 320,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  emptyText: {
    fontSize: 14,
    color: '#777777',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#B09080',
  },
  floatingActions: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    gap: 8,
    flexDirection: 'row',
  },

  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray400,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  floatingButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.black,
  },
});
