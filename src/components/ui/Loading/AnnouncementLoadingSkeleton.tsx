import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { Spacing } from '../../../theme';

const AnnouncementSkeleton: React.FC = () => {
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
    outputRange: ['#CFCBC7', '#E0DFDD'],
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {[...Array(4)].map((_, index) => (
        <Animated.View key={index} style={[styles.card, { backgroundColor }]}>
          <Animated.View style={[styles.bannerSkeleton, { backgroundColor }]} />
          <Animated.View style={[styles.titleSkeleton, { backgroundColor }]} />
          <Animated.View
            style={[styles.contentSkeleton, { backgroundColor }]}
          />
          <Animated.View style={[styles.linkSkeleton, { backgroundColor }]} />
        </Animated.View>
      ))}
    </ScrollView>
  );
};

export default AnnouncementSkeleton;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  bannerSkeleton: {
    width: '100%',
    height: 30,
    borderRadius: 12,
    marginBottom: 12,
  },
  titleSkeleton: {
    width: '60%',
    height: 22,
    borderRadius: 8,
    marginBottom: 6,
  },
  contentSkeleton: {
    width: '90%',
    height: 16,
    borderRadius: 8,
    marginBottom: 6,
  },
  linkSkeleton: {
    width: '30%',
    height: 16,
    borderRadius: 8,
    marginTop: 6,
  },
});
