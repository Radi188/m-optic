import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type ProfilePointSectionProps = {
  tierName?: string;
  points?: number;
  nextTier?: string;
  remainingPoints?: number;
  progress?: number;
};

const ProfilePointSection: React.FC<ProfilePointSectionProps> = ({
  tierName = 'M Optic Gold',
  points = 1250,
  nextTier = 'Platinum',
  remainingPoints = 750,
  progress = 70,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <View style={styles.titleRow}>
          <Ionicons name="diamond-outline" size={23} color="#F6D48B" />
          <Text style={styles.title}>{tierName}</Text>
        </View>

        <Text style={styles.points}>{points.toLocaleString()} Points</Text>

        <Text style={styles.description}>
          You’re {remainingPoints} points away from {nextTier}
        </Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>

          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>

      <Image
        source={require('../../../assets/images/member-card.png')}
        style={styles.goldCardImage}
        resizeMode="contain"
      />
    </View>
  );
};

export default ProfilePointSection;

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 150,
    backgroundColor: '#8B5E3C',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },

  leftContent: {
    flex: 1,
    paddingRight: Spacing.sm,

    maxWidth: 220,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  title: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.white,
  },

  points: {
    marginTop: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.white,
  },

  description: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  progressRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(50,30,18,0.35)',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F6D48B',
  },

  progressText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.white,
  },

  goldCardImage: {
    position: 'absolute',
    right: 12,
    top: 35,
    width: 150,
    height: 105,
    transform: [{ rotate: '8deg' }, { scale: 1.2 }],
  },
});
