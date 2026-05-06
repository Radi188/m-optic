import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import RenderHTML from 'react-native-render-html';

import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadow,
} from '../../../theme';

type ColorItem = {
  id: string;
  name: string;
  value: string;
};

interface Props {
  brand: string;
  size: string;
  gender: string;
  frameTypeName: string;
  colors: ColorItem[];
  selectedColorId: string;
  onSelectColor: (id: string) => void;
  descriptionHtml: string;
}

const GlassesStyleSection: React.FC<Props> = ({
  brand,
  size,
  gender,
  frameTypeName,
  descriptionHtml,
  colors,
  selectedColorId,
  onSelectColor,
}) => {
  const selectedColor =
    colors.find(color => color.id === selectedColorId)?.name || 'Unknown';

  const { width } = useWindowDimensions();

  return (
    <View style={styles.section}>
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Color</Text>

        <View style={styles.colorRow}>
          {colors.map(item => {
            const isActive = item.id === selectedColorId;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => onSelectColor(item.id)}
                style={[styles.colorItem, isActive && styles.colorItemActive]}
              >
                <View
                  style={[styles.colorCircle, { backgroundColor: item.value }]}
                />
                <Text
                  style={[styles.colorText, isActive && styles.colorTextActive]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  block: {
    marginBottom: Spacing.md,
  },
  blockTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
    marginBottom: Spacing.sm,
  },
  frameCard: {
    overflow: 'hidden',

    borderColor: 'rgba(176,144,128,0.14)',
  },

  frameImage: {
    width: 120,
    height: 90,
    backgroundColor: '#F8F5F2',
  },

  frameFooter: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },

  frameName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'left',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(176,144,128,0.14)',
    ...Shadow.sm,
  },
  colorItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(176,144,128,0.08)',
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
  colorTextActive: {
    color: Colors.primary,
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
  htmlH1: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    color: Colors.text,
  },
  htmlH2: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.text,
  },
  htmlH3: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.text,
  },
});
