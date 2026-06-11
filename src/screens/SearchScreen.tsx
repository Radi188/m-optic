import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { GlassBackground } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const popularSearches = ['Round', 'Square', 'Rimless', 'Boston', 'Oval'];

const SearchScreen = () => {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  const handleSearch = (text?: string) => {
    const searchText = (text || query).trim();

    if (!searchText) return;

    Keyboard.dismiss();

    navigation.navigate('SearchResult', {
      query: searchText,
    });
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={Colors.gray400} />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search frames..."
              placeholderTextColor={Colors.gray400}
              style={styles.input}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => handleSearch()}
            />

            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.gray400}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Popular searches</Text>

          <View style={styles.chipWrap}>
            {popularSearches.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.chip}
                activeOpacity={0.8}
                onPress={() => handleSearch(item)}
              >
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.sm,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadow.sm,
  },

  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },

  input: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '600',
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },

  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
  },

  subtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
  },

  sectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },

  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
