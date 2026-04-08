import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';
import GlassDetailScreen from '../screens/GlassDetailScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main" component={BottomTabNavigator} />
    <Stack.Screen
      name="GlassDetail"
      component={GlassDetailScreen}
      options={{ animation: 'slide_from_right' }}
    />
  </Stack.Navigator>
);

export default RootStackNavigator;
