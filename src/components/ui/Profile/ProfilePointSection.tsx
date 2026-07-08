import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing } from '../../../theme';
import AppText from '../../AppText';

type ProfilePointSectionProps = {
  tierName?: string;
  points?: number;
  nextTier?: string;
  remainingPoints?: number;
  progress?: number;
};

type TierTheme = {
  cardBackground: string;
  accentColor: string;
  progressTrack: string;
  cardImage: ImageSourcePropType;
};

const ProfilePointSection: React.FC<ProfilePointSectionProps> = ({
  tierName = 'M Optic Gold',
  points = 1250,
  nextTier = 'Platinum',
  remainingPoints = 750,
  progress = 70,
}) => {
  const { t, i18n } = useTranslation();

  const normalizedTier = tierName.toLowerCase();
  const normalizedNextTier = nextTier.toLowerCase();

  const isSilver = normalizedTier.includes('silver');

  const getTranslatedTier = (tier: string): string => {
    const normalizedValue = tier.toLowerCase();

    if (normalizedValue.includes('silver')) {
      return t('MembershipTiers.Silver');
    }

    if (normalizedValue.includes('gold')) {
      return t('MembershipTiers.Gold');
    }

    if (normalizedValue.includes('platinum')) {
      return t('MembershipTiers.Platinum');
    }

    return tier;
  };

  const translatedTierName = normalizedTier.includes('m optic')
    ? t('MOpticTier', {
        tier: getTranslatedTier(tierName),
      })
    : getTranslatedTier(tierName);

  const translatedNextTier = getTranslatedTier(normalizedNextTier);

  const tierTheme: TierTheme = isSilver
    ? {
        cardBackground: '#8C8F94',
        accentColor: '#F1F3F5',
        progressTrack: 'rgba(55,60,66,0.35)',
        cardImage: require('../../../assets/images/silver_member.png'),
      }
    : {
        cardBackground: '#8B5E3C',
        accentColor: '#F6D48B',
        progressTrack: 'rgba(50,30,18,0.35)',
        cardImage: require('../../../assets/images/gold_member.png'),
      };

  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tierTheme.cardBackground,
        },
      ]}
    >
      <View style={styles.leftContent}>
        <View style={styles.titleRow}>
          <Ionicons
            name="diamond-outline"
            size={23}
            color={tierTheme.accentColor}
          />

          <AppText style={styles.title}>{translatedTierName}</AppText>
        </View>

        <AppText style={styles.points}>
          {t('PointsAmount', {
            points: points.toLocaleString(i18n.language),
          })}
        </AppText>

        <AppText style={styles.description}>
          {t('PointsAwayFromTier', {
            points: remainingPoints.toLocaleString(i18n.language),
            tier: translatedNextTier,
          })}
        </AppText>

        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: tierTheme.progressTrack,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${safeProgress}%`,
                  backgroundColor: tierTheme.accentColor,
                },
              ]}
            />
          </View>

          <AppText style={styles.progressText}>{safeProgress}%</AppText>
        </View>
      </View>

      <Image
        source={tierTheme.cardImage}
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
    right: 8,
    top: 35,
    width: 150,
    height: 105,
    transform: [{ rotate: '2deg' }, { scale: 1.2 }],
  },
});
