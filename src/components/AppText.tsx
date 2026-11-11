import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';

import { useTranslation } from 'react-i18next';

import { hasKhmer } from '../utils/khmer';

const fontFamilyMap = {
  // Only Regular and Bold ship (android/app/src/main/assets/fonts, iOS
  // Info.plist). The Medium/SemiBold names did not exist, so 500/600 Khmer
  // text fell back to the system font.
  km: {
    400: 'Hanuman-Regular',
    500: 'Hanuman-Regular',
    600: 'Hanuman-Bold',
    700: 'Hanuman-Bold',
  },

  en: {
    400: 'DMSans-Regular',
    500: 'DMSans-Regular',
    600: 'DMSans-Bold',
    700: 'DMSans-Bold',
  },
};

const normalizeWeight = (weight?: TextStyle['fontWeight']): number => {
  if (weight === 'bold') {
    return 700;
  }

  if (typeof weight === 'number') {
    return weight >= 800 ? 700 : weight;
  }

  const value = Number(weight);

  if (isNaN(value)) {
    return 400;
  }

  // Khmer font only has 700
  if (value >= 800) {
    return 700;
  }

  return value;
};

const getFont = (lang: 'km' | 'en', weight?: TextStyle['fontWeight']) => {

  const fontWeight = normalizeWeight(weight);

  return (
    fontFamilyMap[lang][
      fontWeight as keyof (typeof fontFamilyMap)[typeof lang]
    ] || fontFamilyMap[lang][400]
  );
};

export default function AppText({ style, ...props }: TextProps) {
  const { i18n } = useTranslation();

  const flattenStyle = StyleSheet.flatten(style) || {};

  // Khmer text gets the Khmer font even when the app is in English (product
  // names, announcements). DM Sans has no Khmer, so Android mixed a fallback
  // Khmer font with DM Sans in one line, on different baselines.
  const lang =
    i18n.language === 'km' || hasKhmer(props.children) ? 'km' : 'en';
  const fontFamily = getFont(lang, flattenStyle.fontWeight);

  return (
    <Text
      {...props}
      style={[
        styles.text,

        {
          fontFamily,
        },

        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,

    textAlignVertical: 'center',
  },
});
