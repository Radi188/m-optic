import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GlassItem } from '../../types/navigation';
import type { RootState } from '../index';

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_FRAMES: GlassItem[] = [
  {
    id: '1', brand: 'Ray-Ban', name: 'Classic Round', price: 120, stock: 8,
    status: 'In Stock', frameShape: 'round',
    image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&w=400&q=75',
    description: 'Timeless circular frames with spring hinges and UV400 lenses.',
  },
  {
    id: '2', brand: 'Ray-Ban', name: 'Wayfarer Plus', price: 99, stock: 0,
    status: 'Out of Stock', frameShape: 'wayfarer',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&w=400&q=75',
    description: 'Iconic squared silhouette, scratch-resistant CR-39 lenses.',
  },
  {
    id: '3', brand: 'Ray-Ban', name: 'Club Master', price: 145, stock: 6,
    status: 'In Stock', frameShape: 'browline',
    image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&w=400&q=75',
    description: 'Browline design with premium acetate and double bridge.',
  },
  {
    id: '4', brand: 'Oakley', name: 'Aviator Pro', price: 150, stock: 2,
    status: 'Low Stock', frameShape: 'aviator',
    image: 'https://images.unsplash.com/photo-1511499767150-a7a1371514e4?auto=format&w=400&q=75',
    description: 'Lightweight aviator-style with polarized lenses and titanium finish.',
  },
  {
    id: '5', brand: 'Oakley', name: 'Titanium Edge', price: 310, stock: 3,
    status: 'Low Stock', frameShape: 'rectangle',
    image: 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?auto=format&w=400&q=75',
    description: 'Premium titanium build, feather-light at just 18g.',
  },
  {
    id: '6', brand: 'Oakley', name: 'Radar EV Path', price: 180, stock: 9,
    status: 'In Stock', frameShape: 'shield',
    image: 'https://images.unsplash.com/photo-1559813114-cef7f1d35553?auto=format&w=400&q=75',
    description: 'Wrap-around sport shield for maximum coverage and protection.',
  },
  {
    id: '7', brand: 'Gucci', name: 'Rectangle Slim', price: 250, stock: 5,
    status: 'In Stock', frameShape: 'rectangle',
    image: 'https://images.unsplash.com/photo-1583394293756-51b5163eb3b2?auto=format&w=400&q=75',
    description: 'Slim rectangular profile with ultra-thin acetate and blue-light filter.',
  },
  {
    id: '8', brand: 'Gucci', name: 'GG Shield', price: 290, stock: 0,
    status: 'Out of Stock', frameShape: 'shield',
    image: 'https://images.unsplash.com/photo-1587222538504-8e7e30ebe8e5?auto=format&w=400&q=75',
    description: 'Bold single-lens shield with signature GG metal logo.',
  },
  {
    id: '9', brand: 'Gucci', name: 'Bloom Square', price: 275, stock: 4,
    status: 'In Stock', frameShape: 'square',
    image: 'https://images.unsplash.com/photo-1483394879078-51e59d3e8ddc?auto=format&w=400&q=75',
    description: 'Oversized square with floral embossed temple detail.',
  },
  {
    id: '10', brand: 'Prada', name: 'Cat-Eye Chic', price: 200, stock: 12,
    status: 'In Stock', frameShape: 'cat-eye',
    image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&w=400&q=75',
    description: 'Retro cat-eye design with gradient tint and gold temple detail.',
  },
  {
    id: '11', brand: 'Prada', name: 'Linea Rossa', price: 230, stock: 1,
    status: 'Low Stock', frameShape: 'rectangle',
    image: 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?auto=format&w=400&q=75',
    description: 'Sporty rectangle in lightweight nylon with rubber nose pads.',
  },
  {
    id: '12', brand: 'Prada', name: 'Symbole', price: 215, stock: 7,
    status: 'In Stock', frameShape: 'cat-eye',
    image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&w=400&q=75',
    description: 'Architectural cat-eye with minimalist triangular logo.',
  },
  {
    id: '13', brand: 'Versace', name: 'Medusa Biggie', price: 265, stock: 4,
    status: 'In Stock', frameShape: 'square',
    image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&w=400&q=75',
    description: 'Oversized square with iconic Medusa head at temples.',
  },
  {
    id: '14', brand: 'Versace', name: 'VE4361', price: 240, stock: 0,
    status: 'Out of Stock', frameShape: 'cat-eye',
    image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&w=400&q=75',
    description: 'Bold cat-eye in acetate with Greca pattern arms.',
  },
  {
    id: '15', brand: 'Versace', name: 'Greek Frame', price: 285, stock: 6,
    status: 'In Stock', frameShape: 'rectangle',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&w=400&q=75',
    description: 'Slim rectangle with baroque Greek key detail in gold.',
  },
  {
    id: '16', brand: 'Tom Ford', name: 'Edward', price: 340, stock: 3,
    status: 'Low Stock', frameShape: 'square',
    image: 'https://images.unsplash.com/photo-1483394879078-51e59d3e8ddc?auto=format&w=400&q=75',
    description: 'Classic square with subtle T-bar hinge and horn-tipped ends.',
  },
  {
    id: '17', brand: 'Tom Ford', name: 'Hawkings II', price: 320, stock: 8,
    status: 'In Stock', frameShape: 'browline',
    image: 'https://images.unsplash.com/photo-1511499767150-a7a1371514e4?auto=format&w=400&q=75',
    description: 'Browline silhouette in polished acetate with gunmetal hardware.',
  },
  {
    id: '18', brand: 'Tom Ford', name: 'Henry', price: 360, stock: 2,
    status: 'Low Stock', frameShape: 'round',
    image: 'https://images.unsplash.com/photo-1559813114-cef7f1d35553?auto=format&w=400&q=75',
    description: 'Refined round with brushed titanium and TF logo rivets.',
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

interface GlassState {
  items: GlassItem[];
  selectedBrand: string;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

const initialState: GlassState = {
  items: INITIAL_FRAMES,
  selectedBrand: 'All',
  searchQuery: '',
  loading: false,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const glassSlice = createSlice({
  name: 'glass',
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<GlassItem[]>) {
      state.items = action.payload;
    },
    addItem(state, action: PayloadAction<GlassItem>) {
      state.items.unshift(action.payload);
    },
    updateItem(state, action: PayloadAction<GlassItem>) {
      const idx = state.items.findIndex(i => i.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    adjustStock(state, action: PayloadAction<{ id: string; delta: number }>) {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) {
        const newStock = Math.max(0, item.stock + action.payload.delta);
        item.stock = newStock;
        item.status =
          newStock === 0 ? 'Out of Stock' :
          newStock <= 3 ? 'Low Stock' :
          'In Stock';
      }
    },
    setSelectedBrand(state, action: PayloadAction<string>) {
      state.selectedBrand = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setItems, addItem, updateItem, removeItem, adjustStock,
  setSelectedBrand, setSearchQuery, setLoading, setError,
} = glassSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectGlass = (state: RootState) => state.glass;

export const selectAllGlasses = (state: RootState) => state.glass.items;
export const selectSelectedBrand = (state: RootState) => state.glass.selectedBrand;
export const selectSearchQuery = (state: RootState) => state.glass.searchQuery;
export const selectGlassLoading = (state: RootState) => state.glass.loading;

export const selectFilteredGlasses = createSelector(selectGlass, ({ items, selectedBrand, searchQuery }) =>
  items.filter(f => {
    const matchBrand = selectedBrand === 'All' || f.brand === selectedBrand;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || f.name.toLowerCase().includes(q) || f.brand.toLowerCase().includes(q);
    return matchBrand && matchSearch;
  }),
);

export const selectBrands = createSelector(selectAllGlasses, items =>
  ['All', ...Array.from(new Set(items.map(i => i.brand)))],
);

export const selectInventoryStats = createSelector(selectAllGlasses, items => ({
  total: items.length,
  inStock: items.filter(i => i.status === 'In Stock').length,
  lowStock: items.filter(i => i.status === 'Low Stock').length,
  outOfStock: items.filter(i => i.status === 'Out of Stock').length,
  totalValue: items.reduce((sum, i) => sum + i.price * i.stock, 0),
}));

export default glassSlice.reducer;
