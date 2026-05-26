import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

type CurrentPrescriptionCardProps = {
  rightEye?: string;
  leftEye?: string;
  updatedAt?: string;
  onPress?: () => void;
};

const CurrentPrescriptionCard: React.FC<CurrentPrescriptionCardProps> = ({
  rightEye = '-4.00',
  leftEye = '-3.75',
  updatedAt = '12 May 2026',
  onPress,
}) => {
  return (
    <View style={styles.card}>
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
          <Text style={styles.title} numberOfLines={2}>
            Current Prescription
          </Text>
        </View>
        {/* <Text style={styles.updatedText}>Updated {updatedAt}</Text> */}
      </View>

      {/* Center Section: Eye Prescription Numbers */}
      <View style={styles.valueRow}>
        <View style={styles.eyeBlock}>
          <Text style={styles.eyeLabel}>Right Eye </Text>
          <Text style={styles.eyeValue}>{rightEye}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.eyeBlock}>
          <Text style={styles.eyeLabel}>Left Eye </Text>
          <Text style={styles.eyeValue}>{leftEye}</Text>
        </View>
      </View>

      {/* Bottom Section: View Details CTA */}
      {/* <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <Text style={styles.buttonText}>View Details</Text>
        <Ionicons name="chevron-forward" size={14} color={'#412616'} />
      </TouchableOpacity> */}
    </View>
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
