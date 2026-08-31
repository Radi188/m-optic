import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import RenderHTML from 'react-native-render-html';

import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadow,
} from '../../../theme';
import AppText from '../../AppText';

export interface ColorSwatch {
  id: string;
  hex: string;
  label: string;
}

interface Props {
  brand: string;
  size: string;
  gender: string;
  frameTypeName: string;
  colorHex?: string;
  colorName?: string;
  descriptionHtml: string;
  /** Frame dimensions as "53–17–140", when the API has them. */
  measurementLabel?: string | null;
  materials?: string | null;
  /** One swatch per colourway. With fewer than two, a single colour is shown. */
  colorOptions?: ColorSwatch[];
  selectedColorId?: string | null;
  onSelectColor?: (id: string) => void;
}

const GlassesStyleSection: React.FC<Props> = ({
  brand,
  size,
  gender,
  frameTypeName,
  colorHex = '#D1D5DB',
  colorName = 'Default',
  descriptionHtml,
  measurementLabel = null,
  materials = null,
  colorOptions = [],
  selectedColorId = null,
  onSelectColor,
}) => {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <View
        style={{ ...styles.block, flexDirection: 'row', alignItems: 'center' }}
      >
        <AppText style={styles.sectionTitleColor}>{t('glassColor')}</AppText>

        {colorOptions.length > 1 ? (
          <View style={styles.swatchRow}>
            {colorOptions.map(option => {
              const active = option.id === selectedColorId;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => onSelectColor?.(option.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label || 'Colour option'}
                  style={[styles.swatch, active && styles.swatchActive]}
                >
                  <View
                    style={[styles.swatchDot, { backgroundColor: option.hex }]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.singleColorCard}>
            <View style={[styles.colorCircle, { backgroundColor: colorHex }]} />
            <AppText style={styles.colorText}>
              {colorName || t('commonDefault')}
            </AppText>
          </View>
        )}
      </View>

      <AppText style={styles.sectionTitle}>{t('glassFrameDetails')}</AppText>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="glasses-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <AppText style={styles.infoLabel}>{t('glassFrameType')}</AppText>
            <AppText style={styles.infoValue}>{frameTypeName}</AppText>
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
            <AppText style={styles.infoLabel}>{t('glassBrand')}</AppText>
            <AppText style={styles.infoValue}>{brand}</AppText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="resize-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <AppText style={styles.infoLabel}>{t('glassSize')}</AppText>
            <AppText style={styles.infoValue}>{size}</AppText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <AppText style={styles.infoLabel}>{t('glassGender')}</AppText>
            <AppText style={styles.infoValue}>{gender}</AppText>
          </View>
        </View>

        {/* Only rendered when the API actually carries the values — an empty
            card reads as missing data rather than as a spec. */}
        {measurementLabel ? (
          <View style={styles.infoCard}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="swap-horizontal"
                size={18}
                color={Colors.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <AppText style={styles.infoLabel}>
                {t('glassMeasurements')}
              </AppText>
              <AppText style={styles.infoValue}>{measurementLabel}</AppText>
            </View>
          </View>
        ) : null}

        {materials ? (
          <View style={styles.infoCard}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="layers-outline"
                size={18}
                color={Colors.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <AppText style={styles.infoLabel}>{t('glassMaterial')}</AppText>
              <AppText style={styles.infoValue}>{materials}</AppText>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.descriptionWrap}>
        <AppText style={styles.blockTitle}>{t('commonDescription')}</AppText>

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
    paddingHorizontal: Spacing.md,
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

  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: 'auto',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: Colors.primary,
  },
  swatchDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.gray300,
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
