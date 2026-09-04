import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

/** The tints the shop stocks. `dark` is the fully-activated outdoor colour. */
const TINTS = [
  { id: 'gray', labelKey: 'TintGray', dark: '#5A5A5F' },
  { id: 'brown', labelKey: 'TintBrown', dark: '#7A3B12' },
  { id: 'green', labelKey: 'TintGreen', dark: '#1F6B36' },
  { id: 'blue', labelKey: 'TintBlue', dark: '#2563EB' },
  { id: 'purple', labelKey: 'TintPurple', dark: '#8B5CF6' },
  { id: 'teal', labelKey: 'TintTeal', dark: '#12A46F' },
  { id: 'orange', labelKey: 'TintOrange', dark: '#C2620A' },
  { id: 'pink', labelKey: 'TintPink', dark: '#E0447A' },
] as const;

const TRACK_HEIGHT = 4;
const KNOB = 20;

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Photochromic light transition.
 *
 * Dragging from Indoor to Sunlight activates the lens: the tint is the chosen
 * colour at the slider's strength, so the customer sees what each colour looks
 * like part-way through a transition, not just at its two extremes.
 *
 * The slider is hand-rolled on PanResponder rather than pulling in a slider
 * dependency for one widget.
 */
const PhotochromicDemo: React.FC = () => {
  const { t } = useTranslation();

  const [tint, setTint] = useState<(typeof TINTS)[number]>(TINTS[0]);
  const [amount, setAmount] = useState(0); // 0 = indoor, 1 = full sun
  const trackWidth = useRef(0);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => update(e.nativeEvent.locationX),
        onPanResponderMove: (_e, g) => update(g.moveX - trackLeft.current),
      }),
    [],
  );

  const trackLeft = useRef(0);

  function update(x: number) {
    const w = trackWidth.current || 1;
    setAmount(Math.max(0, Math.min(1, x / w)));
  }

  const { r, g, b } = hexToRgb(tint.dark);
  // Never quite opaque: even a fully-activated lens is tinted glass, not paint.
  const lensColor = `rgba(${r}, ${g}, ${b}, ${(amount * 0.78).toFixed(3)})`;
  const percent = Math.round(amount * 100);

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>

      <View style={styles.stage}>
        <View style={styles.lensOuter}>
          <View style={[styles.lens, { backgroundColor: lensColor }]}>
            <AppText
              style={[styles.lensLabel, amount > 0.45 && styles.lensLabelOnDark]}
            >
              {amount < 0.15
                ? t('LensPhotoIndoor')
                : amount > 0.85
                ? t('LensPhotoSunlight')
                : t('LensPhotoAdapting')}
            </AppText>
          </View>
          <View style={styles.glint} pointerEvents="none" />
        </View>
      </View>

      <AppText style={styles.availableIn}>{t('LensPhotoAvailableIn')}</AppText>
      <View style={styles.swatchRow}>
        {TINTS.map(option => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setTint(option)}
            activeOpacity={0.8}
            style={[
              styles.swatch,
              { backgroundColor: option.dark },
              option.id === tint.id && styles.swatchActive,
            ]}
          />
        ))}
      </View>
      <AppText style={styles.tintName}>{t(tint.labelKey)}</AppText>

      <View style={styles.sliderLabels}>
        <AppText style={styles.sliderEnd}>{t('LensPhotoIndoor')}</AppText>
        <AppText style={styles.sliderValue}>{`${percent}%`}</AppText>
        <AppText style={styles.sliderEnd}>{t('LensPhotoSunlight')}</AppText>
      </View>

      <View
        style={styles.trackHit}
        onLayout={e => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        onTouchStart={() => {}}
        {...pan.panHandlers}
      >
        <View
          style={styles.track}
          onLayout={e => {
            trackLeft.current = e.nativeEvent.layout.x;
          }}
        />
        <View style={[styles.trackFill, { width: `${percent}%` }]} />
        <View
          style={[
            styles.knob,
            { left: `${percent}%`, backgroundColor: tint.dark },
          ]}
        />
      </View>
    </View>
  );
};

export default PhotochromicDemo;

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

  stage: { alignItems: 'center', marginBottom: Spacing.lg },
  lensOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#EFF3F6',
    borderWidth: 1,
    borderColor: '#DCE3E8',
    overflow: 'hidden',
  },
  lens: {
    flex: 1,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  lensLabelOnDark: { color: Colors.white },
  glint: {
    position: 'absolute',
    top: 14,
    left: 22,
    width: 46,
    height: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-24deg' }],
  },

  availableIn: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: Colors.gray600 },
  tintName: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sliderEnd: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    fontWeight: '700',
  },
  trackHit: { height: KNOB + 12, justifyContent: 'center' },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: Colors.gray200,
  },
  trackFill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: Colors.gray300,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    marginLeft: -KNOB / 2,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
