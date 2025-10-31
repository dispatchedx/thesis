import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import Toast from "react-native-toast-message";
import { useAuthInit } from "../../hooks/useAuthInit";
import ProductsGrid from "../../components/ProductsGrid";
import { Product } from "../../types/Types";

// Define the lightweight watchlist type (same as search page)
interface WatchlistSummary {
  id: number;
  name: string;
  product_ids: number[];
}

export default function WatchlistDetails() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [watchlistSummaries, setWatchlistSummaries] = useState<
    WatchlistSummary[]
  >([]);
  const { user } = useAuth();
  const { watchlistId: watchlistIdStr } = useLocalSearchParams();
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  // Memoize the watchlistId conversion
  const watchlistId = useMemo(
    () => (watchlistIdStr ? Number(watchlistIdStr) : null),
    [watchlistIdStr]
  );

  // Create product-to-watchlists mapping (same as search page)
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

  // Current watchlist product IDs (for the specific watchlist being viewed)
  const currentWatchlistProductIds = useMemo(() => {
    if (!watchlistId) return new Set<number>();
    const currentWatchlist = watchlistSummaries.find(
      (w) => w.id === watchlistId
    );
    return new Set(currentWatchlist?.product_ids || []);
  }, [watchlistSummaries, watchlistId]);

  // Fetch watchlist summaries (needed for ProductsGrid)
  const fetchWatchlistSummaries = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/users/${user.id}/watchlists/summary`);
      setWatchlistSummaries(res.data.watchlists || []);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Error fetching watchlists: ${err.message}`,
      });
      console.error("Error fetching watchlists:", err.message);
    }
  }, [user?.id]);

  // Memoized fetch function for products
  const fetchWatchlist = useCallback(
    async (reset = false) => {
      if (!user?.id || !watchlistId) return;
      if (!reset && loadingMore) return;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await api.get(
          `/users/${user.id}/watchlist/${watchlistId}`,
          {
            params: {
              limit: LIMIT,
              offset: reset ? 0 : offset, // if reset, set offset to 0 else keep previous
            },
          }
        );

        const fetched = res.data.products || [];
        setHasMore(res.data.has_more);
        setProducts((prev) => (reset ? fetched : [...prev, ...fetched]));
        if (reset) setOffset(LIMIT); // reset offset if starting from beginning
        else setOffset((prev) => prev + LIMIT);
      } catch (err) {
        console.error("Error:", err);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load watchlist",
        });
      } finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [user?.id, watchlistId, offset, loadingMore]
  );

  // Initialize data fetching
  useAuthInit(() => {
    fetchWatchlistSummaries();
    fetchWatchlist(true);
  });

  // Helper functions for ProductsGrid (same pattern as search page)
  const getProductWatchlists = (productId: number): number[] => {
    return productWatchlistMap.get(productId) || [];
  };

  const isInCurrentWatchlist = (productId: number): boolean => {
    return currentWatchlistProductIds.has(productId);
  };

  // Convert summaries to format expected by ProductsGrid
  const watchlistsForGrid = useMemo(() => {
    return watchlistSummaries.map((summary) => ({
      id: summary.id,
      name: summary.name,
      products: [],
    }));
  }, [watchlistSummaries]);

  //
  const handleWatchlistChange = () => {
    fetchWatchlistSummaries();
  };

  // Memoized ProductsGrid props
  const productsGridProps = useMemo(
    () => ({
      products,
      userId: user?.id,
      watchlists: watchlistsForGrid,
      watchlistId,
      isInWatchlist: isInCurrentWatchlist,
      onWatchlistChange: handleWatchlistChange,
      getProductWatchlists,
      variant: "grid" as const,
      onEndReached: () => {
        if (hasMore && !loadingMore) {
          fetchWatchlist(false);
        }
      },
      loadingMore,
      hasMore,
    }),
    [
      products,
      user?.id,
      watchlistsForGrid,
      watchlistId,
      isInCurrentWatchlist,
      handleWatchlistChange,
      getProductWatchlists,
      hasMore,
      loadingMore,
      fetchWatchlist,
    ]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {products.length === 0 ? (
        <Text style={styles.empty}>No products in this list.</Text>
      ) : (
        <ProductsGrid {...productsGridProps} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    margin: 16,
    textAlign: "center",
    color: "#333",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    color: "#666",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
