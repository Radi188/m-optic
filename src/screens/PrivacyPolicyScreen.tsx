import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing } from '../theme';
import AppText from '../components/AppText';

const PRIVACY_POLICY_URL = 'https://crosscambodia.com/en/privacy-policy';

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.appHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={23} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <AppText style={styles.headerTitle}>{t('PrivacyPolicy')}</AppText>
            <AppText style={styles.headerSubtitle}>
              {t('DataAndSecurity')}
            </AppText>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.webViewWrap}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <AppText style={styles.loadingText}>{t('LoadingPolicy')}</AppText>
            </View>
          ) : null}

          <WebView
            source={{ uri: PRIVACY_POLICY_URL }}
            style={styles.webView}
            startInLoadingState
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },

  appHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FAF7F5',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  webViewWrap: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 6,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
  },
});
