import { useCallback, useEffect, useState } from 'react';
import { HomeResponse } from '../types/home';
import { homeController } from '../controller/homeController';

type HomeData = HomeResponse['data'];

export const useHome = () => {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

const fetchHome = useCallback(async (isRefresh = false) => {
  try {
    console.log('fetchHome started');

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    const response = await homeController.getHome();
    

    setData(response);
  } catch (err: any) {
   

    setError(
      err?.response?.data?.message ||
        err?.message ||
        'Failed to fetch home data',
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);


  const onRefresh = useCallback(() => {
    fetchHome(true);
  }, [fetchHome]);

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: fetchHome,
    onRefresh,
  };
};