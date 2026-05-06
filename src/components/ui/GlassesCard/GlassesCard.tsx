import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { GlassItem } from '../../../types/navigation';
import FaceIdIcon from '../../../assets/svg/face-id.svg';
import { Colors } from '../../../theme';

type Props = {
  item: GlassItem;
  onPress: () => void;
  onTryOn: () => void;
};

const GlassCard: React.FC<Props> = ({ item, onPress, onTryOn }) => {
  // State to track whether the heart is filled or not
  const [isLiked, setIsLiked] = useState(false);

  // Toggle the heart state when the icon is clicked
  const toggleHeart = () => {
    setIsLiked(!isLiked);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.image }} style={styles.image} />

        {/* Heart Icon */}
        <TouchableOpacity style={styles.heartIcon} onPress={toggleHeart}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={Colors.gray700}
          />
        </TouchableOpacity>

        {/* Try-On Button */}
        <TouchableOpacity style={styles.tryOnIcon} onPress={onTryOn}>
          <FaceIdIcon width={18} height={18} fill={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.brand}>{item.brand}</Text>

        <Text style={styles.price}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default GlassCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6, // spacing between columns
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
  },

  imageWrap: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },

  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  content: {
    padding: 12,
  },

  brand: {
    fontSize: 12,
    color: '#888',
  },

  tryOnIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  heartIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  name: {
    fontSize: 15,
    fontWeight: '600',
    marginVertical: 4,
  },

  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b09080',
    marginVertical: 4,
  },

  tryOnBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(176,144,128,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  tryOnText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
});
