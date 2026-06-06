import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type LogoutModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
};

const LogoutModal: React.FC<LogoutModalProps> = ({
  visible,
  onClose,
  onConfirmLogout,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);

      scaleAnim.setValue(0.94);
      opacityAnim.setValue(0);
      translateYAnim.setValue(16);

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 16,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, scaleAnim, opacityAnim, translateYAnim]);

  const handleLogout = () => {
    onConfirmLogout();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View
            style={[
              styles.modalBox,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: translateYAnim },
                ],
              },
            ]}
          >
            <Pressable>
              <View style={styles.topAccent} />

              <View style={styles.iconOuter}>
                <View style={styles.iconInner}>
                  <Ionicons name="log-out-outline" size={30} color="#C2410C" />
                </View>
              </View>

              <Text style={styles.title}>Sign out?</Text>

              <Text style={styles.message}>
                You will need to sign in again to access your account and saved
                information.
              </Text>

              <View style={styles.warningBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#C2410C"
                />

                <Text style={styles.warningText}>
                  Make sure your latest changes are saved before signing out.
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.85}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>Stay Logged In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutButton}
                  activeOpacity={0.85}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

export default LogoutModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 15, 12, 0.42)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: 30,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 14,
    },
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
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  iconInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFEDD5',
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
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: Spacing.md,
  },
  warningText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    color: '#9A3412',
    lineHeight: 19,
    fontWeight: '600',
  },
  buttonRow: {
    width: '100%',
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
  logoutButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2410C',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 4,
  },
  cancelText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.black,
  },
  logoutText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.white,
  },
});
