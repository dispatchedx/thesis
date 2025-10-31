import { useCallback } from 'react';
import api from '../api';
import Toast from 'react-native-toast-message';
import { Product } from '../types/Types';

const MIN_CHAR = 3;
const LIMIT = 20;

export const useSearchAPI = (
  selectedShopIds: number[],
  setFullResults: (results: Product[] | ((prev: Product[]) => Product[])) => void,
  setOffset: (offset: number | ((prev: number) => number)) => void,
  setHasMore: (hasMore: boolean) => void,
  setLoadingMore: (loading: boolean) => void
) => {
  // Optimize fetchResults with better dependency management
  const fetchResults = useCallback(
    async (search: string, reset = false, currentOffset = 0) => {
      if (!search || search.length < MIN_CHAR || selectedShopIds.length === 0) {
        return;
      }

      setLoadingMore(true);
      try {
        const res = await api.get("/products/search", {
          params: {
            user_input: search,
            shop_ids: selectedShopIds,
            offset: reset ? 0 : currentOffset,
            limit: LIMIT,
          },
          paramsSerializer: { indexes: null },
        });

        const fetched = res.data.products || [];
        console.log(`search fetched ${fetched.length} items`);

        if (reset) {
          setFullResults(fetched);
          setOffset(fetched.length);
        } else {
          setFullResults((prev) => [...prev, ...fetched]);
          setOffset((prev) => prev + fetched.length);
        }

        setHasMore(res.data.has_more);
      } catch (err: any) {
        console.error("Error loading search results", err.message);
        Toast.show({
          type: "error",
          text1: "Search Failed",
          text2: reset ? "Couldn't load products." : "Couldn't load more products.",
        });
      } finally {
        setLoadingMore(false);
      }
    },
    [selectedShopIds, setLoadingMore, setFullResults, setOffset, setHasMore]
  );



  return {
    fetchResults,
  };
};