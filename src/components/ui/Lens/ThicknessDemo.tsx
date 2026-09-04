import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';
import RealisticLensIcon from './RealisticLensIcon';

/** Indices the shop stocks, cheapest/thickest first. */
const INDICES = [1.56, 1.61, 1.67, 1.74] as const;
type Index = (typeof INDICES)[number];

const BASELINE: Index = 1.56;
/** Thickness the baseline lens is drawn at; every other index scales off it. */
const BASELINE_THICKNESS = 100;

/** Rendered lens size. The artwork's viewBox is 80×110, so this keeps ratio. */
const LENS_WIDTH = 88;
const LENS_HEIGHT = 121;

/**
 * How much thinner each stocked index is at the edge than the 1.56 baseline.
 *
 * These are the shop's own measured figures. The purely optical derivation —
 * edge thickness goes as 1/(n−1), giving 8/16/24% — ignores the flatter base
 * curves and smaller minimum centre thickness the high-index lenses are
 * actually cut with, and so understates the difference the customer sees.
 */
const THINNER_BY: Record<Index, number> = {
  1.56: 0,
  1.61: 26,
  1.67: 48,
  1.74: 66,
};

export function thinnerBy(index: number, baseline: number = BASELINE): number {
  if (index <= baseline) return 0;
  const published = THINNER_BY[index as Index];
  if (published !== undefined) return published;
  // An index we don't stock: fall back to the optical derivation.
  return Math.round((1 - (baseline - 1) / (index - 1)) * 100);
}

/** Even the thinnest lens keeps an edge — it never tapers to nothing. */
const MIN_THICKNESS = 18;

/**
 * The drawing is to scale: 26% thinner is drawn 26% thinner. The published
 * spread is wide enough that no exaggeration is needed to see each step.
 */
export function visualThickness(reduction: number): number {
  return Math.max(MIN_THICKNESS, BASELINE_THICKNESS - reduction);
}

const PROFILE_KEY: Record<Index, string> = {
  1.56: 'LensProfileStandard',
  1.61: 'LensProfileThin',
  1.67: 'LensProfileExtraThin',
  1.74: 'LensProfileUltraThin',
};

/** One lens, drawn as glass with its edge depth showing behind the face. */
const LensProfile: React.FC<{ thickness: number; isActive: boolean }> = ({
  thickness,
  isActive,
}) => (
  <View style={styles.lensWrap}>
    <RealisticLensIcon
      thickness={thickness}
      isActive={isActive}
      width={LENS_WIDTH}
      height={LENS_HEIGHT}
    />
  </View>
);

/**
 * Lens index thickness comparison.
 *
 * Shows the 1.56 baseline beside the chosen index so the difference is visible
 * rather than described — the reason someone pays more for a high-index lens.
 */
const ThicknessDemo: React.FC = () => {
  const { t } = useTranslation();
  const [index, setIndex] = useState<Index>(BASELINE);

  const reduction = thinnerBy(index);
  const target = visualThickness(reduction);

  const edge = useRef(new Animated.Value(BASELINE_THICKNESS)).current;
  // The lens takes a plain number, not an animated value — SVG geometry can't
  // be driven by the Animated style pipeline — so the spring is mirrored into
  // state, rounded to whole percent to skip frames that would redraw the same
  // shape.
  const [thickness, setThickness] = useState(BASELINE_THICKNESS);

  useEffect(() => {
    const id = edge.addListener(({ value }) => setThickness(Math.round(value)));
    Animated.spring(edge, {
      toValue: target,
      useNativeDriver: false,
      tension: 60,
      friction: 9,
    }).start();
    return () => edge.removeListener(id);
  }, [target, edge]);

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>

      <View style={styles.compareRow}>
        <View style={styles.side}>
          <AppText style={styles.sideLabel}>
            {t('LensThicknessBaseline')}
          </AppText>
          <LensProfile thickness={BASELINE_THICKNESS} isActive={false} />
        </View>

        <AppText style={styles.vs}>{t('LensThicknessVs')}</AppText>

        <View style={styles.side}>
          <AppText style={styles.sideLabel}>
            {t('LensThicknessSelected', { index: index.toFixed(2) })}
          </AppText>
          <LensProfile thickness={thickness} isActive />
        </View>
      </View>

      <AppText style={styles.result}>
        {t('LensThicknessResult', { percent: reduction })}
      </AppText>
      <AppText style={styles.profile}>{t(PROFILE_KEY[index])}</AppText>

      <View style={styles.segment}>
        {INDICES.map(value => {
          const active = value === index;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              activeOpacity={0.85}
              onPress={() => setIndex(value)}
            >
              <AppText
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {value.toFixed(2)}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default ThicknessDemo;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
  },
  kicker: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },

  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  side: { flex: 1, alignItems: 'center', gap: Spacing.sm },
  sideLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
    textAlign: 'center',
  },
  vs: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.gray300,
  },

  lensWrap: {
    height: LENS_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  result: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.black,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  profile: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  segment: { flexDirection: 'row', gap: Spacing.sm },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  segmentBtnActive: { backgroundColor: '#4A2E22', borderColor: '#4A2E22' },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray600,
  },
  segmentTextActive: { color: Colors.white },
});
