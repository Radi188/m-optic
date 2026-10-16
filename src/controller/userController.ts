// controller/userController.ts
import api from '../services/api';
import {
  CustomerProfileResponse,
  UpdateProfileResponse,
  UploadAvatarResponse,
} from '../types/user';

export type UploadAvatarPayload = {
  uri: string;
  type?: string;
  name?: string;
};

/**
 * PUT /profile. Every field is optional — send only what changed. The phone
 * number is not here on purpose: it is the login identity.
 */
export type UpdateProfilePayload = {
  /** max 255 */
  customer_name?: string;
  /** valid email, max 255 */
  email?: string;
  /** `male` | `female` | `other` — the API only accepts lowercase. */
  gender?: 'male' | 'female' | 'other';
  /** integer 0–150 */
  age?: number;
};

export const userController = {
  async getProfile(): Promise<CustomerProfileResponse> {
    const response = await api.get<CustomerProfileResponse>('/profile');

    if (__DEV__) {
      // Full payload plus the loyalty fields the profile card themes itself
      // from — the tier name is what decides Silver vs Gold, so it is printed
      // on its own line rather than being hunted for in the dump.
      console.log('[profile] raw:', JSON.stringify(response.data, null, 2));
      console.log('[profile] loyalty:', {
        customer_name: response.data?.customer_name,
        is_member: response.data?.is_member,
        loyalty_points: response.data?.loyalty_points,
        loyalty_total_points: response.data?.loyalty_total_points,
        tier: response.data?.tier?.name,
        tier_min_points: response.data?.tier?.min_points,
        next_tier: response.data?.next_tier?.name,
        next_tier_min_points: response.data?.next_tier?.min_points,
        points_to_next_tier: response.data?.points_to_next_tier,
        progress_percentage: response.data?.progress_percentage,
      });
      console.log('[profile] prescription:', response.data?.prescription);
    }

    return response.data;
  },

  async updateProfile(
    payload: UpdateProfilePayload,
  ): Promise<UpdateProfileResponse> {
    const response = await api.put<UpdateProfileResponse>('/profile', payload);

    if (__DEV__) {
      console.log('[profile] update:', JSON.stringify(response.data, null, 2));
    }

    return response.data;
  },

  /** jpeg / png / jpg / webp, max 5 MB. Replaces (and deletes) the old one. */
  async uploadAvatar(
    image: UploadAvatarPayload,
  ): Promise<UploadAvatarResponse> {
    const formData = new FormData();

    formData.append('avatar', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.name || `avatar-${Date.now()}.jpg`,
    } as any);

    const response = await api.post<UploadAvatarResponse>(
      '/profile/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  },
};
