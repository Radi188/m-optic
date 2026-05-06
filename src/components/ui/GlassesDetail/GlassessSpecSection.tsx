import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Spacing } from '../../../theme';

const availableLensesAndCoatings = [
  'UV Protection',
  'Blue-Light Blocking',
  'Color-Tinted',
  'Photochromic',
  'Polarized',
  'Driving',
  'Anti-Scratch Coating',
];

const servicesAndGuarantees = [
  'FSA/HSA Eligible',
  'Free Shipping Over $69',
  '30-Day Exchanges & Returns',
  '365-Day Warranty',
  'Worry-Free Delivery Available',
];

const productDetails = {
  frameSize: '130mm (width)',
  lensWidth: '53mm',
  lensHeight: '47mm',
};

const GlassesSpecSection = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Available Lenses & Coatings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Lenses & Coatings</Text>
        <View style={styles.list}>
          {availableLensesAndCoatings.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.tickCircle}>
                <Ionicons name="checkmark" size={14} color="black" />
              </View>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Services & Guarantees Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services & Guarantees</Text>
        <View style={styles.servicesList}>
          {servicesAndGuarantees.map((item, index) => (
            <View key={index} style={styles.bulletPointItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Product Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Details</Text>
        <Text style={styles.detailsText}>
          Frame size: {productDetails.frameSize}
        </Text>
        <Text style={styles.detailsText}>
          Lens width: {productDetails.lensWidth}
        </Text>
        <Text style={styles.detailsText}>
          Lens height: {productDetails.lensHeight}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: '#333',
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '50%', // Ensures each item takes up 48% of the container's width, 2 per row
    marginBottom: 12,
  },
  tickCircle: {
    width: 20,
    height: 20,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  listText: {
    fontSize: 14,
    color: '#555',
  },
  servicesList: {
    paddingLeft: 0,
  },
  bulletPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#000',
    marginRight: 6,
  },
  detailsText: {
    fontSize: 14,
    color: '#555',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    backgroundColor: '#b09080',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default GlassesSpecSection;
