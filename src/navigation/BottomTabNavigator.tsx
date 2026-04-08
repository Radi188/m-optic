import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import HomeScreen    from '../screens/HomeScreen';
import GlassScreen   from '../screens/GlassScreen';
import ReportScreen  from '../screens/ReportScreen';
import StoreScreen   from '../screens/StoreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { BottomTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<
  keyof BottomTabParamList,
  { icon: IoniconsName; iconActive: IoniconsName; label: string }
> = {
  Home:    { icon: 'home-outline',          iconActive: 'home',          label: 'Home' },
  Glass:   { icon: 'glasses-outline',       iconActive: 'glasses',       label: 'Glass' },
  Report:  { icon: 'bar-chart-outline',     iconActive: 'bar-chart',     label: 'Reports' },
  Store:   { icon: 'storefront-outline',    iconActive: 'storefront',    label: 'Store' },
  Profile: { icon: 'person-circle-outline', iconActive: 'person-circle', label: 'Profile' },
};

// ─── Animated Tab Item ────────────────────────────────────────────────────

interface TabItemProps {
  route: any;
  index: number;
  isFocused: boolean;
  cfg: typeof TAB_CONFIG[keyof typeof TAB_CONFIG];
  onPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ isFocused, cfg, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
      bounciness: 10,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 14,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Active pill background */}
        {isFocused && (
          <View style={styles.activePill}>
            {/* Pill specular */}
            <View style={styles.pillHighlight} pointerEvents="none" />
          </View>
        )}

        <Ionicons
          name={isFocused ? cfg.iconActive : cfg.icon}
          size={21}
          color={isFocused ? Colors.primary : Colors.tabBarInactive}
        />

        <Text
          style={[
            styles.tabLabel,
            isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
          numberOfLines={1}
        >
          {cfg.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Custom Tab Bar ────────────────────────────────────────────────────────

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {/* Bar top specular highlight */}
        <View style={styles.barHighlight} pointerEvents="none" />

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
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              cfg={cfg}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

// ─── Navigator ────────────────────────────────────────────────────────────

const BottomTabNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home"    component={HomeScreen} />
    <Tab.Screen name="Glass"   component={GlassScreen} />
    <Tab.Screen name="Report"  component={ReportScreen} />
    <Tab.Screen name="Store"   component={StoreScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  barWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.tabBar,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  barHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: Colors.glassHighlight,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    position: 'relative',
    minWidth: 52,
    minHeight: 48,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    overflow: 'hidden',
  },
  pillHighlight: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive:   { color: Colors.tabBarActive },
  tabLabelInactive: { color: Colors.tabBarInactive },
});

export default BottomTabNavigator;
