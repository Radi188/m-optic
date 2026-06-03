import { useState, useEffect, useCallback } from 'react';
import { announcementController } from '../controller/announcementController';
import { AnnouncementResponse } from '../types/announcement';

export const useAnnouncements = () => {
  const [data, setData] = useState<AnnouncementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await announcementController.getAnnouncements();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};