import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';
import AppText from '../../AppText';

type ErrorComponentProps = {
  message?: string;
  onRetry?: () => void;
  headerTitle?: string;
};

const ErrorComponent: React.FC<ErrorComponentProps> = ({
  message = 'Something went wrong. Please try again.',
  onRetry,
  headerTitle = 'Connection Error',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.contentBox}>
        {/* Soft, Modern Icon Container */}

        <Image
          source={require('../../../assets/images/error.png')}
          style={styles.errorImage}
        />

        {/* Text Content */}
        <AppText style={styles.header}>{headerTitle}</AppText>
        <AppText style={styles.message}>{message}</AppText>

        {/* Clean, Actionable Retry Button */}
        {onRetry && (
          <TouchableOpacity
            style={styles.button}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <AppText style={styles.buttonText}>Try Again</AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ErrorComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  contentBox: {
    alignItems: 'center',
    maxWidth: 320, // Prevents text from stretching too wide on tablet screens
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.errorLight || '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  errorImage: {
    width: 122,
    height: 122,
    resizeMode: 'cover',
  },
  header: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary || '#1A1A1A',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: FontSize.md,
    fontWeight: '400',
    color: Colors.textSecondary || '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary || '#1A1A1A', // Using your primary brand color looks much cleaner
    borderRadius: 12, // Modern slight curve rather than a harsh pill shape
    width: '100%', // Makes the tap target predictable and professional
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
