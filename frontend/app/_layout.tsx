import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext"; // adjust path if needed
import Toast from "react-native-toast-message";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <Toast />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
