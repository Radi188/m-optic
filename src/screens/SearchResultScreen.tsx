import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  TextInput,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { GlassBackground } from '../components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { RootStackParamList } from '../types/navigation';

import GlassCard from '../components/ui/GlassesCard/GlassesCard';
import GlassScreenSkeleton from '../components/ui/Loading/loadingGlassesScreen';
import { useProductList } from '../hook/useProductList';
import { Product } from '../types/glasses';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<
  RootStackParamList,
  'SearchResult'
>['route'];

const { width } = Dimensions.get('window');
const CARD_GAP = Spacing.xs;
const CARD_WIDTH = (width - Spacing.lg * 2 - CARD_GAP) / 2;

const popularSearches = ['Round', 'Square', 'Rimless', 'Boston', 'Oval'];

const SearchResultScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const inputRef = useRef<TextInput>(null);

  const initialQuery = route.params?.query || '';

  const [currentQuery, setCurrentQuery] = useState(initialQuery);
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const { products, loading, error, refetch, setFilters } = useProductList({
    page: 1,
    limit: 20,
    is_active_mobile: true,
    search: currentQuery,
  });

  const openSearchMode = () => {
    setInputQuery(currentQuery);
    setIsSearching(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const closeSearchMode = () => {
    Keyboard.dismiss();
    setInputQuery(currentQuery);
    setIsSearching(false);
  };

  const handleBack = () => {
    if (isSearching) {
      closeSearchMode();
      return;
    }

    navigation.goBack();
  };

  const handleSearch = (text?: string) => {
    const searchText = (text || inputQuery).trim();

    if (!searchText) return;

    Keyboard.dismiss();
    setCurrentQuery(searchText);
    setInputQuery(searchText);
    setIsSearching(false);

    setFilters(prev => ({
      ...prev,
      page: 1,
      search: searchText,
    }));
  };

  const formatData = (data: any[], numColumns: number) => {
    const newData = [...data];
    const remainder = newData.length % numColumns;

    if (remainder !== 0) {
      for (let i = 0; i < numColumns - remainder; i++) {
        newData.push({ id: `empty-${i}`, empty: true });
      }
    }

    return newData;
  };

  const renderCard = ({ item }: { item: Product }) => {
    if ((item as any).empty) {
      return <View style={[styles.card, { opacity: 0 }]} />;
    }

    return (
      <GlassCard
        item={item}
        onPress={() => navigation.navigate('GlassDetail', { id: item.id })}
        onTryOn={() => navigation.navigate('VirtualTryOn', { glass: item })}
      />
    );
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={handleBack}
          >
            <Ionicons
              name={isSearching ? 'close' : 'chevron-back'}
              size={24}
              color={Colors.black}
            />
          </TouchableOpacity>

          {isSearching ? (
            <View style={styles.searchPreview}>
              <Ionicons
                name="search-outline"
                size={18}
                color={Colors.gray400}
              />

              <TextInput
                ref={inputRef}
                value={inputQuery}
                onChangeText={setInputQuery}
                placeholder="Search frames..."
                placeholderTextColor={Colors.gray400}
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={() => handleSearch()}
              />

              {!!inputQuery && (
                <TouchableOpacity onPress={() => setInputQuery('')}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.searchPreview}
              activeOpacity={0.8}
              onPress={openSearchMode}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={Colors.gray400}
              />

              <Text style={styles.searchText} numberOfLines={1}>
                {currentQuery}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isSearching ? (
          <View style={styles.searchContent}>
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
        ) : (
          <>
            {!loading && (
              <View style={styles.resultHeader}>
                <Text style={styles.subtitle}>
                  {products.length} frame{products.length !== 1 ? 's' : ''}{' '}
                  found for “{currentQuery}”
                </Text>
              </View>
            )}

            {loading ? (
              <GlassScreenSkeleton />
            ) : error ? (
              <View style={styles.empty}>
                <Ionicons
                  name="alert-circle-outline"
                  size={42}
                  color={Colors.error}
                />
                <Text style={styles.emptyTitle}>Something went wrong</Text>
                <Text style={styles.emptyText}>{error}</Text>

                <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={formatData(products, 2)}
                keyExtractor={item => String(item.id)}
                numColumns={2}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                renderItem={renderCard}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Ionicons
                      name="search-outline"
                      size={42}
                      color={Colors.gray300}
                    />
                    <Text style={styles.emptyTitle}>No frames found</Text>
                    <Text style={styles.emptyText}>
                      Try another keyword or search by brand name.
                    </Text>

                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={openSearchMode}
                    >
                      <Text style={styles.retryText}>Search Again</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </>
        )}
      </SafeAreaView>
    </GlassBackground>
  );
};

export default SearchResultScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
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

  searchPreview: {
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

  searchText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '700',
  },

  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '700',
    paddingVertical: 0,
  },

  searchContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },

  searchTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
  },

  searchSubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
  },

  sectionTitle: {
    marginTop: Spacing.xs,
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

  resultHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  subtitle: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xxl + 80,
  },

  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    ...Shadow.md,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },

  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },

  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },

  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },

  retryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
