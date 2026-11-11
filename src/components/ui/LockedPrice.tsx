import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../theme';
import AppText from '../AppText';

type Props = {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Icon size; the text size comes from `textStyle`. */
  iconSize?: number;
};

/**
 * What a signed-out visitor sees instead of a price: a lock and "Log in to see
 * price". Tapping it opens the Login screen. Outside a navigator (e.g. content
 * portalled out of the navigation tree) it is shown without the tap.
 */
const LockedPrice: React.FC<Props> = ({ style, textStyle, iconSize = 12 }) => {
  const { t } = useTranslation();
  const navigation = useContext(NavigationContext);
  const label = t('LoginToSeePrice');

  const content = (
    <View style={[styles.row, style]}>
      <Ionicons name="lock-closed" size={iconSize} color={Colors.primary} />
      <AppText style={[styles.text, textStyle]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );

  if (!navigation) return content;
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Login' as never)}
      activeOpacity={0.7}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </TouchableOpacity>
  );
};

export default LockedPrice;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  text: { fontSize: 12, fontWeight: '700', color: Colors.primary, flexShrink: 1 },
});
