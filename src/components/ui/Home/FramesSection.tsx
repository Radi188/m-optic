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
import { FrameShapeItem } from '../../../types/home';

type FramesSectionProps = {
  title?: string;
  frames: FrameShapeItem[];
  onPressFrame?: (frame: FrameShapeItem) => void;
};

const FramesSection: React.FC<FramesSectionProps> = ({
  title = 'Frame Types',
  frames,
  onPressFrame,
}) => {
  const renderItem = ({ item }: { item: FrameShapeItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPressFrame?.(item)}
    >
      {item.icon_url ? (
        <Image source={{ uri: item.icon_url }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>{item.name}</Text>
        </View>
      )}
      <Text style={styles.name}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        data={frames}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
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
    color: Colors.black,
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
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },

  imagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    textAlign: 'center',
  },

  name: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
    color: Colors.black,
  },
});
