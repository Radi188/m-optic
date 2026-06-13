// hooks/useUserProfile.ts
import { useCallback, useEffect, useState } from 'react';
import {
  userController,
  UploadAvatarPayload,
} from '../controller/userController';
import { CustomerProfileResponse } from '../types/user';

type UseUserProfileReturn = {
  profile: CustomerProfileResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isUploadingAvatar: boolean;
  error: string | null;
  avatarError: string | null;
  refetch: () => Promise<void>;
  uploadAvatar: (image: UploadAvatarPayload) => Promise<void>;
};

export const useUserProfile = (): UseUserProfileReturn => {
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      setError(null);

      const data = await userController.getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load profile',
      );
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }

      setIsRefreshing(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProfile(false);
  }, [fetchProfile]);

  const uploadAvatar = useCallback(
    async (image: UploadAvatarPayload) => {
      try {
        setAvatarError(null);
        setIsUploadingAvatar(true);

        await userController.uploadAvatar(image);

        // Refetch profile after avatar upload success
        await fetchProfile(false);
      } catch (err: any) {
        console.log('Error Data Upload', err?.message);

        setAvatarError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to upload avatar',
        );
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [fetchProfile],
  );

  useEffect(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isRefreshing,
    isUploadingAvatar,
    error,
    avatarError,
    refetch,
    uploadAvatar,
  };
};