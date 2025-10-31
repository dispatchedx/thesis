import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function WatchlistsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: "#4bb4f8", // Your brand blue
        headerBackTitleVisible: false,
        headerShadowVisible: true,
        headerBackImage: () => (
          <Ionicons name="chevron-back" size={24} color="#4bb4f8" />
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="watchlist-details"
        options={({ route }) => ({
          title: route.params?.watchlistName || "Watchlist",

          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#4bb4f8" />
            </TouchableOpacity>
          ),
        })}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827", // Dark gray
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
});
