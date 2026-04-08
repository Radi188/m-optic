import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import RNBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../../theme';

export { BottomSheetModalProvider };

// ─── Persistent BottomSheet ───────────────────────────────────────────────

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  snapPoints?: (string | number)[];
  onClose?: () => void;
}

const BottomSheet = forwardRef<RNBottomSheet, BottomSheetProps>(
  ({ children, title, snapPoints: snapPointsProp, onClose }, ref) => {
    const snapPoints = useMemo(
      () => snapPointsProp ?? ['40%', '75%'],
      [snapPointsProp],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.50}
        />
      ),
      [],
    );

    return (
      <RNBottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.indicator}
        backgroundStyle={styles.background}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                  <View style={styles.closeInner}>
                    <Text style={styles.closeText}>✕</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
          {children}
        </BottomSheetScrollView>
      </RNBottomSheet>
    );
  },
);

// ─── Modal BottomSheet ────────────────────────────────────────────────────

interface BottomSheetModalProps {
  children: React.ReactNode;
  title?: string;
  snapPoints?: (string | number)[];
}

export const AppBottomSheetModal = forwardRef<BottomSheetModal, BottomSheetModalProps>(
  ({ children, title, snapPoints: snapPointsProp }, ref) => {
    const snapPoints = useMemo(
      () => snapPointsProp ?? ['50%', '85%'],
      [snapPointsProp],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.50}
        />
      ),
      [],
    );

    const handleDismiss = useCallback(() => {
      if (ref && 'current' in ref) {
        ref.current?.dismiss();
      }
    }, [ref]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.indicator}
        backgroundStyle={styles.background}
        enablePanDownToClose
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} hitSlop={8}>
                <View style={styles.closeInner}>
                  <Text style={styles.closeText}>✕</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          {children}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderTopLeftRadius:  BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    ...Shadow.lg,
  },
  indicator: {
    backgroundColor: Colors.gray300,
    width: 36,
    height: 4,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  closeBtn: {},
  closeInner: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassSurfaceMid,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 10, color: Colors.gray600, fontWeight: '800' },
});

export default BottomSheet;
