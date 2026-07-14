import Ionicons from '@react-native-vector-icons/ionicons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Spacing } from '../../../theme';
import AppText from '../../AppText';

type RewardButtonProps = {
  title?: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

const RewardButton: React.FC<RewardButtonProps> = ({
  title = 'Rewards',
  subtitle = 'Redeem your points for exclusive discounts and gifts',
  icon = 'gift-outline',
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.rewardPreviewCard, style]}
      onPress={onPress}
    >
      <View style={styles.rewardPreviewLeft}>
        <View style={styles.rewardIconBox}>
          <Ionicons name={icon as any} size={22} color="#9B6A3D" />
        </View>

        <View style={styles.rewardTextBox}>
          <AppText style={styles.rewardPreviewTitle}>{title}</AppText>
          <AppText style={styles.rewardPreviewSubtitle} numberOfLines={2}>
            {subtitle}
          </AppText>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#A39186" />
    </TouchableOpacity>
  );
};

export default RewardButton;

const styles = StyleSheet.create({
  rewardPreviewCard: {
    minHeight: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#2A160A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,

    marginTop: Spacing.md,
  },

  rewardPreviewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  rewardTextBox: {
    flex: 1,
  },

  rewardPreviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#241812',
    letterSpacing: -0.2,
  },

  rewardPreviewSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#8B7C72',
  },
});
