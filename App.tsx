import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from './src/store';
import type { AppDispatch } from './src/store';

import RootStackNavigator from './src/navigation/RootStackNavigator';
import { Colors } from './src/theme';

import {
  bootstrapFirebaseMessaging,
  setupForegroundNotificationListener,
} from './src/services/firebase/messaging';

import { initializeLanguage } from './src/localizations/i18n';

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let unsubscribeForeground: () => void = () => {};
    let isMounted = true;

    const initializeFirebase = async () => {
      try {
        await bootstrapFirebaseMessaging(dispatch);

        if (isMounted) {
          unsubscribeForeground = setupForegroundNotificationListener(dispatch);
        }
      } catch (error) {
        console.warn('[App] Firebase setup error:', error);
      }
    };

    initializeFirebase();

    return () => {
      isMounted = false;
      unsubscribeForeground();
    };
  }, [dispatch]);

  return (
    <NavigationContainer>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <RootStackNavigator />
    </NavigationContainer>
  );
};

// ─── Root app ────────────────────────────────────────────────

function App(): React.JSX.Element {
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const prepareLocalization = async () => {
      try {
        await initializeLanguage();
      } finally {
        if (isMounted) {
          setLanguageReady(true);
        }
      }
    };

    prepareLocalization();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!languageReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={styles.root}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});

export default App;
