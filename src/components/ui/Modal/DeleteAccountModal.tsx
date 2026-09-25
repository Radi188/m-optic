import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing } from '../../../theme';
import AppText from '../../AppText';

type DeleteAccountModalProps = {
  visible: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmDelete: () => void;
};

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  loading = false,
  error,
  onClose,
  onConfirmDelete,
}) => {
  const { t } = useTranslation();

  // Block dismissal while the request is in flight so the user can't leave
  // the screen in a half-deleted state.
  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.modalBox}>
          <View style={styles.topAccent} />

          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="trash-outline" size={30} color="#D92D20" />
            </View>
          </View>

          <AppText style={styles.title}>{t('DeleteAccountQuestion')}</AppText>

          <AppText style={styles.message}>{t('DeleteAccountMessage')}</AppText>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color="#B42318" />
            <AppText style={styles.warningText}>
              {t('DeleteAccountWarning')}
            </AppText>
          </View>

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.85}
              onPress={handleClose}
              disabled={loading}
            >
              <AppText style={styles.cancelText}>{t('Cancel')}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.disabled]}
              activeOpacity={0.85}
              onPress={onConfirmDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <AppText style={styles.deleteText}>
                  {t('DeletePermanently')}
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default DeleteAccountModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(20, 15, 12, 0.42)',
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: 30,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  topAccent: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E8D8CF',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  iconOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FEF3F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECDCA',
  },
  iconInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: Spacing.sm,
  },
  warningBox: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3F2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECDCA',
    padding: Spacing.md,
  },
  warningText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    color: '#B42318',
    lineHeight: 19,
    fontWeight: '600',
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: '#D92D20',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F7F1EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE2DC',
  },
  deleteButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#D92D20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.black,
  },
  deleteText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.white,
  },
});
