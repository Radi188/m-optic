import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { BorderRadius, Colors, FontSize, Layout, Shadow, Spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import { useAppDispatch, useAppSelector } from '../store';
import {
  removeFavorite,
  selectFavorites,
  type FavoriteItem,
} from '../store/slices/favoritesSlice';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import { isPriceVisible } from '../utils/priceGate';
import { useBlockScreenCapture } from '../hook/useBlockScreenCapture';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';
import EmptyState from '../components/ui/EmptyState';
import PriceTag from '../components/ui/PriceTag';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FAVORITE_RED = '#E5484D';

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const favorites = useAppSelector(selectFavorites);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Shows prices: no screenshots or screen recording while focused.
  useBlockScreenCapture();

  const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => {
    const showPrice = item.price !== null && isPriceVisible(isAuthenticated, index);

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('GlassDetail', { id: item.id })}
      >
        <View style={styles.imageWrap}>
          {item.image ? (
            <AppImage
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="glasses-outline" size={30} color={Colors.gray300} />
          )}
        </View>

        <View style={styles.info}>
          {!!item.brand && (
            <AppText style={styles.brand} numberOfLines={1}>
              {item.brand}
            </AppText>
          )}
          <AppText style={styles.name} numberOfLines={2}>
            {item.name}
          </AppText>
          {item.price !== null &&
            (showPrice ? (
              <PriceTag
                pricing={{
                  price: item.price,
                  originalPrice: item.originalPrice ?? null,
                  discountPercentage: item.discountPercentage ?? null,
                }}
                priceStyle={styles.price}
              />
            ) : (
              <AppText style={[styles.price, styles.priceHidden]}>
                {t('LoginToSeePrice')}
              </AppText>
            ))}
        </View>

        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => dispatch(removeFavorite(item.id))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('RemoveFromFavorites')}
        >
          <Ionicons name="heart" size={20} color={FAVORITE_RED} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          accessibilityLabel={t('Back')}
        >
          <Ionicons name="chevron-back" size={23} color={Colors.black} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <AppText style={styles.headerTitle}>{t('MyFavorites')}</AppText>
          {favorites.length > 0 && (
            <AppText style={styles.headerSubtitle}>
              {t('SavedFramesCount', { count: favorites.length })}
            </AppText>
          )}
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title={t('NoFavoritesYet')}
            message={t('NoFavoritesHint')}
            actionLabel={t('BrowseFrames')}
            onAction={() => navigation.navigate('Main', { screen: 'Glass' })}
          />
        }
      />
    </SafeAreaView>
  );
};

export default FavoritesScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  header: {
    ...Layout.readable,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
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
  headerSpacer: {
    width: 42,
  },
  list: {
    ...Layout.readable,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    ...Shadow.sm,
  },
  imageWrap: {
    width: 92,
    height: 76,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 2,
  },
  brand: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  price: {
    marginTop: 2,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
  },
  priceHidden: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.gray400,
  },
  heartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229,72,77,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
