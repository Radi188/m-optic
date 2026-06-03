import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type ChangePhotoModalProps = {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imagePath: string) => void;
  onRemovePhoto?: () => void;
};

const ChangePhotoModal: React.FC<ChangePhotoModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  onRemovePhoto,
}) => {
  const openCamera = async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.85,
        mediaType: 'photo',
      });

      onImageSelected(image.path);
      onClose();
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Camera Error', 'Unable to open camera.');
      }
    }
  };

  const openGallery = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.85,
        mediaType: 'photo',
      });

      onImageSelected(image.path);
      onClose();
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Gallery Error', 'Unable to open gallery.');
      }
    }
  };

  const handleRemovePhoto = () => {
    onRemovePhoto?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="camera-outline"
                size={24}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.title}>Change Photo</Text>
            <Text style={styles.subtitle}>
              Take a new photo or choose one from your gallery. You can crop it
              before saving.
            </Text>
          </View>

          <View style={styles.actionList}>
            <PhotoAction
              icon="camera-outline"
              title="Take Photo"
              subtitle="Open camera and edit"
              onPress={openCamera}
            />

            <PhotoAction
              icon="image-outline"
              title="Choose from Gallery"
              subtitle="Select photo and crop"
              onPress={openGallery}
            />

            {/* <PhotoAction
              icon="trash-outline"
              title="Remove Photo"
              subtitle="Use default profile icon"
              danger
              onPress={handleRemovePhoto}
            /> */}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.88}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

type PhotoActionProps = {
  icon: string;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
};

const PhotoAction: React.FC<PhotoActionProps> = ({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.actionItem}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Ionicons
          name={icon as any}
          size={21}
          color={danger ? '#D64545' : Colors.primary}
        />
      </View>

      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>
          {title}
        </Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={18}
        color={Colors.gray500}
      />
    </TouchableOpacity>
  );
};

export default ChangePhotoModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 30,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    borderWidth: 1,
    borderColor: '#EFE5E0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,

    elevation: 12,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E8DCD6',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionList: {
    gap: 10,
  },
  actionItem: {
    minHeight: 70,
    borderRadius: 20,
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#F0E7E3',
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionIconDanger: {
    backgroundColor: '#FFF1F1',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.black,
  },
  actionTitleDanger: {
    color: '#D64545',
  },
  actionSubtitle: {
    marginTop: 3,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
  },
  cancelButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.white,
  },
});
