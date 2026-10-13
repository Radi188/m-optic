import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
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

type FilterTab = 'frame' | 'price' | 'brand';

const TABS: { key: FilterTab; labelKey: string }[] = [
  { key: 'frame', labelKey: 'filterFrame' },
  { key: 'price', labelKey: 'filterPrice' },
  { key: 'brand', labelKey: 'filterBrand' },
];

// One-tap ranges; the inputs below them still allow any range.
// `label` is shown as-is, except the open-ended low range, which is worded.
const PRICE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: 'under-100', min: '', max: '100' },
  { label: '$100 – $200', min: '100', max: '200' },
  { label: '$200 – $300', min: '200', max: '300' },
  { label: '$300+', min: '300', max: '' },
];

const SNAP_POINTS = ['72%'];

/**
 * Product filters as a bottom sheet with one tab per filter. Each tab scrolls
 * on its own, and Reset / Apply stay pinned to the bottom. Selections are
 * held by the parent as "temp" values and only take effect on Apply.
 */
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
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [tab, setTab] = useState<FilterTab>('frame');

  // The parent owns `visible`; mirror it onto the imperative sheet API.
  useEffect(() => {
    if (visible) {
      setTab('frame');
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const isSet: Record<FilterTab, boolean> = {
    frame: tempFrame !== 'all' && !!tempFrame,
    price: !!tempMinPrice.trim() || !!tempMaxPrice.trim(),
    brand: tempBrand !== 'all',
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          ]}
        >
          <TouchableOpacity
            style={[styles.footerBtn, styles.resetBtn]}
            onPress={onReset}
            activeOpacity={0.8}
          >
            <AppText style={styles.resetText}>{t('commonReset')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.applyBtn]}
            onPress={onApply}
            activeOpacity={0.85}
          >
            <AppText style={styles.applyText}>{t('commonApply')}</AppText>
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, onApply, onReset, t],
  );

  const renderChip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
    >
      {active && (
        <Ionicons name="checkmark" size={14} color={Colors.primary} />
      )}
      <AppText style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={() => {
        // Dragged down or backdrop tapped: tell the parent it's closed.
        if (visible) onClose();
      }}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
    >
      <View style={styles.header}>
        <AppText style={styles.title}>{t('filterProductsTitle')}</AppText>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={Colors.gray600} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map(item => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(item.key)}
              activeOpacity={0.8}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>
                {t(item.labelKey)}
              </AppText>
              {isSet[item.key] && <View style={styles.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {tab === 'frame' && (
          <View style={styles.chipsWrap}>
            {frameOptions.map(item =>
              renderChip(
                item.value,
                t(item.label),
                tempFrame === item.value,
                () => setTempFrame(item.value),
              ),
            )}
          </View>
        )}

        {tab === 'brand' && (
          <View style={styles.chipsWrap}>
            {brandTabs.map(item => {
              const value = item.id === 'all' ? 'all' : Number(item.id);
              return renderChip(
                String(item.id),
                t(item.name),
                tempBrand === value,
                () => setTempBrand(value),
              );
            })}
          </View>
        )}

        {tab === 'price' && (
          <>
            <View style={styles.chipsWrap}>
              {PRICE_PRESETS.map(preset =>
                renderChip(
                  preset.label,
                  preset.label === 'under-100'
                    ? t('PriceUnder', { amount: '$100' })
                    : preset.label,
                  tempMinPrice === preset.min && tempMaxPrice === preset.max,
                  () => {
                    setTempMinPrice(preset.min);
                    setTempMaxPrice(preset.max);
                  },
                ),
              )}
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <AppText style={styles.priceLabel}>
                  {t('filterMinPrice')}
                </AppText>
                <View style={styles.priceInputWrap}>
                  <AppText style={styles.currency}>$</AppText>
                  <BottomSheetTextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor={Colors.gray400}
                    keyboardType="number-pad"
                    value={tempMinPrice}
                    onChangeText={setTempMinPrice}
                  />
                </View>
              </View>

              <View style={styles.priceDash} />

              <View style={styles.priceField}>
                <AppText style={styles.priceLabel}>
                  {t('filterMaxPrice')}
                </AppText>
                <View style={styles.priceInputWrap}>
                  <AppText style={styles.currency}>$</AppText>
                  <BottomSheetTextInput
                    style={styles.priceInput}
                    placeholder="500"
                    placeholderTextColor={Colors.gray400}
                    keyboardType="number-pad"
                    value={tempMaxPrice}
                    onChangeText={setTempMaxPrice}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

// Room under the scroll content so the last chips clear the pinned footer.
const FOOTER_SPACE = 96;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: Colors.gray300,
    width: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: FOOTER_SPACE,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    alignItems: 'flex-end',
    marginTop: Spacing.lg,
  },
  priceField: {
    flex: 1,
  },
  priceLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    marginBottom: 6,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
  },
  currency: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.gray400,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.black,
    paddingVertical: 0,
  },
  priceDash: {
    width: 12,
    height: 2,
    marginHorizontal: Spacing.sm,
    marginBottom: 23,
    backgroundColor: Colors.gray300,
  },

  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  footerBtn: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    backgroundColor: Colors.gray100,
  },
  resetText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.gray600,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
  },
  applyText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default FilterModal;
