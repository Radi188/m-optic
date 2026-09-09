import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { FontSize, Spacing } from '../../../theme';
import AppText from '../../AppText';

type ProfilePointSectionProps = {
  tierName?: string | null;
  points?: number | null;
  nextTier?: string | null;
  remainingPoints?: number | null;
  progress?: number | null;
};

type TierTheme = {
  /** Drives the medallion, the progress fill and the points figure. */
  accent: string;
  /** Page-level tint the block sits on — a wash, not a filled card. */
  tint: string;
  border: string;
};

/**
 * Tier palette.
 *
 * Colour is the only thing that changes between tiers now: the block is a
 * light wash of the tier's own hue rather than a saturated card carrying
 * membership-card artwork, so it sits inside a screen of other content
 * without competing with it.
 */
const TIER_THEMES: Record<string, TierTheme> = {
  bronze: { accent: '#A96A3C', tint: '#FBF2EA', border: '#F0DFCE' },
  silver: { accent: '#6E7378', tint: '#F3F4F6', border: '#E3E5E9' },
  gold: { accent: '#A9762A', tint: '#FBF3E3', border: '#EFE0C2' },
  platinum: { accent: '#55606E', tint: '#EFF2F6', border: '#DDE3EB' },
  diamond: { accent: '#2F7FA8', tint: '#EAF4FA', border: '#CFE5F0' },
};

const NEUTRAL_THEME: TierTheme = {
  accent: '#8A7468',
  tint: '#F7F2EE',
  border: '#EBE1D9',
};

const TIER_KEYS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;

/** "M Optic Silver", "silver", "Silver Member" → "silver". */
const tierKey = (tier?: string | null): string | null => {
  const value = (tier ?? '').toLowerCase();
  if (!value.trim()) return null;
  return TIER_KEYS.find(key => value.includes(key)) ?? null;
};

const ProfilePointSection: React.FC<ProfilePointSectionProps> = ({
  tierName,
  points,
  nextTier,
  remainingPoints,
  progress,
}) => {
  const { t, i18n } = useTranslation();

  const key = tierKey(tierName);
  const theme = key ? TIER_THEMES[key] : NEUTRAL_THEME;

  const getTranslatedTier = (tier?: string | null): string | null => {
    const value = tierKey(tier);
    if (!value) return tier?.trim() || null;
    // Falls back to the tier's own name for any tier the copy deck has not
    // been given a translation for yet.
    return t(
      `MembershipTiers.${value.charAt(0).toUpperCase()}${value.slice(1)}`,
      { defaultValue: tier?.trim() ?? '' },
    );
  };

  const translatedTier = getTranslatedTier(tierName);
  const translatedTierName = !translatedTier
    ? t('Member')
    : (tierName ?? '').toLowerCase().includes('m optic')
    ? t('MOpticTier', { tier: translatedTier })
    : translatedTier;

  const translatedNextTier = getTranslatedTier(nextTier);

  const totalPoints = points ?? 0;

  // No next tier means the member is already at the top — the bar is full and
  // there is no "n points away" line to show.
  const isTopTier = !translatedNextTier;
  const hasRemaining =
    !isTopTier && remainingPoints !== null && remainingPoints !== undefined;

  const safeProgress = isTopTier
    ? 100
    : Math.round(Math.min(Math.max(progress ?? 0, 0), 100));

  return (
    <View
      style={[
        styles.block,
        { backgroundColor: theme.tint, borderColor: theme.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.medallion, { backgroundColor: theme.accent }]}>
          <Ionicons name="diamond" size={15} color="#FFFFFF" />
        </View>

        <AppText style={styles.tierName} numberOfLines={1}>
          {translatedTierName}
        </AppText>

        {/* The figure is the point of the block, so it anchors the right edge
            rather than sitting in the middle of a stack. */}
        <AppText style={[styles.points, { color: theme.accent }]}>
          {totalPoints.toLocaleString(i18n.language)}
          <AppText style={styles.pointsUnit}> {t('Pts')}</AppText>
        </AppText>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${safeProgress}%`, backgroundColor: theme.accent },
          ]}
        />
      </View>

      <AppText style={styles.caption} numberOfLines={1}>
        {hasRemaining
          ? t('PointsAwayFromTier', {
              points: (remainingPoints as number).toLocaleString(
                i18n.language,
              ),
              tier: translatedNextTier,
            })
          : t('TopTierReached')}
      </AppText>
    </View>
  );
};

export default ProfilePointSection;

const styles = StyleSheet.create({
  // No shadow and a modest radius: this reads as a tinted band in the page,
  // not another raised card stacked among the rest.
  block: {
    marginTop: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  medallion: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tierName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#241812',
    letterSpacing: -0.2,
  },

  points: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  pointsUnit: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(36,24,18,0.08)',
    overflow: 'hidden',
    marginTop: 12,
  },

  fill: {
    height: '100%',
    borderRadius: 999,
  },

  caption: {
    marginTop: 7,
    fontSize: FontSize.xs,
    color: '#7A6A60',
  },
});
