import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import km from './locales/km.json';

export type AppLanguage = 'en' | 'km';

const LANGUAGE_STORAGE_KEY = '@app_language';

const supportedLanguages: AppLanguage[] = ['en', 'km'];

const resources = {
  en: {
    translation: en,
  },
  km: {
    translation: km,
  },
};

const isSupportedLanguage = (
  language: string | null,
): language is AppLanguage => {
  return (
    language !== null &&
    supportedLanguages.includes(language as AppLanguage)
  );
};

export const initializeLanguage = async (): Promise<void> => {
  let initialLanguage: AppLanguage = 'en';

  try {
    const savedLanguage = await AsyncStorage.getItem(
      LANGUAGE_STORAGE_KEY,
    );

    if (isSupportedLanguage(savedLanguage)) {
      initialLanguage = savedLanguage;
    }
  } catch (error) {
    console.warn(
      '[Localization] Could not read saved language:',
      error,
    );
  }

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      supportedLngs: supportedLanguages,

      interpolation: {
        escapeValue: false,
      },

      react: {
        useSuspense: false,
      },

      returnNull: false,
    });

    return;
  }

  await i18n.changeLanguage(initialLanguage);
};

export const changeAppLanguage = async (
  language: AppLanguage,
): Promise<void> => {
  if (!supportedLanguages.includes(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }

  if (!i18n.isInitialized) {
    await initializeLanguage();
  }

  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export default i18n;