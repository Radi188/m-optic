import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing } from '../theme';

type SupportOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

const faqItems: FAQItem[] = [
  {
    id: 'order',
    question: 'How can I check my order status?',
    answer:
      'You can check your latest order status from your profile or order history section.',
  },
  {
    id: 'appointment',
    question: 'Can I book an eye test appointment?',
    answer:
      'Yes, you can book an appointment from the app and visit the nearest store.',
  },
  {
    id: 'glassesReady',
    question: 'How do I know when my glasses are ready?',
    answer:
      'You will receive a notification when your glasses are ready for pickup.',
  },
  {
    id: 'support',
    question: 'How can I contact support?',
    answer: 'You can contact us by phone, Telegram, email, or visit our store.',
  },
];

const SupportScreen = () => {
  const navigation = useNavigation();

  const supportOptions: SupportOption[] = [
    {
      id: 'call',
      title: 'Call Support',
      subtitle: 'Speak directly with our team',
      icon: 'call-outline',
      onPress: () => Linking.openURL('tel:+85512345678'),
    },
    {
      id: 'telegram',
      title: 'Telegram',
      subtitle: 'Chat with us on Telegram',
      icon: 'paper-plane-outline',
      onPress: () => Linking.openURL('https://t.me/yourtelegram'),
    },
    {
      id: 'email',
      title: 'Email Support',
      subtitle: 'Send us your question by email',
      icon: 'mail-outline',
      onPress: () => Linking.openURL('mailto:support@example.com'),
    },
    {
      id: 'location',
      title: 'Store Location',
      subtitle: 'Find our nearest store',
      icon: 'location-outline',
      onPress: () => Linking.openURL('https://maps.google.com'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.appHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Support</Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconBox}>
              <Ionicons
                name="headset-outline"
                size={30}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.heroTitle}>How can we help you?</Text>
            <Text style={styles.heroSubtitle}>
              Get help with orders, appointments, glasses pickup, and app
              support.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Contact Support</Text>

          <View style={styles.card}>
            {supportOptions.map((item, index) => {
              const isLast = index === supportOptions.length - 1;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, isLast && styles.lastItem]}
                  activeOpacity={0.85}
                  onPress={item.onPress}
                >
                  <View style={styles.iconBox}>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.textWrap}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.gray500}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqCard}>
            {faqItems.map((item, index) => {
              const isLast = index === faqItems.length - 1;

              return (
                <View
                  key={item.id}
                  style={[styles.faqItem, isLast && styles.lastItem]}
                >
                  <Text style={styles.question}>{item.question}</Text>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              );
            })}
          </View> */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SupportScreen;

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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FAF7F5',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  headerRightPlaceholder: {
    width: 42,
    height: 42,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  heroIconBox: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE8',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textWrap: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 18,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    overflow: 'hidden',
  },
  faqItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE8',
  },
  question: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  answer: {
    marginTop: 6,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
});
