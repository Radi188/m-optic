import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';
import RealisticLensIcon from './RealisticLensIcon';

type Coating = 'uv400' | 'blueBlock';

/**
 * Blue Block laser simulation.
 *
 * Laser → lens → eye. With the Blue Block coating the beam stops at the lens
 * and the eye is shielded; with UV400 the beam carries through, which is the
 * point the widget exists to make. The beam is a width animation so it reads
 * as travelling rather than snapping on.
 */
const BlueBlockDemo: React.FC = () => {
  const { t } = useTranslation();

  const [laserOn, setLaserOn] = useState(true);
  const [coating, setCoating] = useState<Coating>('blueBlock');

  const blocked = coating === 'blueBlock';
  const beam = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(beam, {
      toValue: laserOn ? 1 : 0,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [laserOn, beam]);

  useEffect(() => {
    if (!laserOn) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    // The JS driver, not the native one: this value feeds the same style node
    // as the width animation below, and the native animated module rejects
    // `width` outright — a mixed node logs "Style property 'width' is not
    // supported by native animated module" on every toggle.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [laserOn, pulse]);

  // The beam always travels as far as the lens; what happens inside the glass
  // — passing through or stopping at the front surface — is drawn by the lens
  // itself, and only a lens that lets the light through gets an exit beam.
  const beamWidth = beam.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', BEAM_TO_LENS],
  });
  const exitWidth = beam.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', BEAM_TO_EYE],
  });

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>

      <View style={styles.stageLabels}>
        <AppText style={styles.stageLabel}>{t('LensDemoLaser')}</AppText>
        <AppText style={styles.stageLabel}>{t('LensDemoLens')}</AppText>
        <AppText style={styles.stageLabel}>{t('LensDemoEye')}</AppText>
      </View>

      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.beam,
            {
              width: beamWidth,
              backgroundColor: blocked ? '#3B82F6' : '#F0426E',
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.55, 1],
              }),
            },
          ]}
        />

        {!blocked && (
          <Animated.View
            style={[
              styles.exitBeam,
              {
                width: exitWidth,
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.55, 1],
                }),
              },
            ]}
          />
        )}

        <View style={[styles.emitter, laserOn && styles.emitterOn]} />

        <View style={styles.lensSlot} pointerEvents="none">
          <RealisticLensIcon
            thickness={100}
            isActive={blocked}
            laserOn={laserOn}
            lensType={blocked ? 'blueblock' : 'standard'}
            width={LENS_ICON_WIDTH}
            height={LENS_ICON_HEIGHT}
          />
        </View>

        <View
          style={[
            styles.eye,
            {
              borderColor:
                laserOn && !blocked ? Colors.error : Colors.success,
            },
          ]}
        >
          <Ionicons
            name={laserOn && !blocked ? 'alert' : 'checkmark'}
            size={14}
            color={laserOn && !blocked ? Colors.error : Colors.success}
          />
        </View>
      </View>

      <AppText style={styles.verdict}>
        {!laserOn
          ? t('LensDemoIdle')
          : blocked
          ? t('LensDemoBlocked')
          : t('LensDemoPassing')}
      </AppText>

      <TouchableOpacity
        style={styles.laserBtn}
        activeOpacity={0.85}
        onPress={() => setLaserOn(v => !v)}
      >
        <AppText style={styles.laserBtnText}>
          {laserOn ? t('LensDemoLaserOn') : t('LensDemoLaserOff')}
        </AppText>
      </TouchableOpacity>

      <View style={styles.segment}>
        {(['uv400', 'blueBlock'] as Coating[]).map(key => {
          const active = coating === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              activeOpacity={0.85}
              onPress={() => setCoating(key)}
            >
              <AppText
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}
              >
                {key === 'uv400' ? t('LensDemoUv400') : t('LensDemoBlueBlock')}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BlueBlockDemo;

const LENS_LEFT = '46%';
/** How far the beam runs before it meets the front face of the lens. */
const BEAM_TO_LENS = '44%';
/** …and from the back face on to the eye, when the coating lets it through. */
const BEAM_TO_EYE = '30%';

// The artwork is letterboxed inside its viewBox: the lens face covers the
// middle ~55% of the rendered width and starts ~17.5% in, so the icon is drawn
// wider than the face and pulled left to line the face up with LENS_LEFT.
const LENS_ICON_WIDTH = 84;
const LENS_ICON_HEIGHT = 116;
const LENS_FACE_INSET = -15;

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

  stageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stageLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },

  stage: {
    height: 120,
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  beam: {
    position: 'absolute',
    left: 10,
    height: 3,
    borderRadius: 2,
  },
  emitter: {
    position: 'absolute',
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gray300,
  },
  emitterOn: { backgroundColor: '#1E3A8A' },
  // Picks up where the lens face ends, so the light reads as continuing on to
  // the eye rather than restarting there.
  exitBeam: {
    position: 'absolute',
    left: LENS_LEFT,
    marginLeft: 46,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F0426E',
  },
  lensSlot: {
    position: 'absolute',
    left: LENS_LEFT,
    marginLeft: LENS_FACE_INSET,
  },
  eye: {
    position: 'absolute',
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },

  verdict: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 19,
    marginBottom: Spacing.md,
    minHeight: 38,
  },

  laserBtn: {
    backgroundColor: '#4A2E22',
    borderRadius: BorderRadius.sm,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  laserBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  segmentBtnActive: { backgroundColor: '#4A2E22' },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray600,
  },
  segmentTextActive: { color: Colors.white },
});
