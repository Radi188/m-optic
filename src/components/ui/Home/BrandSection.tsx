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

export const brandsData = [
  {
    id: '1',
    name: 'Ray-Ban',
    logo: 'https://i.pinimg.com/736x/c9/ff/3e/c9ff3e2e4aa3d922f994d8382c2b43ca.jpg',
  },
  {
    id: '2',
    name: 'Oakley',
    logo: 'https://i.pinimg.com/736x/c4/60/5c/c4605c2b2ddf5ce3d7e561fc459c7f2f.jpg',
  },
  {
    id: '3',
    name: 'Gucci',
    logo: 'https://i.pinimg.com/1200x/c4/19/06/c419067c4393752980ee0f538a5ddede.jpg',
  },
  {
    id: '4',
    name: 'Prada',
    logo: 'https://i.pinimg.com/736x/b8/02/8f/b8028fd705c8597a23565f520665b3d5.jpg',
  },
  {
    id: '5',
    name: 'Dior',
    logo: 'https://i.pinimg.com/736x/db/e2/7b/dbe27bf72a6f55212be196aff80b40b8.jpg',
  },
];

const BrandSection = () => {
  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.logo }} style={styles.logo} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brands</Text>

      <FlatList
        data={brandsData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
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
  },

  card: {
    width: 120,
    height: 75,
    marginRight: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1, // 👈 ADD BORDER
    borderColor: Colors.gray100, // 👈 soft gray border
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // 👈 keeps rounded corners clean
  },

  logo: {
    width: '85%', // 👈 increase size
    height: '85%',
    resizeMode: 'contain', // 👈 keep logo clean (important for brands)
  },
});
