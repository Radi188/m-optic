import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';

import { useTranslation } from 'react-i18next';

const fontFamilyMap = {
  km: {
    400: 'Hanuman-Regular',
    500: 'Hanuman-Medium',
    600: 'Hanuman-SemiBold',
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

const getFont = (language: string, weight?: TextStyle['fontWeight']) => {
  const lang = language === 'km' ? 'km' : 'en';

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

  const fontFamily = getFont(i18n.language, flattenStyle.fontWeight);

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
