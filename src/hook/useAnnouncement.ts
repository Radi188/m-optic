import { useState, useEffect, useCallback } from 'react';
import { announcementController } from '../controller/announcementController';
import { AnnouncementResponse } from '../types/announcement';

export const useAnnouncements = () => {
  const [data, setData] = useState<AnnouncementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `showLoader` is what separates a first load from a pull-to-refresh: the
  // skeleton replaces the screen, the refresh spinner sits above the content
  // that is already on it.
  const fetchData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const res = await announcementController.getAnnouncements();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch announcements');
    } finally {
      if (showLoader) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, loading, isRefreshing, error, refetch: fetchData, refresh };
};