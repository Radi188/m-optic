import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import AppText from '../../AppText';

/**
 * Gold, used for every accent on the card: the eye labels, the eye glyph and
 * the exam metadata. One accent against the dark ground is what keeps it
 * reading as premium rather than merely dark.
 */
const GOLD = '#E3B778';

type CurrentPrescriptionCardProps = {
  rightEye?: string;
  leftEye?: string;
  updatedAt?: string;
  onPress?: () => void;
  title: string;
  rightLabel: string;
  leftLabel: string;
  /**
   * Show `updatedAt` in the header. Opt-in: the profile screen renders this
   * card without a date, while the history list needs one per entry to tell
   * the exams apart.
   */
  showDate?: boolean;
  /**
   * Optional caption under each eye's reading, e.g. "VA 6/6". The sphere and
   * cylinder share one slot, so visual acuity sits on its own line beneath the
   * eye it belongs to rather than being folded into the number.
   */
  rightSub?: string;
  leftSub?: string;
  /** Optional caption under the readings, e.g. "ADD +2.00 · PD 62". */
  meta?: string;
  /** Optional free-text note or diagnosis from the exam. */
  note?: string;
  /**
   * Retained for the existing call sites. The two eye blocks always share the
   * card's full width now — the old left-hugging variant existed to clear a
   * decorative lens image that is no longer drawn.
   */
  fullWidthEyes?: boolean;
  /** Surface override, for screens whose background needs a different card. */
  style?: StyleProp<ViewStyle>;
};

/** One eye's reading. */
const EyeColumn: React.FC<{
  label: string;
  value: string;
  sub?: string;
}> = ({ label, value, sub }) => (
  <View style={styles.eyeBlock}>
    <AppText style={styles.eyeLabel} numberOfLines={1}>
      {label}
    </AppText>

    {/* A full sphere/cylinder reading is long, so the type shrinks to fit
        rather than wrapping or being clipped. */}
    <AppText
      style={styles.eyeValue}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.55}
    >
      {value}
    </AppText>

    {!!sub && <AppText style={styles.eyeSub}>{sub}</AppText>}
  </View>
);

const CurrentPrescriptionCard: React.FC<CurrentPrescriptionCardProps> = ({
  rightEye = '—',
  leftEye = '—',
  updatedAt,
  title,
  rightLabel,
  leftLabel,
  onPress,
  showDate = false,
  rightSub,
  leftSub,
  meta,
  note,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      disabled={!onPress}
    >
      <LinearGradient
        colors={['#5A4232', '#3A2A20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* A single rotated highlight across the top-right corner — the light
          catch that keeps a flat dark panel from looking like a void. */}
      <View pointerEvents="none" style={styles.sheen} />

      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="eye-outline" size={17} color={GOLD} />
        </View>

        <View style={styles.headerText}>
          <AppText style={styles.title} numberOfLines={1}>
            {title}
          </AppText>
          {showDate && !!updatedAt && (
            <AppText style={styles.updatedText}>{updatedAt}</AppText>
          )}
        </View>

        {!!onPress && (
          <Ionicons
            name="chevron-forward"
            size={17}
            color="rgba(255,255,255,0.45)"
          />
        )}
      </View>

      {/* The readings sit on their own inset panel: it separates the numbers
          from the chrome around them and is what gives the card its depth
          without resorting to a heavier shadow. */}
      <View style={styles.readingsPanel}>
        <EyeColumn label={rightLabel} value={rightEye} sub={rightSub} />

        <View style={styles.divider} />

        <EyeColumn label={leftLabel} value={leftEye} sub={leftSub} />
      </View>

      {(!!meta || !!note) && (
        <View style={styles.footer}>
          {!!meta && (
            <AppText style={styles.meta} numberOfLines={1}>
              {meta}
            </AppText>
          )}
          {!!note && <AppText style={styles.note}>{note}</AppText>}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CurrentPrescriptionCard;

const styles = StyleSheet.create({
  // Deep espresso rather than the tier colours of the membership card above
  // it: two saturated cards stacked would compete, so this one stays neutral
  // and lets gold do the talking.
  card: {
    backgroundColor: '#3A2A20',
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.16)',
    shadowColor: '#2A160A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  sheen: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,226,182,0.10)',
    transform: [{ rotate: '18deg' }],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(227,183,120,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: { flex: 1 },

  // Small tracked caps rather than a sentence-case heading — it reads as a
  // document label, which is what a prescription is.
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  updatedText: {
    marginTop: 3,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.58)',
  },

  readingsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },

  eyeBlock: {
    flex: 1,
    alignItems: 'center',
  },

  eyeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },

  eyeMarker: {
    fontSize: 9.5,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 0.8,
  },

  eyeLabel: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  eyeValue: {
    alignSelf: 'stretch',
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  eyeSub: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },

  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  footer: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  meta: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(227,183,120,0.92)',
    letterSpacing: 0.2,
  },

  note: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
  },
});
