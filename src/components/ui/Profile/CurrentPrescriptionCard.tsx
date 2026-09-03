import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import AppText from '../../AppText';

type CurrentPrescriptionCardProps = {
  rightEye?: string;
  leftEye?: string;
  updatedAt?: string;
  onPress?: () => void;
  title: string;
  rightLabel: string;
  leftLabel: string;
  /**
   * Show `updatedAt` in the top-right corner. Opt-in: the profile and
   * prescription screens deliberately render this card without a date, while
   * the history list needs one per entry to tell the exams apart.
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
   * Let the two eye blocks share the card's full width, with the divider
   * centred between them. Opt-in: the profile and prescription screens keep
   * the compact, left-hugging layout so the decorative lens stays clear.
   */
  fullWidthEyes?: boolean;
  /**
   * Surface override. The default beige is tuned for the white profile
   * canvas; on a warm-background screen it needs a lighter surface to stay
   * distinguishable from the page.
   */
  style?: StyleProp<ViewStyle>;
};

const CurrentPrescriptionCard: React.FC<CurrentPrescriptionCardProps> = ({
  rightEye = '-4.00',
  leftEye = '-3.75',
  updatedAt = '12 May 2026',
  title = 'Current Prescription',
  rightLabel = 'Right Eye',
  leftLabel = 'Left Eye',
  onPress,
  showDate = false,
  rightSub,
  leftSub,
  meta,
  note,
  fullWidthEyes = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      {/* Background/Bottom-Right Lens Image */}
      <Image
        source={require('../../../assets/images/lens.png')}
        style={styles.cardImage}
        resizeMode="contain"
      />

      {/* Top Section: Icon, Title, and Date */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="eye-outline" size={20} color={'#5B3A26'} />
          </View>
          {/* Title wraps naturally onto two lines because of the width constraint */}
          <AppText style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
        </View>
        {showDate && updatedAt && (
          <AppText style={styles.updatedText}>{updatedAt}</AppText>
        )}
      </View>

      {/* Center Section: Eye Prescription Numbers */}
      <View style={[styles.valueRow, fullWidthEyes && styles.valueRowFull]}>
        <View style={[styles.eyeBlock, fullWidthEyes && styles.eyeBlockFull]}>
          <AppText style={styles.eyeLabel}>{rightLabel} </AppText>
          <AppText style={styles.eyeValue}>{rightEye}</AppText>
          {!!rightSub && <AppText style={styles.eyeSub}>{rightSub}</AppText>}
        </View>

        <View style={[styles.divider, fullWidthEyes && styles.dividerFull]} />

        <View style={[styles.eyeBlock, fullWidthEyes && styles.eyeBlockFull]}>
          <AppText style={styles.eyeLabel}>{leftLabel}</AppText>
          <AppText style={styles.eyeValue}>{leftEye}</AppText>
          {!!leftSub && <AppText style={styles.eyeSub}>{leftSub}</AppText>}
        </View>
      </View>

      {(meta || note) && (
        <View style={styles.footer}>
          {meta && <AppText style={styles.meta}>{meta}</AppText>}
          {note && <AppText style={styles.note}>{note}</AppText>}
        </View>
      )}

      {/* Bottom Section: View Details CTA */}
      {/* <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <AppText style={styles.buttonText}>View Details</AppText>
        <Ionicons name="chevron-forward" size={14} color={'#412616'} />
      </TouchableOpacity> */}
    </TouchableOpacity>
  );
};

export default CurrentPrescriptionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5ECE6',
    borderRadius: 32,
    padding: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EFE2DA',
    // Keeps the decorative lens inside the rounded shape.
    overflow: 'hidden',
  },
  // Was `width: 110 … transform: scale(2)`, which drew the art 220x147 and
  // pushed it ~35pt past the card's right edge, leaving the text underneath
  // it. Sized explicitly (source is 3:2) so it sits in the bottom-right
  // corner and leaves a clear column on the left.
  cardImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 110,
    height: 73,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBE0D7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1310',
  },
  updatedText: {
    fontSize: 13,
    color: '#7F726A',
    paddingTop: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Keeps the labels aligned at the top
    marginBottom: 12,
  },
  // Full-width variant: the two blocks split the card evenly and sit above
  // the decorative lens, instead of hugging the left column.
  valueRowFull: {
    alignSelf: 'stretch',
    // Lets the divider run the full height of the tallest block, so it still
    // reaches past the VA line underneath the readings.
    alignItems: 'stretch',
    zIndex: 1,
  },
  eyeBlock: {
    maxWidth: 110,
  },
  eyeBlockFull: {
    flex: 1,
    maxWidth: undefined,
  },
  eyeSub: {
    fontSize: 12,
    color: '#7F726A',
    marginTop: 4,
  },
  eyeLabel: {
    fontSize: 14,
    color: '#8A7A71',
    marginBottom: 8,
  },
  eyeValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1310',
    letterSpacing: -0.5,
  },
  // The lens occupies the right ~32% of the card, so the doctor/branch line
  // and the note stay in the left column rather than running across it.
  footer: {
    maxWidth: '68%',
    zIndex: 1,
  },
  meta: {
    fontSize: 13,
    color: '#7F726A',
    marginBottom: 4,
  },
  note: {
    fontSize: 13,
    color: '#5B4A42',
    lineHeight: 19,
    marginBottom: 4,
  },
  divider: {
    width: 1,
    height: 45,
    backgroundColor: '#E5D6CD',
    marginHorizontal: 24,
    marginTop: 8, // Pushes divider down to align nicely with the text layout
  },
  dividerFull: {
    marginHorizontal: 16,
    height: undefined,
    marginBottom: 4,
  },
  button: {
    width: 145,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#412616',
  },
});
