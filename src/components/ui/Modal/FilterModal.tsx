import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppModal, Input } from '../index';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

type BrandItem = {
  id: number | string;
  name: string;
};

type FrameItem = {
  label: string;
  value: string;
};

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;

  brandTabs: BrandItem[];
  frameOptions: FrameItem[];

  tempBrand: number | 'all';
  tempFrame: string;
  tempMinPrice: string;
  tempMaxPrice: string;

  setTempBrand: (value: number | 'all') => void;
  setTempFrame: (value: string) => void;
  setTempMinPrice: (value: string) => void;
  setTempMaxPrice: (value: string) => void;
};

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  onReset,
  brandTabs,
  frameOptions,
  tempBrand,
  tempFrame,
  tempMinPrice,
  tempMaxPrice,
  setTempBrand,
  setTempFrame,
  setTempMinPrice,
  setTempMaxPrice,
}) => {
  const { t } = useTranslation();

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={t('filterProductsTitle')}
      actions={[
        {
          label: t('commonApply'),
          onPress: onApply,
          variant: 'primary',
        },
        {
          label: t('commonReset'),
          onPress: onReset,
          variant: 'ghost',
        },
      ]}
    >
      <View style={styles.section}>
        <AppText style={styles.label}>{t('filterBrand')}</AppText>

        <View style={styles.chipsWrap}>
          {brandTabs.map(item => {
            const brandValue = item.id === 'all' ? 'all' : Number(item.id);
            const active = tempBrand === brandValue;

            return (
              <Pressable
                key={String(item.id)}
                onPress={() => setTempBrand(brandValue)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(item.name)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.label}>{t('filterFrame')}</AppText>

        <View style={styles.chipsWrap}>
          {frameOptions.map(item => {
            const active = tempFrame === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => setTempFrame(item.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(item.label)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.label}>{t('filterPrice')}</AppText>

        <View style={styles.priceRow}>
          <View style={styles.inputWrap}>
            <Input
              label={t('filterMinPrice')}
              placeholder="0"
              keyboardType="number-pad"
              value={tempMinPrice}
              onChangeText={setTempMinPrice}
            />
          </View>

          <View style={styles.inputWrap}>
            <Input
              label={t('filterMaxPrice')}
              placeholder="500"
              keyboardType="number-pad"
              value={tempMaxPrice}
              onChangeText={setTempMaxPrice}
            />
          </View>
        </View>
      </View>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  chipActive: {
    backgroundColor: '#f6eeea',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrap: {
    flex: 1,
  },
});

export default FilterModal;
