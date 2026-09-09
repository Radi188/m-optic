import { createSlice, createSelector, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GlassItem } from '../../types/navigation';
import type { RootState } from '../index';
import { glassService } from '../../services/glassService';

// ─── Async thunks ─────────────────────────────────────────────────────────────

export const fetchGlassesThunk = createAsyncThunk(
  'glass/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await glassService.fetchAll();
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to fetch products');
    }
  },
);

export const createGlassThunk = createAsyncThunk(
  'glass/create',
  async (payload: Partial<GlassItem>, { rejectWithValue }) => {
    try {
      return await glassService.create(payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to create product');
    }
  },
);

export const updateGlassThunk = createAsyncThunk(
  'glass/update',
  async ({ id, ...payload }: Partial<GlassItem> & { id: string }, { rejectWithValue }) => {
    try {
      return await glassService.update(id, payload);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to update product');
    }
  },
);

export const deleteGlassThunk = createAsyncThunk(
  'glass/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await glassService.remove(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to delete product');
    }
  },
);

// ─── Initial Data ────────────────────────────────────────────────────────────

/**
 * Empty by design. This list used to ship with eighteen invented frames
 * (Ray-Ban, Oakley, Unsplash photography) which rendered as real stock before
 * the catalogue endpoint answered; products now come from `useProductList`.
 */
const INITIAL_FRAMES: GlassItem[] = [];

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
  extraReducers: builder => {
    // fetchAll
    builder
      .addCase(fetchGlassesThunk.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchGlassesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGlassesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // create
    builder
      .addCase(createGlassThunk.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });

    // update
    builder
      .addCase(updateGlassThunk.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      });

    // delete
    builder
      .addCase(deleteGlassThunk.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
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
