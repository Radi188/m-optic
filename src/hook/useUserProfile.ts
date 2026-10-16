// hooks/useUserProfile.ts
import { useCallback, useEffect, useState } from 'react';
import {
  userController,
  UpdateProfilePayload,
  UploadAvatarPayload,
} from '../controller/userController';
import { CustomerProfileResponse } from '../types/user';

/** 422 messages keyed by the API's field name (`customer_name`, `email`…). */
export type ProfileFieldErrors = Partial<
  Record<keyof UpdateProfilePayload, string>
>;

type UpdateProfileResult = {
  ok: boolean;
  message: string | null;
  fieldErrors: ProfileFieldErrors;
};

type UploadAvatarResult = { ok: boolean; message: string | null };

type UseUserProfileReturn = {
  profile: CustomerProfileResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isUploadingAvatar: boolean;
  isSaving: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Refetch without the pull-to-refresh spinner, e.g. on screen focus. */
  reload: () => Promise<void>;
  uploadAvatar: (image: UploadAvatarPayload) => Promise<UploadAvatarResult>;
  updateProfile: (
    payload: UpdateProfilePayload,
  ) => Promise<UpdateProfileResult>;
};

/** `{ errors: { email: ["…", …] } }` → `{ email: "…" }`, first message each. */
const toFieldErrors = (data: any): ProfileFieldErrors => {
  const bag = data?.errors;
  if (!bag || typeof bag !== 'object') return {};
  const out: Record<string, string> = {};
  Object.entries(bag).forEach(([field, messages]) => {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (typeof first === 'string' && first) out[field] = first;
  });
  return out;
};

export const useUserProfile = (): UseUserProfileReturn => {
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      setError(null);

      const data = await userController.getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile');
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

  const reload = useCallback(() => fetchProfile(false), [fetchProfile]);

  /**
   * Save, then refetch GET /profile: the PUT response is the raw customer
   * record without avatar_url, tier or loyalty, so it cannot rebuild the
   * screen. Failures are returned rather than thrown; a 422 comes back as
   * per-field messages so the form can show each under its own input.
   */
  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<UpdateProfileResult> => {
      try {
        setIsSaving(true);
        await userController.updateProfile(payload);
        await fetchProfile(false);
        return { ok: true, message: null, fieldErrors: {} };
      } catch (err: any) {
        return {
          ok: false,
          message: err?.message || 'Failed to update profile',
          fieldErrors: err?.status === 422 ? toFieldErrors(err?.data) : {},
        };
      } finally {
        setIsSaving(false);
      }
    },
    [fetchProfile],
  );

  /**
   * The response carries the new `avatar_url`, which is used straight away;
   * the URL changes on every upload, so no cache shows the old photo.
   */
  const uploadAvatar = useCallback(
    async (image: UploadAvatarPayload): Promise<UploadAvatarResult> => {
      try {
        setIsUploadingAvatar(true);

        const result = await userController.uploadAvatar(image);

        if (result?.avatar_url) {
          setProfile(prev =>
            prev ? { ...prev, avatar_url: result.avatar_url } : prev,
          );
        }
        return { ok: true, message: null };
      } catch (err: any) {
        return { ok: false, message: err?.message || null };
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isRefreshing,
    isUploadingAvatar,
    isSaving,
    error,
    refetch,
    reload,
    uploadAvatar,
    updateProfile,
  };
};
