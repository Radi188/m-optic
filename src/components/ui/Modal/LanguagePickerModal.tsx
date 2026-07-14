import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  ImageSourcePropType,
  Animated,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';
import type { AppLanguage } from '../../../localizations/i18n';
import AppText from '../../AppText';

type Language = {
  code: string;
  label: string;
  nativeLabel: string;
  flag: ImageSourcePropType;
};

type LanguagePickerModalProps = {
  visible: boolean;
  selectedLanguage: AppLanguage;
  onClose: () => void;
  onSelectLanguage: (languageCode: AppLanguage) => Promise<void> | void;
  title: string;
  subtitle: string;
};

const languages: Language[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: require('../../../assets/images/en.png'),
  },
  {
    code: 'km',
    label: 'Khmer',
    nativeLabel: 'ភាសាខ្មែរ',
    flag: require('../../../assets/images/kh.png'),
  },
];

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  visible,
  selectedLanguage,
  onClose,
  onSelectLanguage,
  title,
  subtitle,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const slideAnim = useRef(new Animated.Value(350)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      slideAnim.setValue(350);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 350,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, slideAnim]);

  const handleSelectLanguage = async (languageCode: AppLanguage) => {
    try {
      await onSelectLanguage(languageCode);
      onClose();
    } catch (error) {
      console.warn('[LanguagePicker] Could not change language:', error);
    }
  };

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalBox,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable>
            <View style={styles.header}>
              <View>
                <AppText style={styles.title}>{title}</AppText>
                <AppText style={styles.subtitle}>{subtitle}</AppText>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Ionicons name="close" size={22} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {languages.map(language => {
                const isSelected = selectedLanguage === language.code;

                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageItem,
                      isSelected && styles.selectedLanguageItem,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSelectLanguage(language.code)}
                  >
                    <View style={styles.flagBox}>
                      <Image
                        source={language.flag}
                        style={styles.flagImage}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={styles.languageTextWrap}>
                      <AppText style={styles.languageLabel}>
                        {language.label}
                      </AppText>
                      <AppText style={styles.languageNativeLabel}>
                        {language.nativeLabel}
                      </AppText>
                    </View>

                    {isSelected ? (
                      <View style={styles.checkBox}>
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={Colors.white}
                        />
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={Colors.gray500}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default LanguagePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    // paddingHorizontal: Spacing.lg,
    // paddingBottom: Spacing.lg,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageList: {
    gap: Spacing.sm,
  },
  languageItem: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    backgroundColor: '#FBF8F6',
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },
  selectedLanguageItem: {
    backgroundColor: '#F6EEE8',
    borderColor: Colors.primary,
  },
  flagBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },
  flagImage: {
    width: 44,
    height: 44,
  },
  languageTextWrap: {
    flex: 1,
  },
  languageLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  languageNativeLabel: {
    marginTop: 3,
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
