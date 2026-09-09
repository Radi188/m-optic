import React from 'react';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';
import { Colors } from '../../../theme';

/**
 * A pair of glasses drawn in the silhouette of one frame shape.
 *
 * Replaces the Ionicons stand-ins the recommendation cards used, where the
 * shape was only implied — a bare square for Wayfarer, a triangle for Aviator,
 * a minus sign for Rimless. A shopper choosing between frame shapes needs to
 * see the frame, so each entry here draws the actual lens outline, bridge and
 * temples.
 *
 * Everything is drawn in a 64 × 30 viewBox. Only the LEFT lens is described;
 * the right one is the same path mirrored about the centre line, which keeps
 * the pairs perfectly symmetrical and each definition half the size.
 */

type Geom = {
  /** The left lens. Mirrored to produce the right lens. */
  lens: React.ReactNode;
  /** Bridge between the lenses. */
  bridge: React.ReactNode;
  /** Anything drawn once across the whole frame (brow bar, ornament). */
  extras?: React.ReactNode;
  /** Rimless draws its lenses lighter than its hardware. */
  lensOpacity?: number;
  lensWidth?: number;
};

const ARCH_BRIDGE = <Path d="M28 11.6 C30.4 9.7 33.6 9.7 36 11.6" />;
const FLAT_BRIDGE = <Path d="M28 10.6 C30.6 9.4 33.4 9.4 36 10.6" />;

const GEOM: Record<string, Geom> = {
  Round: {
    lens: <Circle cx={16} cy={14} r={10.4} />,
    bridge: ARCH_BRIDGE,
  },

  Oval: {
    lens: <Ellipse cx={16} cy={14} rx={11.4} ry={8.8} />,
    bridge: ARCH_BRIDGE,
  },

  Square: {
    lens: <Rect x={5} y={5.6} width={22} height={17} rx={3.5} />,
    bridge: FLAT_BRIDGE,
  },

  Rectangle: {
    lens: <Rect x={4} y={7.4} width={24} height={13.2} rx={3} />,
    bridge: FLAT_BRIDGE,
  },

  Oversized: {
    lens: <Rect x={3} y={3.6} width={25.4} height={20.8} rx={8} />,
    bridge: <Path d="M28.4 12.4 C30.8 11 33.2 11 35.6 12.4" />,
  },

  // Flat brow, gently tapering to a rounded bottom.
  Wayfarer: {
    lens: (
      <Path d="M5.2 8.4 C5 6.2 6.4 5.4 8.4 5.4 L25.6 5.4 C27.8 5.4 28.6 6.6 28.3 8.8 L27.2 17.4 C26.7 21.4 23.6 23.4 19.4 23.4 L14.2 23.4 C9.6 23.4 6.6 20.6 6.1 16.4 Z" />
    ),
    bridge: FLAT_BRIDGE,
  },

  // The defining feature is the flick at the top outer corner.
  'Cat-Eye': {
    lens: (
      <Path d="M3.2 6.4 C6.6 5.2 10 5.4 13 5.9 L25.6 7.8 C27.8 8.1 28.4 9.4 28.1 11.4 L27.1 17 C26.4 21.2 23.3 23.3 19.1 23.3 L14 23.3 C9.4 23.3 6 20.1 5 15.7 L3.6 9.1 C3.3 7.9 3.2 7 3.2 6.4 Z" />
    ),
    bridge: <Path d="M28.2 12 C30.6 10.4 33.4 10.4 35.8 12" />,
  },

  // Teardrop: broad across the brow, narrowing to a rounded point.
  Aviator: {
    lens: (
      <Path d="M4.6 8.4 C4.4 6.1 5.8 5.3 8 5.3 L25.4 5.3 C27.8 5.3 28.6 6.5 28.2 8.9 L26.6 16.6 C25.4 21.6 21.6 23.9 17.4 23.9 C12.6 23.9 8.6 21.2 6.6 16 Z" />
    ),
    // Aviators carry a double bar, which is most of how you recognise them.
    bridge: (
      <G>
        <Path d="M28.2 8.6 L35.8 8.6" />
        <Path d="M28.6 12.4 L35.4 12.4" />
      </G>
    ),
  },

  // Heavy brow bar over a light lower rim.
  Browline: {
    lens: (
      <Path d="M5.4 10.4 L27.2 10.4 L26.3 17.6 C25.7 21.6 22.8 23.6 18.8 23.6 L14 23.6 C9.6 23.6 6.3 21 5.6 16.6 Z" />
    ),
    bridge: <Path d="M28 12.4 C30.6 11.2 33.4 11.2 36 12.4" />,
    extras: (
      <Path
        d="M3.6 9.4 C10 7.4 22 7.4 28.4 9.4 C30.6 10.1 33.4 10.1 35.6 9.4 C42 7.4 54 7.4 60.4 9.4"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
    ),
  },

  // Angular, unequal facets — a cut lens rather than a soft one.
  Geometric: {
    lens: (
      <Path d="M4.6 11.4 L9.4 5.8 L22.6 5.4 L28 10.2 L25.6 18.6 L17.4 23.6 L8.4 20.4 Z" />
    ),
    bridge: <Path d="M28 10.8 L36 10.8" />,
  },

  // No rim to speak of: the lens is a ghost, the hardware is what is solid.
  Rimless: {
    lens: <Rect x={4} y={7.4} width={24} height={13.2} rx={3} />,
    lensOpacity: 0.4,
    lensWidth: 1.2,
    bridge: <Path d="M28 11 C30.6 9.8 33.4 9.8 36 11" />,
    extras: (
      <G>
        <Circle cx={27.4} cy={11.4} r={1.5} />
        <Circle cx={36.6} cy={11.4} r={1.5} />
      </G>
    ),
  },

  // An oval lens with ornament at the temple, which is where decorative
  // frames actually carry their detail.
  Decorative: {
    lens: <Ellipse cx={16} cy={14} rx={11.4} ry={8.8} />,
    bridge: ARCH_BRIDGE,
    extras: (
      <G>
        <Path d="M4.4 14 L2 11.4 M4.4 14 L2 16.6" strokeWidth={1.4} />
        <Path d="M59.6 14 L62 11.4 M59.6 14 L62 16.6" strokeWidth={1.4} />
        <Circle cx={16} cy={4.4} r={1.3} />
        <Circle cx={48} cy={4.4} r={1.3} />
      </G>
    ),
  },
};

const DEFAULT_SHAPE = 'Rectangle';

const FrameShapeIcon: React.FC<{
  shape: string;
  /** Height of the drawing; the width follows the 64:30 viewBox. */
  size?: number;
  color?: string;
}> = ({ shape, size = 20, color = Colors.primary }) => {
  const g = GEOM[shape] ?? GEOM[DEFAULT_SHAPE];

  return (
    <Svg width={(size * 64) / 30} height={size} viewBox="0 0 64 30" fill="none">
      <G
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      >
        {/* Temples, folded back from the hinges. */}
        <Path d="M4.8 9 C2.8 7.8 1.6 7.2 0.8 7" opacity={0.85} />
        <G transform="translate(64,0) scale(-1,1)">
          <Path d="M4.8 9 C2.8 7.8 1.6 7.2 0.8 7" opacity={0.85} />
        </G>

        {/* Lenses — one path, mirrored about the centre line. */}
        <G opacity={g.lensOpacity ?? 1} strokeWidth={g.lensWidth ?? 2}>
          {g.lens}
          <G transform="translate(64,0) scale(-1,1)">{g.lens}</G>
        </G>

        {g.bridge}
        {g.extras}
      </G>
    </Svg>
  );
};

export default FrameShapeIcon;
