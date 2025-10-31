import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import api from "../../api";
import Toast from "react-native-toast-message";
import Textbox from "../../components/Textbox";
import { Watchlist } from "../../types/Types";
import { useAuthInit } from "../../hooks/useAuthInit";
import { ScrollView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { RefreshControl } from "react-native";

export default function Dashboard() {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  // Add state for refresh
  const [refreshing, setRefreshing] = useState(false);

  const fetchWatchlists = async () => {
    if (!user?.id) return; // if no user stop
    try {
      const res = await api.get(`/users/${user.id}/watchlists`);
      setWatchlists(res.data.watchlists || []);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Error fetching watchlists: ${err.message}`,
      });
      console.error("Error fetching watchlists:", err.message);
    }
  };
  // Add refresh function
  const onRefresh = async () => {
    console.log("🔄 Refresh started");
    setRefreshing(true);
    try {
      await fetchWatchlists();
      console.log("✅ Refresh completed successfully");
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
      console.log("🏁 Resetting refresh state");
    }
  };

  useAuthInit(fetchWatchlists); // call auth and render

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Watchlist name can't be empty",
      });
      return;
    }

    setLoadingCreate(true);
    if (!user?.id) return; // if no user stop
    try {
      const response = await api.post(`/users/${user.id}/watchlist`, {
        watchlist_name: newWatchlistName.trim(),
      });
      const created = response.data.watchlist;
      setWatchlists((prev) => [...prev, created]);
      setNewWatchlistName("");
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Watchlist created successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Create watchlist error: ${error}`,
      });
      console.error("Create watchlist error:", error);
    } finally {
      setLoadingCreate(false);
    }
  };

  const confirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === "web") {
        // Web fallback cause Alert.alert() works only on mobile devices
        const confirmed = window.confirm(`${title}\n\n${message}`);
        resolve(confirmed);
      } else {
        // Native Alert
        Alert.alert(title, message, [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ]);
      }
    });
  };

  const deleteWatchlist = async (watchlist: Watchlist) => {
    const confirmed = await confirm(
      "Delete watchlist",
      `Are you sure you want to delete "${watchlist.name}"? It contains ${
        watchlist.products?.length || 0
      } products.`
    );
    if (!confirmed || !user?.id) return;

    try {
      await api.delete(`/users/${user.id}/watchlist/${watchlist.id}`);
      setWatchlists((prev) => prev.filter((w) => w.id !== watchlist.id));
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Watchlist "${watchlist.name}" deleted`,
      });
    } catch (err) {
      console.error("Delete error:", err.message);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Delete error: ${err.message}`,
      });
    }
  };

  const renderWatchlist = ({ item }) => {
    if (!item) return null; // skip if item undefined/null

    const productCount = item.products?.length || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/watchlists/watchlist-details",
            params: {
              watchlistId: item.id,
              watchlistName: item.name,
            },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card navigation
                deleteWatchlist(item);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.productCount}>
              {productCount} {productCount === 1 ? "product" : "products"}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.tapToView}>Tap to view →</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isAuthLoading || user === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]} // Android
            tintColor="#007AFF" // iOS
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user.first_name} {user.last_name}
          </Text>
        </View>

        {/* Create Watchlist Section */}

        <View style={styles.createSection}>
          <Text style={styles.sectionTitle}>Create New Watchlist</Text>
          <View style={styles.createContainer}>
            <View style={styles.inputContainer}>
              <Textbox
                placeholder="Enter watchlist name..."
                style={styles.input}
                value={newWatchlistName}
                onChangeText={setNewWatchlistName}
                label=""
              />
            </View>
            <TouchableOpacity
              style={[
                styles.createButton,
                loadingCreate && styles.createButtonDisabled,
                !newWatchlistName.trim() && styles.createButtonDisabled,
              ]}
              onPress={handleCreateWatchlist}
              disabled={loadingCreate || !newWatchlistName.trim()}
              activeOpacity={0.8}
            >
              {loadingCreate ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Watchlists Section */}
        <View style={styles.watchlistsSection}>
          <Text style={styles.sectionTitle}>
            Your Watchlists ({watchlists.length})
          </Text>

          {watchlists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No watchlists yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first watchlist to start tracking products
              </Text>
            </View>
          ) : (
            <FlatList
              data={watchlists}
              renderItem={renderWatchlist}
              keyExtractor={(item, index) =>
                item && item.id ? item.id.toString() : index.toString()
              }
              scrollEnabled={false}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 32,
    paddingTop: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
  },
  createSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginBottom: 16,
  },
  createContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  watchlistsSection: {
    flex: 1,
  },
  flatListContent: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    flex: 1,
    marginRight: 12,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ff4757",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 18,
  },
  cardBody: {
    gap: 8,
  },
  productCount: {
    fontSize: 15,
    color: "#666",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  tapToView: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
