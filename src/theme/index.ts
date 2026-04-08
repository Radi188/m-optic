// ─── M-Optic Design System — Liquid Glass Edition ────────────────────────────

export const Colors = {
  // Brand
  primary: '#9C8178',
  primaryLight: 'rgba(156, 129, 120, 0.14)',
  primaryDark: '#7A6360',
  primaryMid: '#B09590',
  primaryGlow: 'rgba(156, 129, 120, 0.28)',

  // Base
  white: '#FFFFFF',
  black: '#1A1208',

  // Grays (warm-tinted)
  gray50:  '#FAF8F6',
  gray100: '#F3EEE9',
  gray200: '#E8DDD6',
  gray300: '#D4C5BC',
  gray400: '#AFA099',
  gray500: '#8C7D76',
  gray600: '#6E6058',
  gray700: '#4A3D38',

  // Semantic
  success: '#2DBD7E',
  successLight: 'rgba(45, 189, 126, 0.14)',
  error: '#F05252',
  errorLight: 'rgba(240, 82, 82, 0.14)',
  warning: '#F7A440',
  warningLight: 'rgba(247, 164, 64, 0.14)',
  info: '#4DA8DA',
  infoLight: 'rgba(77, 168, 218, 0.14)',

  // Backgrounds (warm parchment base)
  background: '#EFE6DF',
  backgroundDeep: '#E8DDD5',

  // Glass surfaces
  glassSurface: 'rgba(255, 255, 255, 0.68)',
  glassSurfaceHigh: 'rgba(255, 255, 255, 0.86)',
  glassSurfaceMid: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.75)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.92)',
  glassHighlight: 'rgba(255, 255, 255, 0.96)',
  glassTint: 'rgba(156, 129, 120, 0.10)',
  glassOverlay: 'rgba(30, 18, 12, 0.52)',

  // Functional aliases
  surface: 'rgba(255, 255, 255, 0.68)',
  border: 'rgba(255, 255, 255, 0.75)',
  divider: 'rgba(156, 129, 120, 0.18)',

  // Tab bar
  tabBar: 'rgba(255, 255, 255, 0.78)',
  tabBarActive: '#9C8178',
  tabBarInactive: '#AFA099',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 40,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
};

// Warm glass shadows — ambient layer + directional
export const Shadow = {
  sm: {
    shadowColor: '#7A5040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#6B3D28',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 7,
  },
  lg: {
    shadowColor: '#5A2E18',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  glow: {
    shadowColor: '#9C8178',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Orb accent colors for the animated background
export const OrbColors = {
  orb1: 'rgba(199, 160, 148, 0.38)',
  orb2: 'rgba(255, 200, 175, 0.32)',
  orb3: 'rgba(220, 180, 165, 0.25)',
};
