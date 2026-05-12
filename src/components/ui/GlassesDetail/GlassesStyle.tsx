import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import RenderHTML from 'react-native-render-html';

import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadow,
} from '../../../theme';

interface Props {
  brand: string;
  size: string;
  gender: string;
  frameTypeName: string;
  colorHex?: string;
  colorName?: string;
  descriptionHtml: string;
}

const GlassesStyleSection: React.FC<Props> = ({
  brand,
  size,
  gender,
  frameTypeName,
  colorHex = '#D1D5DB',
  colorName = 'Default',
  descriptionHtml,
}) => {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.section}>
      <View
        style={{ ...styles.block, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text style={styles.sectionTitleColor}>Color</Text>

        <View style={styles.singleColorCard}>
          <View style={[styles.colorCircle, { backgroundColor: colorHex }]} />
          <Text style={styles.colorText}>{colorName}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Frame Details</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="glasses-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Frame Type</Text>
            <Text style={styles.infoValue}>{frameTypeName}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={Colors.primary}
            />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Brand</Text>
            <Text style={styles.infoValue}>{brand}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="resize-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Size</Text>
            <Text style={styles.infoValue}>{size}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{gender}</Text>
          </View>
        </View>
      </View>

      <View style={styles.descriptionWrap}>
        <Text style={styles.blockTitle}>Description</Text>
        <RenderHTML
          contentWidth={width - Spacing.md * 2}
          source={{ html: descriptionHtml }}
          baseStyle={styles.htmlBase}
          tagsStyles={{
            p: styles.htmlP,
            ul: styles.htmlUl,
            ol: styles.htmlOl,
            li: styles.htmlLi,
            strong: styles.htmlStrong,
            b: styles.htmlStrong,
          }}
        />
      </View>
    </View>
  );
};

export default GlassesStyleSection;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sectionTitleColor: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
    marginRight: 8,
  },
  block: {
    marginBottom: Spacing.md,
  },
  blockTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
    marginBottom: Spacing.sm,
  },

  singleColorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(176,144,128,0.14)',
    ...Shadow.sm,
  },
  colorCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  colorText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  infoCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(176,144,128,0.14)',
    ...Shadow.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(176,144,128,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary || '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  descriptionWrap: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  htmlBase: {
    color: Colors.text,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  htmlP: {
    marginTop: 0,
    marginBottom: 10,
    color: Colors.text,
    lineHeight: 22,
  },
  htmlUl: {
    marginTop: 0,
    marginBottom: 10,
    paddingLeft: 18,
  },
  htmlOl: {
    marginTop: 0,
    marginBottom: 10,
    paddingLeft: 18,
    color: Colors.black,
  },
  htmlLi: {
    marginBottom: 6,
    color: Colors.black,
    lineHeight: 22,
  },
  htmlStrong: {
    fontWeight: '700',
    color: Colors.text,
  },
});
