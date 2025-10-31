import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import SearchBar from "./SearchBar";
import ShopList from "./ShopList";

const StickySearchWithShops = ({
  search,
  onSearchChange,
  onSubmit,
  onClear,
  loading,
  searchFocused,
  setSearchFocused,
  shops,
  selectedShopIds,
  onToggleShop,
  scrollY,
}) => {
  const shopsAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 75, 185],
      [0, -50, -185],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, 80, 150],
      [1, 1, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const searchAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 75, 165],
      [0, -50, -165],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
    };
  });

  const SearchWrapper = Platform.OS === "web" ? View : Animated.View;
  const ShopsWrapper = Platform.OS === "web" ? View : Animated.View;

  return (
    <>
      {/* Shops Section - at the top, slides up and disappears */}
      <ShopsWrapper
        style={[
          styles.shopsContainer,
          Platform.OS !== "web" ? shopsAnimatedStyle : { top: 70 },
        ]}
      >
        <Text style={styles.supermarketsText}>Supermarkets</Text>
        <ShopList
          shops={shops}
          selectedShopIds={selectedShopIds}
          onToggle={onToggleShop}
        />
      </ShopsWrapper>

      {/* Search Bar - below supermarkets, becomes sticky */}
      <SearchWrapper
        style={[
          styles.searchContainer,
          Platform.OS !== "web" ? searchAnimatedStyle : { top: 0 },
        ]}
      >
        <SearchBar
          search={search}
          onChangeText={onSearchChange}
          onSubmit={onSubmit}
          onClear={onClear}
          loading={loading}
          selectedShopIds={selectedShopIds}
          searchFocused={searchFocused}
          setSearchFocused={setSearchFocused}
        />
      </SearchWrapper>
    </>
  );
};

const styles = StyleSheet.create({
  shopsContainer: {
    position: "absolute",
    top: 30, // Starts right at the top (below SafeAreaView)
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 15,
    overflow: "hidden",
    minHeight: 170, // Ensure minimum height for the shops section
  },
  supermarketsText: {
    fontSize: 20,
    fontWeight: "700",
    paddingTop: 12,
    paddingLeft: 16,
    paddingBottom: 12,
    textAlign: "left",
    color: "#222",
  },
  searchContainer: {
    position: "absolute",
    top: 200, // Below the shops section
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10, // Higher than shops so it stays on top when sticky????
  },
});

export default StickySearchWithShops;
