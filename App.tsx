import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';

import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from './src/store';
import type { AppDispatch } from './src/store';

import RootStackNavigator from './src/navigation/RootStackNavigator';
import type { RootStackParamList } from './src/types/navigation';
import { setUnauthorizedHandler } from './src/services/api';
import { clearUser, selectUser } from './src/store/slices/authSlice';
import { Colors } from './src/theme';

import {
  bootstrapFirebaseMessaging,
  setupForegroundNotificationListener,
} from './src/services/firebase/messaging';

import { initializeLanguage } from './src/localizations/i18n';
import ForceUpdateGate from './src/components/ForceUpdateGate';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { posthog } from './src/config/posthog';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Keeps the persisted PostHog client aligned with the authenticated account.
 * This boundary runs when auth is established (including a restored session),
 * rather than at individual event or error call sites.
 */
const PostHogIdentity: React.FC = () => {
  const posthogClient = usePostHog();
  const user = useSelector(selectUser);
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;

    if (previousUserId.current && previousUserId.current !== userId) {
      posthogClient.reset();
    }

    if (user) {
      posthogClient.identify(user.id, {
        ...(user.email ? { email: user.email } : {}),
        ...(user.name ? { name: user.name } : {}),
        role: user.role,
        ...(user.customerType ? { customer_type: user.customerType } : {}),
        is_member: user.isMember,
      });
    }

    previousUserId.current = userId;
  }, [posthogClient, user]);

  return <RootStackNavigator />;
};

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // A 401 on a signed-in request means the session is over (token expired or
  // revoked): api.ts has already dropped the token; forget the account and
  // send the customer to log in again.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(clearUser());
      // Wait a tick for the navigator to swap to the guest stack, which is
      // the one that has Login.
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 1,
            routes: [{ name: 'Main' }, { name: 'Login' }],
          });
        }
      }, 0);
    });
    return () => setUnauthorizedHandler(null);
  }, [dispatch]);

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

  // React Navigation 7 is not autocaptured by PostHog, so screen views are
  // sent from here. Only the route name goes out — params can carry whole
  // objects (an invoice, a product) that do not belong in analytics.
  const lastScreen = useRef<string | undefined>(undefined);
  const trackScreen = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name && name !== lastScreen.current) {
      posthog?.screen(name);
      lastScreen.current = name;
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={trackScreen}
      onStateChange={trackScreen}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {posthog ? (
        <PostHogProvider
          client={posthog}
          // Screens are tracked above; the built-in tracker does not work
          // with React Navigation 7.
          autocapture={{ captureScreens: false, captureTouches: false }}
        >
          <PostHogIdentity />
        </PostHogProvider>
      ) : (
        <RootStackNavigator />
      )}
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
              <ForceUpdateGate>
                <AppInner />
              </ForceUpdateGate>
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
