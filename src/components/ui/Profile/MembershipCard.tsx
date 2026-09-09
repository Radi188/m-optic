import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { FontSize } from '../../../theme';
import AppText from '../../AppText';

type MembershipCardProps = {
  /** The cardholder — the customer's own name, as the shop has it. */
  name?: string | null;
  tierName?: string | null;
  /** Customer id, printed as the membership number. */
  memberId?: number | string | null;
  points?: number | null;
  nextTier?: string | null;
  remainingPoints?: number | null;
  progress?: number | null;
  style?: StyleProp<ViewStyle>;
};

type TierTheme = {
  surface: string;
  /** Second stop of the diagonal sheen laid over the surface. */
  sheen: string;
  accent: string;
  /** Faint emblem in the bottom-right corner. */
  art: ImageSourcePropType | null;
};

const TIER_THEMES: Record<string, TierTheme> = {
  bronze: {
    surface: '#7A4A2B',
    sheen: 'rgba(255,214,170,0.20)',
    accent: '#F0C9A4',
  },
  silver: {
    surface: '#6B7076',
    sheen: 'rgba(255,255,255,0.22)',
    accent: '#F1F3F5',
  },
  gold: {
    surface: '#8B5E1E',
    sheen: 'rgba(255,226,150,0.22)',
    accent: '#F6D48B',
  },
  platinum: {
    surface: '#434B57',
    sheen: 'rgba(230,240,255,0.20)',
    accent: '#E7ECF3',
  },
  diamond: {
    surface: '#215A79',
    sheen: 'rgba(190,232,255,0.22)',
    accent: '#CDE9F7',
  },
};

const NEUTRAL_THEME: TierTheme = {
  surface: '#4A3B33',
  sheen: 'rgba(255,255,255,0.14)',
  accent: '#EADFD7',
  art: null,
};

const TIER_KEYS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;

const tierKey = (tier?: string | null): string | null => {
  const value = (tier ?? '').toLowerCase();
  if (!value.trim()) return null;
  return TIER_KEYS.find(key => value.includes(key)) ?? null;
};

/** "5" → "MO-0005". A bare row id does not read as a membership number. */
const formatMemberId = (id?: number | string | null): string | null => {
  if (id === null || id === undefined || id === '') return null;
  const digits = String(id).replace(/\D/g, '');
  return `MO-${(digits || String(id)).padStart(4, '0')}`;
};

/**
 * The customer's membership card, as they would expect to be handed one in
 * store: their name, their tier, their number.
 *
 * This is the identity object on the profile tab. Progress toward the next
 * tier rides along the bottom edge so the card answers "what am I, and how
 * far to the next one" without a second block underneath it.
 */
const MembershipCard: React.FC<MembershipCardProps> = ({
  name,
  tierName,
  memberId,
  points,
  nextTier,
  remainingPoints,
  progress,
  style,
}) => {
  const { t, i18n } = useTranslation();

  const key = tierKey(tierName);
  const theme = key ? TIER_THEMES[key] : NEUTRAL_THEME;

  const getTranslatedTier = (tier?: string | null): string | null => {
    const value = tierKey(tier);
    if (!value) return tier?.trim() || null;
    return t(
      `MembershipTiers.${value.charAt(0).toUpperCase()}${value.slice(1)}`,
      { defaultValue: tier?.trim() ?? '' },
    );
  };

  const translatedTier = getTranslatedTier(tierName) ?? t('Member');
  const translatedNextTier = getTranslatedTier(nextTier);

  const isTopTier = !translatedNextTier;
  const hasRemaining =
    !isTopTier && remainingPoints !== null && remainingPoints !== undefined;

  const safeProgress = isTopTier
    ? 100
    : Math.round(Math.min(Math.max(progress ?? 0, 0), 100));

  const number = formatMemberId(memberId);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, style]}>
      {/* Decoration sits behind everything and never intercepts a tap. */}
      <View pointerEvents="none" style={styles.decoration}>
        <View style={[styles.sheen, { backgroundColor: theme.sheen }]} />
        {!!theme.art && (
          <Image source={theme.art} style={styles.art} resizeMode="contain" />
        )}
      </View>

      <View style={styles.headerRow}>
        <AppText style={styles.brand}>M OPTIC</AppText>

        <View style={styles.tierPill}>
          <Ionicons name="diamond" size={11} color={theme.accent} />
          <AppText style={[styles.tierPillText, { color: theme.accent }]}>
            {translatedTier}
          </AppText>
        </View>
      </View>

      <View style={styles.identity}>
        <AppText style={styles.nameLabel}>{t('Member')}</AppText>
        <AppText style={styles.name} numberOfLines={1}>
          {name?.trim() || '—'}
        </AppText>
      </View>

      <View style={styles.footRow}>
        <View style={styles.footBlock}>
          <AppText style={styles.footLabel}>{t('MemberNumber')}</AppText>
          <AppText style={styles.footValue}>{number ?? '—'}</AppText>
        </View>

        <View style={[styles.footBlock, styles.footBlockRight]}>
          <AppText style={styles.footLabel}>{t('Points')}</AppText>
          <AppText style={[styles.footValue, { color: theme.accent }]}>
            {(points ?? 0).toLocaleString(i18n.language)}
          </AppText>
        </View>
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
              points: (remainingPoints as number).toLocaleString(i18n.language),
              tier: translatedNextTier,
            })
          : t('TopTierReached')}
      </AppText>
    </View>
  );
};

export default MembershipCard;

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#2A160A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  decoration: { ...StyleSheet.absoluteFillObject },

  // A wide, rotated band reading corner to corner — the light-catch you get
  // on a real laminated card.
  sheen: {
    position: 'absolute',
    top: -70,
    right: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    transform: [{ rotate: '18deg' }],
  },

  art: {
    position: 'absolute',
    right: -14,
    bottom: -10,
    width: 130,
    height: 91,
    opacity: 0.28,
    transform: [{ rotate: '-6deg' }],
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 2.5,
  },

  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },

  tierPillText: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  identity: { marginTop: 22 },

  nameLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  name: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  footRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },

  footBlock: { flexShrink: 1 },
  footBlockRight: { alignItems: 'flex-end' },

  footLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  footValue: {
    marginTop: 3,
    fontSize: FontSize.md,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  track: {
    marginTop: 16,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },

  fill: { height: '100%', borderRadius: 999 },

  caption: {
    marginTop: 8,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.78)',
  },
});
