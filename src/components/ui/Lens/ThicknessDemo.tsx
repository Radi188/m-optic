import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

/** Indices the shop stocks, cheapest/thickest first. */
const INDICES = [1.56, 1.61, 1.67, 1.74] as const;
type Index = (typeof INDICES)[number];

const BASELINE: Index = 1.56;
/** Edge width drawn for the baseline lens; every other index scales off it. */
const BASELINE_EDGE = 26;

/**
 * Edge thickness is inversely proportional to (n − 1), so a lens of index `n`
 * is (1 − (baseline−1)/(n−1)) thinner at the edge than the 1.56 baseline.
 * Deriving it keeps the figure honest rather than quoting a marketing number.
 */
export function thinnerBy(index: number, baseline: number = BASELINE): number {
  if (index <= baseline) return 0;
  return Math.round((1 - (baseline - 1) / (index - 1)) * 100);
}

const PROFILE_KEY: Record<Index, string> = {
  1.56: 'LensProfileStandard',
  1.61: 'LensProfileThin',
  1.67: 'LensProfileExtraThin',
  1.74: 'LensProfileUltraThin',
};

/** One lens seen edge-on: the face, with its edge thickness beside it. */
const LensProfile: React.FC<{
  edgeWidth: Animated.AnimatedInterpolation<number> | number;
  tint: string;
  edgeTint: string;
}> = ({ edgeWidth, tint, edgeTint }) => (
  <View style={styles.lensWrap}>
    <Animated.View
      style={[styles.lensEdge, { width: edgeWidth, backgroundColor: edgeTint }]}
    />
    <View style={[styles.lensFace, { backgroundColor: tint }]} />
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
  const target = BASELINE_EDGE * (1 - reduction / 100);

  const edge = useRef(new Animated.Value(BASELINE_EDGE)).current;

  useEffect(() => {
    Animated.spring(edge, {
      toValue: target,
      useNativeDriver: false,
      tension: 60,
      friction: 9,
    }).start();
  }, [target, edge]);

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>
      <AppText style={styles.heading}>{t('LensThicknessTitle')}</AppText>

      <View style={styles.compareRow}>
        <View style={styles.side}>
          <AppText style={styles.sideLabel}>
            {t('LensThicknessBaseline')}
          </AppText>
          <LensProfile
            edgeWidth={BASELINE_EDGE}
            tint="rgba(209, 233, 226, 0.9)"
            edgeTint="#8FA9B8"
          />
        </View>

        <AppText style={styles.vs}>{t('LensThicknessVs')}</AppText>

        <View style={styles.side}>
          <AppText style={styles.sideLabel}>
            {t('LensThicknessSelected', { index: index.toFixed(2) })}
          </AppText>
          <LensProfile
            edgeWidth={edge}
            tint="rgba(214, 234, 248, 0.95)"
            edgeTint="#B08F7C"
          />
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
  },
  heading: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    marginTop: 2,
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

  // The face sits over the edge band, so the band reads as the lens's rim.
  lensWrap: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lensEdge: {
    height: 78,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    marginLeft: -6,
  },
  lensFace: {
    width: 54,
    height: 96,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    marginRight: -6,
    zIndex: 1,
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
