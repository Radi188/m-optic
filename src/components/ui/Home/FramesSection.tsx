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

const framesData = [
  {
    id: '1',
    name: 'Rectangle',
    image:
      'https://img.magnific.com/free-photo/sunglasses_1203-8700.jpg?t=st=1777538782~exp=1777542382~hmac=c322c5760f352923e41515f49f817a351b2f2f5eec220d06606efaa9328022ce&w=355',
  },
  {
    id: '2',
    name: 'Round',
    image:
      'https://img.magnific.com/free-photo/sunglasses_1203-8700.jpg?t=st=1777538782~exp=1777542382~hmac=c322c5760f352923e41515f49f817a351b2f2f5eec220d06606efaa9328022ce&w=255',
  },
  {
    id: '3',
    name: 'Aviator',
    image:
      'https://img.magnific.com/free-photo/sunglasses_1203-8700.jpg?t=st=1777538782~exp=1777542382~hmac=c322c5760f352923e41515f49f817a351b2f2f5eec220d06606efaa9328022ce&w=255',
  },
  {
    id: '4',
    name: 'Cat Eye',
    image:
      'https://img.magnific.com/free-photo/sunglasses_1203-8700.jpg?t=st=1777538782~exp=1777542382~hmac=c322c5760f352923e41515f49f817a351b2f2f5eec220d06606efaa9328022ce&w=255',
  },
  {
    id: '5',
    name: 'Oversized',
    image:
      'https://img.magnific.com/free-photo/sunglasses_1203-8700.jpg?t=st=1777538782~exp=1777542382~hmac=c322c5760f352923e41515f49f817a351b2f2f5eec220d06606efaa9328022ce&w=255',
  },
  {
    id: '6',
    name: 'Square',
    image:
      'https://img.magnific.com/free-photo/sunglasses_1203-8700.jpg?t=st=1777538782~exp=1777542382~hmac=c322c5760f352923e41515f49f817a351b2f2f5eec220d06606efaa9328022ce&w=255',
  },
];

const FramesSection = () => {
  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.name}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frame Types</Text>

      <FlatList
        data={framesData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default FramesSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden', // controls rounding for image + text
  },
  image: {
    width: '100%',
    height: 80,
    resizeMode: 'cover', // fills card
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
