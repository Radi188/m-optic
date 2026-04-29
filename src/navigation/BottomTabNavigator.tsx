import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import HomeScreen    from '../screens/HomeScreen';
import GlassScreen   from '../screens/GlassScreen';
import ScanScreen    from '../screens/ScanScreen';
import StoreScreen   from '../screens/StoreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors, FontSize } from '../theme';
import type { BottomTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<
  keyof BottomTabParamList,
  { icon: IoniconsName; iconActive: IoniconsName; label: string }
> = {
  Home:    { icon: 'home-outline',          iconActive: 'home',          label: 'Home' },
  Glass:   { icon: 'glasses-outline',       iconActive: 'glasses',       label: 'Glass' },
  Scan:    { icon: 'scan-outline',           iconActive: 'scan-circle',   label: 'Scan' },
  Store:   { icon: 'storefront-outline',    iconActive: 'storefront',    label: 'Store' },
  Profile: { icon: 'person-circle-outline', iconActive: 'person-circle', label: 'Profile' },
};

// ─── Tab Item ─────────────────────────────────────────────────────────────────

interface TabItemProps {
  isFocused: boolean;
  cfg: typeof TAB_CONFIG[keyof typeof TAB_CONFIG];
  onPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ isFocused, cfg, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 12,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        {/* Top indicator line */}
        <View style={[styles.indicator, isFocused && styles.indicatorActive]} />

        <Ionicons
          name={isFocused ? cfg.iconActive : cfg.icon}
          size={22}
          color={isFocused ? Colors.primary : Colors.tabBarInactive}
        />
        <Text
          style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}
          numberOfLines={1}
        >
          {cfg.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Top separator */}
      <View style={styles.separator} />

      {/* Tabs row */}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name as keyof BottomTabParamList];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem key={route.key} isFocused={isFocused} cfg={cfg} onPress={onPress} />
          );
        })}
      </View>
    </View>
  );
};

// ─── Navigator ────────────────────────────────────────────────────────────────

export const TAB_BAR_HEIGHT = 64;

const BottomTabNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home"    component={HomeScreen} />
    <Tab.Screen name="Glass"   component={GlassScreen} />
    <Tab.Screen name="Scan"    component={ScanScreen} />
    <Tab.Screen name="Store"   component={StoreScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(252, 246, 242, 0.97)',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  row: {
    flexDirection: 'row',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    gap: 3,
    width: '100%',
  },

  // Indicator — short pill at the very top of the tab
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: Colors.primary,
  },

  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelActive:   { color: Colors.primary },
  labelInactive: { color: Colors.tabBarInactive },
});

export default BottomTabNavigator;
