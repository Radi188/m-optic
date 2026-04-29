import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Provider, useDispatch } from 'react-redux';

import { store, persistor } from './src/store';
import type { AppDispatch } from './src/store';
import { PersistGate } from 'redux-persist/integration/react';
import RootStackNavigator from './src/navigation/RootStackNavigator';
import { Colors } from './src/theme';
import { bootstrapFirebaseMessaging, setupForegroundNotificationListener } from './src/services/firebase/messaging';

// ─── Inner app: has access to the Redux store ─────────────────────────────────

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let unsubscribeForeground: () => void = () => {};

    // Bootstrap must finish before we attach the foreground listener so that
    // the native Firebase module is guaranteed to be ready.
    bootstrapFirebaseMessaging(dispatch).then(() => {
      unsubscribeForeground = setupForegroundNotificationListener(dispatch);
    }).catch(err => {
      console.warn('[App] Firebase setup error:', err);
    });

    return () => {
      unsubscribeForeground();
    };
  }, [dispatch]);

  return (
    <NavigationContainer>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <RootStackNavigator />
    </NavigationContainer>
  );
};

// ─── Root: provides the Redux store ──────────────────────────────────────────

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.primary }}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <AppInner />
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}

export default App;
