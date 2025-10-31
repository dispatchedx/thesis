import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface ScrollToTopButtonProps {
  onPress: () => void;
  visible: boolean;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = React.memo(
  ({ onPress, visible }) => {
    if (!visible) return null;

    return (
      <TouchableOpacity
        style={styles.scrollToTopButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-up" size={35} color="white" />
      </TouchableOpacity>
    );
  }
);

// Add display name for debugging
ScrollToTopButton.displayName = "ScrollToTopButton";

const styles = StyleSheet.create({
  scrollToTopButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#007AFF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
});
