import React, {
  forwardRef,
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  View,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControlProps,
  RefreshControl,
} from "react-native";
import Animated from "react-native-reanimated";
import ProductCard from "./ProductCard";
import { Product } from "../types/Types";

type ProductsGridProps = {
  products: Product[];
  variant?: "list" | "grid";
  userId?: number;
  watchlistId: number | null;
  ListHeaderComponent?: React.ReactNode;
  isInWatchlist?: (productId: number) => boolean;
  onWatchlistChange?: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentContainerStyle?: any;
  watchlists?: Array<{ id: number; name: string; products: never[] }>;
  getProductWatchlists?: (productId: number) => number[];
  refreshControl?: ReactElement<RefreshControlProps>;
  refreshKey?: string | number;
};

// fixed properly typed AnimatedFlatList
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as new () => FlatList<Product>
);

const ProductsGrid = forwardRef<FlatList<Product>, ProductsGridProps>(
  (
    {
      products,
      variant = "list",
      userId,
      ListHeaderComponent,
      watchlistId,
      isInWatchlist = () => false,
      onEndReached,
      onWatchlistChange,
      loadingMore,
      hasMore,
      onScroll,
      contentContainerStyle,
      watchlists,
      getProductWatchlists,
      refreshControl,
      refreshKey,
    },
    ref
  ) => {
    const { width } = useWindowDimensions();

    // Responsive grid configuration
    const gridConfig = useMemo(() => {
      const padding = 12;
      const gap = 12;

      // Force 2 columns for mobile, more for larger screens
      let numColumns = 2;
      if (width > 768) numColumns = 3;
      if (width > 1024) numColumns = 4;
      if (width > 1280) numColumns = 5;

      // Calculate actual item width
      const availableWidth = width - padding * 2;
      const totalGapWidth = gap * (numColumns - 1);
      const itemWidth = (availableWidth - totalGapWidth) / numColumns;

      return {
        numColumns,
        itemWidth,
        gap,
        padding,
      };
    }, [width]);

    // Memoized render functions for performance
    const renderItem = useMemo(
      () =>
        ({ item, index }: { item: Product; index: number }) => {
          const isGrid = variant === "grid";
          const { itemWidth, gap } = gridConfig;

          return (
            <View
              style={[
                isGrid && styles.gridItemContainer,
                isGrid && {
                  width: itemWidth,
                  marginRight:
                    (index + 1) % gridConfig.numColumns === 0 ? 0 : gap,
                },
              ]}
            >
              <ProductCard
                product={item}
                variant="compact" // Use compact for grid layout
                watchlists={watchlists}
                productWatchlists={getProductWatchlists?.(item.id) || []}
                style={[
                  isGrid ? styles.gridCard : styles.listCard,
                  isGrid && { width: itemWidth },
                ]}
                userId={userId}
                watchlistId={watchlistId}
                isProductInWatchlist={isInWatchlist(item.id)}
                onWatchlistChange={onWatchlistChange}
                refreshKey={refreshKey}
              />
            </View>
          );
        },
      [
        variant,
        gridConfig,
        userId,
        watchlistId,
        isInWatchlist,
        onWatchlistChange,
        refreshKey,
      ]
    );

    const renderEmptyState = () => {
      if (!loadingMore) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No products found</Text>
            <Text style={styles.emptyStateSubtitle}>
              Try adjusting your search or filters
            </Text>
          </View>
        );
      }

      return null;
    };

    const renderFooter = () => {
      if (loadingMore) {
        return (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading more products...</Text>
          </View>
        );
      }

      if (!hasMore && products.length > 0) {
        return (
          <View style={styles.endFooter}>
            <View style={styles.endLine} />
            <Text style={styles.endText}>You've reached the end</Text>
            <View style={styles.endLine} />
          </View>
        );
      }

      return null;
    };
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
      setRefreshing(true);
      try {
        // Simulate refresh delay (e.g., API call)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } finally {
        setRefreshing(false);
      }
    }, []);
    const renderHeader = () => {
      if (!ListHeaderComponent) return null;

      return <View style={styles.headerContainer}>{ListHeaderComponent}</View>;
    };

    // Key extractor with better performance
    const keyExtractor = (item: Product, index: number) =>
      `product_${item.id}_${index}`;

    return (
      <View style={styles.container}>
        <AnimatedFlatList
          ref={ref}
          data={products}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={onEndReached}
          refreshKey={refreshKey}
          onEndReachedThreshold={0.3}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Grid configuration
          numColumns={variant === "grid" ? gridConfig.numColumns : 1}
          key={`${variant}_${gridConfig.numColumns}`} // Force re-render on layout change
          // Content styling
          contentContainerStyle={[
            styles.contentContainer,
            variant === "grid" ? styles.gridContent : styles.listContent,
            { paddingHorizontal: gridConfig.padding },
            contentContainerStyle,
          ]}
          keyboardDismissMode="on-drag"
          // Improved scrolling
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          bounces={true}
          bouncesZoom={false}
        />
      </View>
    );
  }
);

// Memoize the component for better performance
const MemoizedProductsGrid = React.memo(
  ProductsGrid,
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.products.length === nextProps.products.length &&
      prevProps.variant === nextProps.variant &&
      prevProps.loadingMore === nextProps.loadingMore &&
      prevProps.hasMore === nextProps.hasMore &&
      prevProps.userId === nextProps.userId &&
      prevProps.watchlistId === nextProps.watchlistId
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    paddingBottom: 20,
  },
  listContent: {
    paddingTop: 8,
  },
  gridContent: {
    paddingTop: 8,
  },
  headerContainer: {
    marginBottom: 16,
  },

  // Grid item styling
  gridItemContainer: {
    marginBottom: 12,
  },
  gridCard: {
    width: "100%",
    marginRight: 0,
    marginBottom: 0,
  },
  listCard: {
    marginVertical: 8,
    marginHorizontal: 0,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },

  // Loading footer
  loadingFooter: {
    paddingVertical: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // End footer
  endFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  endLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  endText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default MemoizedProductsGrid;
