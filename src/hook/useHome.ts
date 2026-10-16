import { useCallback, useEffect, useState } from 'react';
import { HomeResponse } from '../types/home';
import { homeController } from '../controller/homeController';
import { useAppDispatch } from '../store';
import { setFeatures } from '../store/slices/featuresSlice';

type HomeData = HomeResponse['data'];

export const useHome = () => {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

const fetchHome = useCallback(async (isRefresh = false) => {
  try {
   
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    const response = await homeController.getHome();
    

    setData(response);
    // Other screens (Profile, Points) read the reward switch from the store.
    dispatch(setFeatures(response?.features));
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
}, [dispatch]);

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