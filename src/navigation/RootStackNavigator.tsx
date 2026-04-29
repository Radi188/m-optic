import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import { selectIsAuthenticated } from '../store/slices/authSlice';
import BottomTabNavigator from './BottomTabNavigator';
import GlassDetailScreen from '../screens/GlassDetailScreen';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootStackNavigator: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        // ── Authenticated stack — first screen is Main ──────────
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen
            name="GlassDetail"
            component={GlassDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        // ── Unauthenticated stack — Splash → Main, Login reachable from Profile
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootStackNavigator;
