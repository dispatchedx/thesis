import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import SearchBar from "./SearchBar";

interface SearchWithSuggestionsProps {
  search: string;
  onSearchChange: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading: boolean;
  selectedShopIds: number[];
  searchFocused: boolean;
  setSearchFocused: (focused: boolean) => void;
}

export const SearchWithSuggestions: React.FC<SearchWithSuggestionsProps> = ({
  search,
  onSearchChange,
  onSubmit,
  onClear,
  loading,
  selectedShopIds,
  searchFocused,
  setSearchFocused,
}) => {
  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
});
