import React, { useEffect, useId, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from 'react-native-svg';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

type Phase = 'idle' | 'dropping' | 'done';

/** Lens artwork, in px: a lens lying flat, seen from slightly above. */
const LENS_W = 100;
const LENS_H = 44;
/** Top face — the surface the ball lands on. */
const FACE = { cx: 50, cy: 14, rx: 46, ry: 12 };

/** Edge depth in px. AirWear's polycarbonate is drawn thinner than resin. */
const EDGE_STANDARD = 10;
const EDGE_AIRWEAR = 6;

const STAGE_H = 120;
const BALL = 22;
/** Where the ball rests on the face: its bottom just into the top ellipse. */
const LANDED = STAGE_H - LENS_H + FACE.cy - BALL + 4;

/** Fracture lines running out from the point of impact. */
const CRACKS = [
  '50,14 38,9 30,11 19,7',
  '50,14 62,18 73,16 85,20',
  '50,14 55,6 61,4',
  '50,14 44,21 35,23',
  '50,14 67,9 79,7',
  '50,14 47,5',
];

/**
 * A lens lying flat: the top face over an edge band whose depth is the
 * lens's thickness. With `cracked`, fracture lines fade in over the face.
 */
const FlatLens: React.FC<{
  edge: number;
  tone: 'standard' | 'airwear';
  crack?: Animated.Value;
}> = ({ edge, tone, crack }) => {
  // Gradient ids are document-global in SVG; two lenses share one screen.
  const uid = useId().replace(/:/g, '');
  const faceId = `impact-face-${uid}`;
  const clipId = `impact-clip-${uid}`;
  const { cx, cy, rx, ry } = FACE;
  const left = cx - rx;
  const right = cx + rx;

  const edgeColor = tone === 'airwear' ? '#A07C65' : '#94A3B8';
  const edgeStroke = tone === 'airwear' ? '#4A3525' : '#475569';

  return (
    <View style={styles.lens}>
      <Svg width={LENS_W} height={LENS_H} viewBox={`0 0 ${LENS_W} ${LENS_H}`}>
        <Defs>
          <LinearGradient id={faceId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="45%" stopColor="#E0F2FE" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        {/* Edge band: down the left side, along the front of the bottom face,
            back up the right side and along the front of the top face. */}
        <Path
          d={`M ${left} ${cy} L ${left} ${cy + edge} A ${rx} ${ry} 0 0 0 ${right} ${
            cy + edge
          } L ${right} ${cy} A ${rx} ${ry} 0 0 1 ${left} ${cy} Z`}
          fill={edgeColor}
          fillOpacity={0.85}
          stroke={edgeStroke}
          strokeWidth={0.6}
        />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={`url(#${faceId})`}
          stroke="#FFFFFF"
          strokeWidth={1.2}
        />
        {/* Specular streak. */}
        <Path
          d={`M ${cx - 30} ${cy - 5} Q ${cx - 12} ${cy - 10} ${cx + 8} ${cy - 9}`}
          stroke="#FFFFFF"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeOpacity={0.9}
          fill="none"
        />
      </Svg>

      {crack && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: crack }]}
          pointerEvents="none"
        >
          <Svg width={LENS_W} height={LENS_H} viewBox={`0 0 ${LENS_W} ${LENS_H}`}>
            <Defs>
              <ClipPath id={clipId}>
                <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#${clipId})`}>
              {CRACKS.map(points => (
                <Polyline
                  key={points}
                  points={points}
                  stroke="#1F2937"
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </G>
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

const Ball: React.FC<{ y: Animated.Value }> = ({ y }) => (
  <Animated.View style={[styles.ball, { transform: [{ translateY: y }] }]}>
    <View style={styles.ballShine} />
  </Animated.View>
);

const fall = (v: Animated.Value, to: number, duration: number) =>
  Animated.timing(v, {
    toValue: to,
    duration,
    easing: Easing.in(Easing.quad),
    useNativeDriver: true,
  });

const rise = (v: Animated.Value, to: number, duration: number) =>
  Animated.timing(v, {
    toValue: to,
    duration,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  });

/**
 * Impact test — the AirWear tab's demo.
 *
 * The same ball lands on a standard resin lens and on AirWear's polycarbonate
 * at once: the resin lens cracks, the polycarbonate one throws the ball back
 * and stays whole. Impact resistance is the reason to choose AirWear, so it is
 * shown rather than listed.
 */
const ImpactDemo: React.FC = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');

  const standardBall = useRef(new Animated.Value(0)).current;
  const airwearBall = useRef(new Animated.Value(0)).current;
  const crack = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => () => running.current?.stop(), []);

  const drop = () => {
    running.current?.stop();
    standardBall.setValue(0);
    airwearBall.setValue(0);
    crack.setValue(0);
    ripple.setValue(0);
    setPhase('dropping');

    const standard = Animated.sequence([
      fall(standardBall, LANDED, 420),
      Animated.timing(crack, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]);

    // Two shrinking bounces, then rest; the ring marks the energy spreading
    // through the lens instead of breaking it.
    const airwear = Animated.sequence([
      fall(airwearBall, LANDED, 420),
      Animated.parallel([
        Animated.timing(ripple, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          rise(airwearBall, LANDED - 46, 260),
          fall(airwearBall, LANDED, 260),
          rise(airwearBall, LANDED - 16, 150),
          fall(airwearBall, LANDED, 150),
        ]),
      ]),
    ]);

    running.current = Animated.parallel([standard, airwear]);
    running.current.start(({ finished }) => {
      if (finished) setPhase('done');
    });
  };

  const done = phase === 'done';

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>

      <View style={styles.compareRow}>
        <View style={styles.side}>
          <AppText style={styles.sideLabel}>{t('LensImpactStandard')}</AppText>
          <View style={styles.stage}>
            <Ball y={standardBall} />
            <FlatLens edge={EDGE_STANDARD} tone="standard" crack={crack} />
          </View>
          <View
            style={[
              styles.status,
              done ? styles.statusBad : styles.statusHidden,
            ]}
          >
            <Ionicons name="close-circle" size={13} color={Colors.error} />
            <AppText style={[styles.statusText, { color: Colors.error }]}>
              {t('LensImpactCracked')}
            </AppText>
          </View>
        </View>

        <AppText style={styles.vs}>{t('LensThicknessVs')}</AppText>

        <View style={styles.side}>
          <AppText style={styles.sideLabel}>{t('LensImpactAirWear')}</AppText>
          <View style={styles.stage}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ripple,
                {
                  opacity: ripple.interpolate({
                    inputRange: [0, 0.05, 1],
                    outputRange: [0, 0.7, 0],
                  }),
                  transform: [
                    {
                      scale: ripple.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Ball y={airwearBall} />
            <FlatLens edge={EDGE_AIRWEAR} tone="airwear" />
          </View>
          <View
            style={[
              styles.status,
              done ? styles.statusGood : styles.statusHidden,
            ]}
          >
            <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
            <AppText style={[styles.statusText, { color: Colors.success }]}>
              {t('LensImpactIntact')}
            </AppText>
          </View>
        </View>
      </View>

      <AppText style={styles.verdict}>
        {done ? t('LensImpactResult') : t('LensImpactIdle')}
      </AppText>

      <TouchableOpacity
        style={[styles.dropBtn, phase === 'dropping' && styles.dropBtnBusy]}
        activeOpacity={0.85}
        onPress={drop}
        disabled={phase === 'dropping'}
      >
        <Ionicons name="arrow-down-circle-outline" size={16} color={Colors.white} />
        <AppText style={styles.dropBtnText}>
          {done ? t('LensImpactAgain') : t('LensImpactDrop')}
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

export default ImpactDemo;

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
    gap: Spacing.sm,
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

  stage: {
    width: LENS_W,
    height: STAGE_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  lens: { width: LENS_W, height: LENS_H },
  ball: {
    position: 'absolute',
    top: 0,
    left: (LENS_W - BALL) / 2,
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    backgroundColor: '#4B5563',
    zIndex: 2,
  },
  ballShine: {
    position: 'absolute',
    top: 4,
    left: 5,
    width: 7,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  ripple: {
    position: 'absolute',
    top: STAGE_H - LENS_H + FACE.cy - FACE.ry,
    left: FACE.cx - FACE.rx,
    width: FACE.rx * 2,
    height: FACE.ry * 2,
    borderRadius: FACE.rx,
    borderWidth: 2,
    borderColor: '#38BDF8',
    zIndex: 1,
  },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  // Kept in the layout while hidden so the row doesn't jump when it appears.
  statusHidden: { opacity: 0 },
  statusBad: { backgroundColor: 'rgba(240,66,110,0.10)' },
  statusGood: { backgroundColor: 'rgba(45,189,126,0.12)' },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },

  verdict: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 19,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 38,
  },

  dropBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#4A2E22',
    borderRadius: BorderRadius.sm,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropBtnBusy: { opacity: 0.6 },
  dropBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
});
