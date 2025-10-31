import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  FlatList,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Toast from "react-native-toast-message";
import { debounce } from "lodash";
import { Shop, Product } from "../types/Types";
import { useAuthInit } from "../hooks/useAuthInit";
import ProductsGrid from "../components/ProductsGrid";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

// Import our new hooks and components
import { useSearchState } from "../hooks/useSearchState";
import { useShopSelection } from "../hooks/useShopSelection";
import { useWatchlistData } from "../hooks/useWatchlistData";
import { useSearchAPI } from "../hooks/useSearchAPI";
import StickySearchWithShops from "../components/StickySearchWithShops";
import { ScrollToTopButton } from "../components/ScrollToTopButton";

const MIN_CHAR = 3;

export default function CurrentOffers() {
  const [shops, setShops] = useState<Shop[]>([]);
  const { user, isAuthLoading } = useAuth();

  // Create the ref in the main component
  const productsGridRef = useRef<FlatList>(null);

  // Use our custom hooks
  const searchState = useSearchState();
  const { selectedShopIds, toggleShopSelection } = useShopSelection();
  const watchlistData = useWatchlistData();

  const filteredProducts =
    selectedShopIds.length === 0
      ? []
      : searchState.fullResults.filter((product) =>
          selectedShopIds.includes(product.shop_id)
        );

  const searchAPI = useSearchAPI(
    selectedShopIds,
    searchState.setFullResults,
    searchState.setOffset,
    searchState.setHasMore,
    searchState.setLoadingMore
  );

  // Memoize scroll to top function to prevent recreation
  const scrollToTop = () => {
    productsGridRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Optimize scroll handler with better dependencies
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      searchState.scrollY.value = offsetY;

      // Use functional update to prevent unnecessary re-renders
      searchState.setIsScrolling((prev) => {
        const nowScrolling = offsetY > 10;
        return prev !== nowScrolling ? nowScrolling : prev;
      });
    },
    [searchState.scrollY, searchState.setIsScrolling]
  );

  // Optimize search change handler
  const handleSearchChange = (text: string) => {
    searchState.setSearch(text);
    if (text.length < MIN_CHAR) {
      return;
    }
  };

  // Optimize full search handler
  const handleFullSearch = () => {
    if (
      !searchState.search ||
      searchState.search.length < MIN_CHAR ||
      selectedShopIds.length === 0
    )
      return;
    searchState.setOffset(0);
    searchAPI.fetchResults(searchState.search, true);
  };

  // Optimize fetch more results
  const fetchMoreResults = () => {
    if (
      !searchState.loadingMore &&
      searchState.hasMore &&
      searchState.search.length >= MIN_CHAR &&
      selectedShopIds.length > 0
    ) {
      searchAPI.fetchResults(searchState.search, false, searchState.offset);
    }
  };

  //  fetchShops function
  const memoizedFetchShops = async () => {
    try {
      const res = await api.get("/shops");
      setShops(res.data);
    } catch (err: any) {
      console.error("Error getting shop data:", err.message);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Error getting shop data: ${err.message}`,
      });
    }
  };

  //  debounced watchlist refresh
  const debouncedWatchlistRefresh = useMemo(
    () =>
      debounce(() => {
        watchlistData.fetchWatchlistSummaries();
      }, 500),
    [watchlistData.fetchWatchlistSummaries]
  );

  // Optimize watchlist change handler
  const handleWatchlistChange = () => {
    debouncedWatchlistRefresh();
  };

  // Use the  toggle function directly
  const handleToggleShop = toggleShopSelection;

  // Focus effect optimization
  useFocusEffect(
    useCallback(() => {
      if (user?.id && !isAuthLoading) {
        watchlistData.fetchWatchlistSummaries();
      }
    }, [user?.id, isAuthLoading, watchlistData.fetchWatchlistSummaries])
  );

  useAuthInit(memoizedFetchShops);

  // Cleanup effect
  useEffect(() => {
    return () => {
      debouncedWatchlistRefresh.cancel();
    };
  }, [debouncedWatchlistRefresh]);

  if (isAuthLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <StickySearchWithShops
        search={searchState.search}
        onSearchChange={handleSearchChange}
        onSubmit={handleFullSearch}
        onClear={() => searchState.setSearch("")}
        loading={searchState.loadingMore}
        searchFocused={searchState.searchFocused}
        setSearchFocused={searchState.setSearchFocused}
        shops={shops}
        selectedShopIds={selectedShopIds}
        onToggleShop={handleToggleShop}
        scrollY={searchState.scrollY}
      />

      <View style={styles.productGridContainer}>
        {selectedShopIds.length > 0 ? (
          <ProductsGrid
            ref={productsGridRef}
            products={filteredProducts}
            userId={user?.id}
            watchlists={watchlistData.watchlistsForGrid}
            watchlistId={watchlistData.mainWatchlistId}
            isInWatchlist={watchlistData.isInMainWatchlist}
            refreshKey={watchlistData.refreshKey}
            onWatchlistChange={handleWatchlistChange}
            getProductWatchlists={watchlistData.getProductWatchlists}
            variant="grid"
            onScroll={handleScroll}
            onEndReached={fetchMoreResults}
            contentContainerStyle={{
              paddingTop: 280,
              paddingBottom: 0,
            }}
            loadingMore={searchState.loadingMore}
            hasMore={searchState.hasMore}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>
              Select at least one shop to start searching
            </Text>
          </View>
        )}
      </View>

      <ScrollToTopButton
        onPress={scrollToTop}
        visible={searchState.isScrolling}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  productGridContainer: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
