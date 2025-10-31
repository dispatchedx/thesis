import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { Product } from "../types/Types";
import AdaptiveImage from "./AdaptiveImage";
import { getBestImageUrl } from "../helpers/ProductImage";
import Toast from "react-native-toast-message";
import api from "../api";

type ProductCardProps = {
  product: Product;
  variant?: "compact" | "detailed";
  style?: any;
  userId?: number;
  watchlistId: number | null;
  watchlists?: Array<{ id: number; name: string; products?: any[] }>;
  isProductInWatchlist?: boolean;
  productWatchlists?: number[];
  onWatchlistChange?: () => void;
  // Add a key prop to force re-render when needed
  refreshKey?: string | number;
};

const { width: screenWidth } = Dimensions.get("window");

const ProductCard = React.memo(
  ({
    product,
    isProductInWatchlist = false,
    productWatchlists = [],
    watchlists = [],
    onWatchlistChange,
    userId,
    watchlistId,
    style,
    refreshKey, // New prop to force updates
  }: ProductCardProps) => {
    const [selectedWatchlists, setSelectedWatchlists] = useState(
      new Set(productWatchlists)
    );
    const [loading, setLoading] = useState(false);
    const [showWatchlistModal, setShowWatchlistModal] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Enhanced sync effect - now also listens to refreshKey
    useEffect(() => {
      setSelectedWatchlists(new Set(productWatchlists));
    }, [productWatchlists, refreshKey, product.id]); // Added refreshKey and product.id

    const hasDiscount = (product.price_history?.discount_percentage ?? 0) > 0;
    const hasSaleTag = product.price_history.sale_tag ? true : false;

    const mainWatchlist = watchlistId
      ? watchlists.find((w) => w.id === watchlistId) || watchlists[0]
      : watchlists[0];

    const isInMainWatchlist = mainWatchlist
      ? selectedWatchlists.has(mainWatchlist.id)
      : false;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const handleMainWatchlistToggle = async () => {
      if (!userId || !mainWatchlist) {
        console.warn("Missing userId or mainWatchlist", {
          userId,
          mainWatchlist,
        });
        return;
      }
      setLoading(true);

      const wasInMain = selectedWatchlists.has(mainWatchlist.id);

      // Optimistic UI update
      setSelectedWatchlists((prev) => {
        const newSet = new Set(prev);
        if (wasInMain) {
          newSet.delete(mainWatchlist.id);
        } else {
          newSet.add(mainWatchlist.id);
        }
        return newSet;
      });

      try {
        if (wasInMain) {
          await api.delete(
            `/users/${userId}/watchlist/${mainWatchlist.id}/product/${product.id}`
          );
          Toast.show({
            type: "success",
            text1: "Removed from watchlist",
            text2: product.name,
          });
        } else {
          await api.post(
            `/users/${userId}/watchlist/${mainWatchlist.id}/product/${product.id}`
          );
          Toast.show({
            type: "success",
            text1: "Added to watchlist",
            text2: product.name,
          });
        }
        // Call the callback to refresh parent data
        onWatchlistChange?.();
      } catch (err: any) {
        // Revert optimistic update on error
        setSelectedWatchlists((prev) => {
          const newSet = new Set(prev);
          if (wasInMain) {
            newSet.add(mainWatchlist.id);
          } else {
            newSet.delete(mainWatchlist.id);
          }
          return newSet;
        });

        const message = err.response?.data?.detail || "Operation failed";
        Toast.show({
          type: "error",
          text1: "Error",
          text2: message,
        });
      } finally {
        setLoading(false);
      }
    };

    const handleWatchlistToggle = async (watchlistIdToToggle: number) => {
      if (!userId) return;

      const wasInWatchlist = selectedWatchlists.has(watchlistIdToToggle);

      // Optimistic UI update
      setSelectedWatchlists((prev) => {
        const newSet = new Set(prev);
        if (wasInWatchlist) {
          newSet.delete(watchlistIdToToggle);
        } else {
          newSet.add(watchlistIdToToggle);
        }
        return newSet;
      });

      try {
        if (wasInWatchlist) {
          await api.delete(
            `/users/${userId}/watchlist/${watchlistIdToToggle}/product/${product.id}`
          );
        } else {
          await api.post(
            `/users/${userId}/watchlist/${watchlistIdToToggle}/product/${product.id}`
          );
        }
        // Call the callback to refresh parent data
        onWatchlistChange?.();
      } catch (err: any) {
        // Revert optimistic update on error
        setSelectedWatchlists((prev) => {
          const newSet = new Set(prev);
          if (wasInWatchlist) {
            newSet.add(watchlistIdToToggle);
          } else {
            newSet.delete(watchlistIdToToggle);
          }
          return newSet;
        });

        Toast.show({
          type: "error",
          text1: "Error",
          text2: err.response?.data?.detail || "Operation failed",
        });
      }
    };

    const formatPrice = () => {
      const p = product.price_history;
      if (p.discounted_price && p.regular_price)
        return p.discounted_price.toFixed(2);
      if (p.discounted_price) return p.discounted_price.toFixed(2);
      if (p.regular_price) return p.regular_price.toFixed(2);
      if (p.discounted_price_per_kg && p.price_per_kg)
        return p.discounted_price_per_kg.toFixed(2) + "/kg";
      if (p.discounted_price_per_kg)
        return p.discounted_price_per_kg.toFixed(2) + "/kg";
      if (p.price_per_kg) return p.price_per_kg.toFixed(2) + "/kg";
      return "--";
    };

    const getOriginalPrice = () => {
      const p = product.price_history;
      if (
        p.discounted_price &&
        p.regular_price &&
        p.discounted_price !== p.regular_price
      ) {
        return `€${p.regular_price.toFixed(2)}`;
      }
      if (
        p.discounted_price_per_kg &&
        p.price_per_kg &&
        p.discounted_price_per_kg !== p.price_per_kg
      ) {
        return `€${p.price_per_kg.toFixed(2)}/kg`;
      }
      return null;
    };

    // Format sale tag with gift emoji if it contains "+"
    const formatSaleTag = (saleTag: string | undefined) => {
      if (!saleTag) return "";
      const hasPlus = saleTag.includes("+");
      return hasPlus ? `🎁 ${saleTag}` : saleTag;
    };

    const renderWatchlistItem = ({ item }) => {
      const isSelected = selectedWatchlists.has(item.id);
      const isMainList = item.id === mainWatchlist?.id;

      return (
        <TouchableOpacity
          style={styles.watchlistItem}
          onPress={() => handleWatchlistToggle(item.id)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.watchlistName}>{item.name}</Text>
          {isMainList && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Main</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <Animated.View
        style={[styles.card, style, { transform: [{ scale: scaleAnim }] }]}
      >
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={styles.cardContent}
        >
          <View style={styles.imageContainer}>
            <AdaptiveImage
              uri={getBestImageUrl(product)}
              style={styles.productImage}
            />

            {(hasDiscount || hasSaleTag) && (
              <View style={styles.badgeContainer}>
                {hasDiscount && (
                  <View style={[styles.badge, styles.discountBadge]}>
                    <Text style={styles.badgeText}>
                      -{product.price_history.discount_percentage}%
                    </Text>
                  </View>
                )}
                {hasSaleTag && (
                  <View style={[styles.badge, styles.saleBadge]}>
                    <Text style={styles.badgeText}>
                      {product.price_history.sale_tag}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.infoSection}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.shopName}>{product.shop_name}</Text>
            </View>

            <View style={styles.priceSection}>
              {hasSaleTag && (
                <Text style={styles.offerText}>
                  {formatSaleTag(product.price_history.sale_tag)}
                </Text>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>€{formatPrice()}</Text>
                {getOriginalPrice() && (
                  <Text style={styles.originalPrice}>{getOriginalPrice()}</Text>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              isInMainWatchlist ? styles.removeButton : styles.addButton,
              loading && styles.buttonLoading,
            ]}
            onPress={handleMainWatchlistToggle}
            disabled={loading || !mainWatchlist}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>
              {loading ? "..." : isInMainWatchlist ? "♥" : "♡"}
            </Text>
            <Text style={styles.buttonText}>
              {isInMainWatchlist ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>

          {watchlists.length > 1 && (
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => setShowWatchlistModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={showWatchlistModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowWatchlistModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowWatchlistModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add to Lists</Text>
                <TouchableOpacity
                  onPress={() => setShowWatchlistModal(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={watchlists}
                renderItem={renderWatchlistItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.watchlistList}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </Animated.View>
    );
  }
);

// Updated memo comparison to include refreshKey
ProductCard.displayName = "ProductCard";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    aspectRatio: 1,
    backgroundColor: "#F8F9FA",
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badgeContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "column",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  discountBadge: {
    backgroundColor: "#FF4757",
  },
  saleBadge: {
    backgroundColor: "#FF6B35",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  contentContainer: {
    padding: 12,
    flex: 1,
  },
  infoSection: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: 18,
    marginBottom: 4,
  },
  shopName: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  priceSection: {
    marginBottom: 8,
  },
  offerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B35",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  mainButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  addButton: {
    backgroundColor: "#4C9AFE",
  },
  removeButton: {
    backgroundColor: "#ff6B6B",
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonIcon: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  plusButton: {
    width: 36,
    height: 36,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  plusIcon: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: screenWidth * 0.85,
    maxHeight: screenWidth * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 14,
    color: "#6B7280",
  },
  watchlistList: {
    maxHeight: 300,
  },
  watchlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  watchlistName: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  defaultBadge: {
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
});

export default ProductCard;
