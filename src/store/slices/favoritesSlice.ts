import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * A saved frame. Kept as a small snapshot rather than the whole API product so
 * the favourites list renders instantly and offline; tapping one opens the
 * live product page, which has the current price and stock.
 *
 * Favourites live on this device only — the API has no endpoint for them yet.
 */
export interface FavoriteItem {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  image: string | null;
  /** When it was saved, ms since epoch. */
  addedAt: number;
}

interface FavoritesState {
  /** Newest first. */
  items: FavoriteItem[];
}

const initialState: FavoritesState = { items: [] };

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    /** Saves the frame, or removes it if it is already saved. */
    toggleFavorite(state, action: PayloadAction<Omit<FavoriteItem, 'addedAt'>>) {
      const index = state.items.findIndex(i => i.id === action.payload.id);
      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.unshift({ ...action.payload, addedAt: Date.now() });
      }
    },
    removeFavorite(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
  },
});

export const { toggleFavorite, removeFavorite } = favoritesSlice.actions;

export const selectFavorites = (state: RootState) => state.favorites.items;
export const selectFavoriteCount = (state: RootState) =>
  state.favorites.items.length;
export const selectIsFavorite = (id: string) => (state: RootState) =>
  state.favorites.items.some(i => i.id === id);

export default favoritesSlice.reducer;
