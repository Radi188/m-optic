// controller/userController.ts
import api from '../services/api';
import { CustomerProfileResponse } from '../types/user';

export type UploadAvatarPayload = {
  uri: string;
  type?: string;
  name?: string;
};

export const userController = {
  async getProfile(): Promise<CustomerProfileResponse> {
    const response = await api.get<CustomerProfileResponse>('/profile');
    return response.data;
  },

  async uploadAvatar(
    image: UploadAvatarPayload,
  ): Promise<CustomerProfileResponse> {
    const formData = new FormData();

    formData.append('avatar', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.name || `avatar-${Date.now()}.jpg`,
    } as any);

    const response = await api.post<CustomerProfileResponse>(
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