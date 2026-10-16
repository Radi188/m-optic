import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { HomeFeatures } from '../../types/home';

/**
 * Feature switches read from `/homepage` → `data.features`.
 *
 * Not persisted: every launch waits for the server's answer, so closing a
 * feature on the backend takes effect on the next app start. Until that
 * answer arrives (or if the request fails) rewards and tiers stay hidden,
 * rather than showing a feature that may have been closed.
 */
interface FeaturesState {
  membershipEnabled: boolean;
}

const initialState: FeaturesState = { membershipEnabled: false };

const featuresSlice = createSlice({
  name: 'features',
  initialState,
  reducers: {
    setFeatures(state, action: PayloadAction<HomeFeatures | null | undefined>) {
      const features = action.payload;
      state.membershipEnabled =
        (features?.mobile_membership_enabled ??
          features?.membership_enabled) === true;
    },
  },
});

export const { setFeatures } = featuresSlice.actions;

export const selectMembershipEnabled = (state: RootState) =>
  state.features.membershipEnabled;

export default featuresSlice.reducer;
