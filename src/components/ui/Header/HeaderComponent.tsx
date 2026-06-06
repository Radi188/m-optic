import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing } from '../../../theme';

type HeaderProps = {
  title: string;
  onBack?: () => void;
  rightIconName?: string;
  onRightPress?: () => void;
  style?: ViewStyle;
};

const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  rightIconName,
  onRightPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onBack}
        style={styles.iconButton}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.black} />
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      {rightIconName ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRightPress}
          style={styles.iconButton}
        >
          <Ionicons name={rightIconName} size={22} color={Colors.black} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E7E3',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE7E1',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
});
