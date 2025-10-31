import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { useAuthInit } from "../hooks/useAuthInit";

const ProfileScreen = () => {
  const { user, isAuthLoading, logout } = useAuth(); // Assuming useAuth provides user info and logout method
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login"); // Redirect to login page after logging out
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  useAuthInit();

  if (isAuthLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>

      {user ? (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Name: </Text>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Email: </Text>
            {user.email}
          </Text>
          {/* Add more user info if necessary */}
        </View>
      ) : (
        <Text style={styles.noUser}>User not logged in</Text>
      )}

      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 10,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
  },
  noUser: {
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "500",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ProfileScreen;
