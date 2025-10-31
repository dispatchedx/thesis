import React, { useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface SearchBarProps {
  search: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading?: boolean;
  selectedShopIds: number[];
  minChar?: number;
  searchFocused: boolean;
  setSearchFocused: (focused: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onChangeText,
  onSubmit,
  onClear,
  loading = false,
  selectedShopIds,
  minChar = 3,
  searchFocused,
  setSearchFocused,
}) => {
  const isButtonEnabled = useMemo(
    () => search.length >= minChar && selectedShopIds.length > 0,
    [search, selectedShopIds, minChar]
  );
  return (
    <View style={[styles.searchContainer]}>
      <View
        style={[
          styles.searchInputWrapper,
          searchFocused && styles.searchInputWrapperFocused,
        ]}
      >
        <TextInput
          placeholder="Search products..."
          style={styles.searchInput}
          value={search}
          onChangeText={onChangeText}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.searchButton,
            !isButtonEnabled && styles.searchButtonDisabled,
          ]}
          onPress={isButtonEnabled ? onSubmit : undefined}
          disabled={!isButtonEnabled || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#e9ecef",
    paddingLeft: 12,
    overflow: "hidden",
    paddingRight: 2,
  },
  searchInputWrapperFocused: {
    borderColor: "#007AFF",
    borderWidth: 0.5,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 10,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  clearButton: {
    padding: 8,
  },
  searchButton: {
    backgroundColor: "#3A7AFE",
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    backgroundColor: "#A9D1FF",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
export default SearchBar;
