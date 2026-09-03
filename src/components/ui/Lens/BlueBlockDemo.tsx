import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [laserOn, pulse]);

  // Stop at the lens when blocked, otherwise carry on to the eye.
  const beamWidth = beam.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', blocked ? '46%' : '88%'],
  });

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>
      <AppText style={styles.heading}>{t('LensDemoTitle')}</AppText>

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

        <View style={[styles.emitter, laserOn && styles.emitterOn]} />

        <View
          style={[
            styles.lens,
            { borderColor: blocked ? '#3B82F6' : '#C9B7AC' },
            blocked && styles.lensActive,
          ]}
        />

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
    height: 92,
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
  lens: {
    position: 'absolute',
    left: LENS_LEFT,
    width: 46,
    height: 74,
    borderRadius: 23,
    borderWidth: 2,
    backgroundColor: 'rgba(219, 234, 254, 0.55)',
  },
  lensActive: { backgroundColor: 'rgba(59, 130, 246, 0.28)' },
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
