import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, FontSize, Spacing } from '../../../theme';
import { BrandResponse } from '../../../types/brand';

type BrandSectionProps = {
  title?: string;
  brands: BrandResponse[];
  onPressBrand?: (brand: BrandResponse) => void;
};

const BrandSection: React.FC<BrandSectionProps> = ({
  title = 'Brands',
  brands,
  onPressBrand,
}) => {
  const renderItem = ({ item }: { item: BrandResponse }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPressBrand?.(item)}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.logo} />
      ) : (
        <Text style={styles.brandText}>{item.name}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        data={brands}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

export default BrandSection;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },

  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.black,
  },

  card: {
    width: 120,
    height: 75,
    marginRight: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 10,
  },

  logo: {
    width: '85%',
    height: '85%',
    resizeMode: 'contain',
  },

  brandText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.black,
    textAlign: 'center',
  },
});
