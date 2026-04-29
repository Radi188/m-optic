import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const exitAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(exitAnim, { toValue: 0, duration: 420, useNativeDriver: true }).start(() => {
        navigation.replace('Main');
      });
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatedGradient
      colors={[Colors.primary, Colors.primaryMid, Colors.background]}
      locations={[0, 0.42, 1]}
      style={[styles.root, { opacity: exitAnim }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Center content */}
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Image
            source={require('../assets/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <Text style={styles.brand}>M·OPTIC</Text>
          <Text style={styles.tagline}>See the world differently</Text>
        </Animated.View>
      </View>

      {/* Footer dots */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.footerDot} />
        <View style={[styles.footerDot, styles.footerDotActive]} />
        <View style={styles.footerDot} />
      </Animated.View>
    </AnimatedGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    alignItems: 'center',
    gap: 24,
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },

  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 6,
    textAlign: 'center',
  },
  tagline: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },

  footer: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  footerDotActive: {
    width: 18,
    backgroundColor: Colors.white,
  },
});

export default SplashScreen;
