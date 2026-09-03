import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
  /** Optional caption under the readings, e.g. "ADD +2.00 · PD 62". */
  meta?: string;
  /** Optional free-text note or diagnosis from the exam. */
  note?: string;
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
  meta,
  note,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      {/* Background/Bottom-Right Lens Image */}
      <Image
        source={require('../../../assets/images/len.png')}
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
      <View style={styles.valueRow}>
        <View style={styles.eyeBlock}>
          <AppText style={styles.eyeLabel}>{rightLabel} </AppText>
          <AppText style={styles.eyeValue}>{rightEye}</AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.eyeBlock}>
          <AppText style={styles.eyeLabel}>{leftLabel}</AppText>
          <AppText style={styles.eyeValue}>{leftEye}</AppText>
        </View>
      </View>

      {meta && <AppText style={styles.meta}>{meta}</AppText>}
      {note && <AppText style={styles.note}>{note}</AppText>}

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
  },
  cardImage: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 110,
    height: 100,
    transform: [{ scale: 2 }],
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
  eyeBlock: {
    maxWidth: 110,
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
