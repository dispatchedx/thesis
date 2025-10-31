import { useState, useCallback } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { Product } from '../types/Types';

export const useSearchState = () => {
  const [search, setSearch] = useState("");

  const [fullResults, setFullResults] = useState<Product[]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollY = useSharedValue(0);

  //  reset function
  const resetSearch = useCallback(() => {
    setFullResults([]);
    setOffset(0);

    setHasMore(true);
  }, []);

  return {
    search,
    setSearch,
    fullResults,
    setFullResults,
    offset,
    setOffset,
    loadingMore,
    setLoadingMore,
    hasMore,
    setHasMore,
    searchFocused,
    setSearchFocused,
    refreshing,
    setRefreshing,
    isScrolling,
    setIsScrolling,
    scrollY,
    resetSearch,
  };
};