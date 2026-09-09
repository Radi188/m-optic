import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import { selectUser } from '../../../store/slices/authSlice';
import type { RootStackParamList } from '../../../types/navigation';
import AppText from '../../AppText';

type HomeHeaderProps = {
  signinLabel: string;
};

/**
 * The home tab's fixed header.
 *
 * Pinned above the scroll view rather than scrolling with the content, so the
 * brand and the Sign In button stay reachable. The app's status bar is
 * translucent (see App.tsx), which means content draws underneath it: the
 * header pads itself by the top inset and paints an opaque background across
 * that strip, so nothing scrolls into the clock and battery icons.
 */
const HomeHeader: React.FC<HomeHeaderProps> = ({ signinLabel }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <AppText style={styles.brandName}>M Optic</AppText>
      </View>

      {user ? (
        <View style={styles.avatarWrap}>
          <AppText style={styles.avatarText}>
            {user.name
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AppText>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.signInBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons name="person-outline" size={14} color={Colors.white} />
          <AppText style={styles.signInText}>{signinLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default HomeHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    // Opaque: the strip behind the status bar has to hide the content
    // scrolling under it.
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42,22,10,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  signInText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
