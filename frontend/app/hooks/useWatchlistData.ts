import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Toast from 'react-native-toast-message';

interface WatchlistSummary {
  id: number;
  name: string;
  product_ids: number[];
}

export const useWatchlistData = () => {
  const { user } = useAuth();
  const [watchlistSummaries, setWatchlistSummaries] = useState<WatchlistSummary[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const mainWatchlistId = useMemo(() => {
    return watchlistSummaries.length > 0 ? watchlistSummaries[0].id : null;
  }, [watchlistSummaries]);

  const productWatchlistMap = useMemo(() => {
    const map = new Map<number, number[]>();
    watchlistSummaries.forEach((watchlist) => {
      watchlist.product_ids.forEach((productId) => {
        if (!map.has(productId)) {
          map.set(productId, []);
        }
        map.get(productId)!.push(watchlist.id);
      });
    });
    return map;
  }, [watchlistSummaries]);


  const fetchWatchlistSummaries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const res = await api.get(`/users/${user.id}/watchlists/summary`);
      setWatchlistSummaries(res.data.watchlists || []);
      setRefreshKey(Date.now());
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Error fetching watchlists: ${err.message}`,
      });
      console.error("Error fetching watchlists:", err.message);
    }
  }, [user?.id]);

  const getProductWatchlists = useCallback((productId: number): number[] => {
    // Calculate inline to avoid Map dependency
    const watchlistIds: number[] = [];
    watchlistSummaries.forEach((watchlist) => {
      if (watchlist.product_ids.includes(productId)) {
        watchlistIds.push(watchlist.id);
      }
    });
    return watchlistIds;
  }, [watchlistSummaries]);
  
  const isInMainWatchlist = useCallback((productId: number): boolean => {
    if (!mainWatchlistId) return false;
    const mainWatchlist = watchlistSummaries.find(w => w.id === mainWatchlistId);
    return mainWatchlist?.product_ids.includes(productId) || false;
  }, [watchlistSummaries, mainWatchlistId]);

  const watchlistsForGrid = useMemo(() => {
    return watchlistSummaries.map((summary) => ({
      id: summary.id,
      name: summary.name,
      products: [],
    }));
  }, [watchlistSummaries]);

  return {
    watchlistSummaries,
    refreshKey,
    mainWatchlistId,
    fetchWatchlistSummaries,
    getProductWatchlists,
    isInMainWatchlist,
    watchlistsForGrid,
  };
};