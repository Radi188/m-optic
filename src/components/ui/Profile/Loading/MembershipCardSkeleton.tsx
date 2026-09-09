import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Placeholder for MembershipCard.
 *
 * Kept on the card's own dark surface rather than the grey used elsewhere, so
 * the block does not change colour and height the moment the profile lands.
 */
const MembershipCardSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.26)'],
  });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Animated.View style={[styles.brand, { backgroundColor }]} />
        <Animated.View style={[styles.pill, { backgroundColor }]} />
      </View>

      <View style={styles.identity}>
        <Animated.View style={[styles.nameLabel, { backgroundColor }]} />
        <Animated.View style={[styles.name, { backgroundColor }]} />
      </View>

      <View style={styles.footRow}>
        <View>
          <Animated.View style={[styles.footLabel, { backgroundColor }]} />
          <Animated.View style={[styles.footValue, { backgroundColor }]} />
        </View>
        <View style={styles.footRight}>
          <Animated.View style={[styles.footLabel, { backgroundColor }]} />
          <Animated.View style={[styles.footValue, { backgroundColor }]} />
        </View>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: '35%', backgroundColor }]}
        />
      </View>

      <Animated.View style={[styles.caption, { backgroundColor }]} />
    </View>
  );
};

export default MembershipCardSkeleton;

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#4A3B33',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { width: 92, height: 13, borderRadius: 6 },
  pill: { width: 78, height: 24, borderRadius: 999 },

  identity: { marginTop: 22 },
  nameLabel: { width: 54, height: 9, borderRadius: 4 },
  name: { marginTop: 6, width: '62%', height: 21, borderRadius: 8 },

  footRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footRight: { alignItems: 'flex-end' },
  footLabel: { width: 62, height: 9, borderRadius: 4 },
  footValue: { marginTop: 6, width: 78, height: 15, borderRadius: 6 },

  track: {
    marginTop: 16,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },

  caption: { marginTop: 10, width: '55%', height: 11, borderRadius: 5 },
});
