// components/ShopList.tsx
import React, { useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Shop } from "../types/Types";

// Map shop names to logos
const shopLogos: { [key: string]: any } = {
  ab: require("@/assets/logos/ab.png"),
  marketin: require("@/assets/logos/marketin.png"),
  masoutis: require("@/assets/logos/masoutis.webp"),
  mymarket: require("@/assets/logos/mymarket.jpg"),
  bazaar: require("@/assets/logos/bazaar.png"),
  sklavenitis: require("@/assets/logos/sklavenitis.png"),
};

interface ShopListProps {
  shops: Shop[];
  selectedShopIds: number[];
  onToggle: (id: number) => void;
}

export default function ShopList({
  shops,
  selectedShopIds,
  onToggle,
}: ShopListProps) {
  const renderShopBox = ({ item }: { item: Shop }) => {
    const selected = selectedShopIds.includes(item.id);
    return (
      <ShopBox
        key={`shop-${item.id}-${selected}`}
        item={item}
        selected={selected}
        onToggle={onToggle}
      />
    );
  };
  console.log("re-rendering ShopList");
  const keyExtractor = (item) => `shop-${item.id}`;
  return (
    <FlatList
      data={shops}
      contentContainerStyle={styles.shopList}
      keyExtractor={keyExtractor}
      renderItem={renderShopBox}
      horizontal
      showsHorizontalScrollIndicator={false}
      windowSize={5}
    />
  );
}

interface ShopBoxProps {
  item: Shop;
  selected: boolean;
  onToggle: (id: number) => void;
}

const ShopBox = ({ item, selected, onToggle }: ShopBoxProps) => (
  <View style={{ alignItems: "center", marginRight: 12 }}>
    <TouchableOpacity
      style={[styles.shopBox, selected && styles.shopBoxSelected]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
    >
      <Image
        source={shopLogos[item.name]}
        style={[
          { width: 70, height: 70, borderRadius: 8 },
          !selected && styles.shopBoxFaded,
        ]}
        resizeMode="contain"
      />
    </TouchableOpacity>
    <Text style={[styles.shopText, !selected && styles.shopBoxFaded]}>
      {item.name}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  shopBox: {
    width: 90,
    height: 90,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fafafa",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    padding: 10,
    transform: [{ scale: 0.95 }],
  },
  shopBoxFaded: {
    opacity: 0.3,
  },
  shopBoxSelected: {
    borderBottomWidth: 2,
    borderColor: "#6195fe",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,

    elevation: 3,
    opacity: 1,
    padding: 10,
    transform: [{ scale: 1 }],
  },
  shopText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  shopList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
