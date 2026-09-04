import React, { useEffect, useId, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RealisticLensIconProps = {
  /** 0–100. Drives the depth of the cylinder drawn behind the front face. */
  thickness: number;
  isActive: boolean;
  laserOn?: boolean;
  lensType?: 'standard' | 'blueblock';
  /**
   * Rendered size in px. The artwork is letterboxed, so off-ratio values leave
   * padding rather than distorting the lens.
   */
  width?: number;
  height?: number;
};

/** Front-face geometry, in viewBox units. */
const CX = 45;
const CY = 55;
const RX = 22;
const RY = 48;

/**
 * A lens drawn as glass rather than as a rounded rectangle: a front ellipse
 * over a shaded cylinder whose depth follows `thickness`, with specular
 * highlights clipped to the face.
 *
 * With `laserOn`, a standard lens lets the beam straight through while a
 * blueblock lens stops it at the front surface — the point the Blue Block
 * demo exists to make.
 */
const RealisticLensIcon: React.FC<RealisticLensIconProps> = ({
  thickness,
  isActive,
  laserOn = false,
  lensType = 'standard',
  width = 135,
  height = 175,
}) => {
  // 100% thickness corresponds to 14 units of cylinder depth.
  const depth = (thickness / 100) * 14;

  // Gradient ids are document-global in SVG, so two icons on one screen would
  // otherwise share (and fight over) each other's definitions.
  const uid = useId().replace(/:/g, '');
  const clipId = `lens-clip-${uid}`;
  const edgeId = `lens-edge-${uid}`;
  const glassId = `lens-glass-${uid}`;
  const sheenId = `lens-sheen-${uid}`;
  const glareId = `lens-glare-${uid}`;

  // Stands in for Tailwind's `animate-ping`: the blocked beam pulses at the
  // surface instead of sitting there as a dead dot.
  const ping = useRef(new Animated.Value(0)).current;
  const blocking = laserOn && lensType === 'blueblock';

  useEffect(() => {
    if (!blocking) {
      ping.stopAnimation();
      ping.setValue(0);
      return;
    }
    // The JS driver: `r` is an SVG prop, not a natively animatable style.
    const loop = Animated.loop(
      Animated.timing(ping, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [blocking, ping]);

  const pingRadius = ping.interpolate({ inputRange: [0, 1], outputRange: [4, 11] });
  const pingOpacity = ping.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <Svg width={width} height={height} viewBox="9 0 80 110" fill="none">
      <Defs>
        {/* Matches the exact boundary of the front lens face. */}
        <ClipPath id={clipId}>
          <Ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
        </ClipPath>

        {/* Cylinder depth: a horizontal progression across the visible edge. */}
        <LinearGradient id={edgeId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={isActive ? '#2a1e15' : '#1e293b'} stopOpacity="0.95" />
          <Stop offset="15%" stopColor={isActive ? '#4a3525' : '#334155'} stopOpacity="0.8" />
          <Stop offset="60%" stopColor={isActive ? '#a07c65' : '#94a3b8'} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={isActive ? '#4a3525' : '#475569'} stopOpacity="0.9" />
        </LinearGradient>

        {/* Glass face reflection. */}
        <LinearGradient id={glassId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="35%" stopColor="#e0f2fe" stopOpacity="0.15" />
          <Stop offset="70%" stopColor="#bae6fd" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
        </LinearGradient>

        {/* Anti-reflection coating sheen. */}
        <LinearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={isActive ? '#38bdf8' : '#34d399'} stopOpacity="0.35" />
          <Stop offset="50%" stopColor={isActive ? '#38bdf8' : '#34d399'} stopOpacity="0" />
          <Stop offset="100%" stopColor={isActive ? '#38bdf8' : '#34d399'} stopOpacity="0.15" />
        </LinearGradient>

        {/* Glare border stroke. */}
        <LinearGradient id={glareId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <Stop offset="40%" stopColor="#ffffff" stopOpacity="0.2" />
          <Stop offset="80%" stopColor="#ffffff" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
        </LinearGradient>
      </Defs>

      {/* The cylinder's right side, joining the front and back ellipses. */}
      {depth > 0.5 && (
        <Path
          d={`M ${CX} ${CY - RY} A ${RX} ${RY} 0 0 1 ${CX} ${CY + RY} L ${
            CX + depth
          } ${CY + RY} A ${RX} ${RY} 0 0 0 ${CX + depth} ${CY - RY} Z`}
          fill={`url(#${edgeId})`}
          stroke={isActive ? '#4a3525' : '#334155'}
          strokeWidth="0.5"
        />
      )}

      <Ellipse
        cx={CX}
        cy={CY}
        rx={RX}
        ry={RY}
        fill={`url(#${glassId})`}
        stroke={`url(#${glareId})`}
        strokeWidth="1.2"
      />

      {/* Clipped so the highlights can never overflow the face. */}
      <G clipPath={`url(#${clipId})`}>
        <Ellipse
          cx={CX}
          cy={CY}
          rx={RX - 1}
          ry={RY - 1}
          fill={`url(#${sheenId})`}
        />

        {/* Inner highlight down the left edge. */}
        <Path
          d={`M ${CX - RX + 3.5} ${CY - RY + 12} A ${RX - 2} ${RY - 10} 0 0 1 ${
            CX - RX + 3.5
          } ${CY + RY - 12}`}
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
        {/* Softer outer highlight down the right edge. */}
        <Path
          d={`M ${CX + RX - 4} ${CY - RY + 18} A ${RX - 2} ${RY - 15} 0 0 0 ${
            CX + RX - 4
          } ${CY + RY - 18}`}
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />
      </G>

      {laserOn &&
        (lensType === 'standard' ? (
          <>
            {/* Straight through. The wide translucent line stands in for the
                blur the web version gets from a CSS filter. */}
            <Line
              x1={CX - RX}
              y1={CY}
              x2={CX + RX}
              y2={CY}
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.85"
            />
            <Line
              x1={CX - RX}
              y1={CY}
              x2={CX + RX}
              y2={CY}
              stroke="#ffffff"
              strokeWidth="1"
              opacity="0.95"
            />
          </>
        ) : (
          <>
            {/* Stopped dead at the front surface. */}
            <AnimatedCircle
              cx={CX - RX + 0.5}
              cy={CY}
              r={pingRadius}
              fill="#3b82f6"
              opacity={pingOpacity}
            />
            <Circle cx={CX - RX + 0.5} cy={CY} r="3.5" fill="#3b82f6" />
            <Circle cx={CX - RX + 0.5} cy={CY} r="1.5" fill="#ffffff" />
          </>
        ))}
    </Svg>
  );
};

export default RealisticLensIcon;
