import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ViewStyle,
} from "react-native";

type Props = {
  label: string;
  theme?: "primary" | "textOnly";
  onPress?: () => void; // Accept a custom onPress function as a prop
  style?: ViewStyle | ViewStyle[];
};

export default function Button({
  label,
  theme = "primary",
  style,
  onPress,
}: Props) {
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity //TouchableOpacity for visually pleasing buttons when clicked
        style={[
          theme === "textOnly" && styles.textByRegister,
          theme === "primary" && [styles.loginButton], // conditional to change style
          style,
        ]}
        //label variable to change button text
        activeOpacity={0.7} // dim on press
        onPress={onPress} // Pass the handleSignUp function as the onPress prop
      >
        <Text
          style={[
            theme === "textOnly" && styles.textByRegister,
            theme === "primary" && [styles.btnText], // conditional to change style
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    height: 45,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "stretch", // good, match parent width
    borderRadius: 30,
    backgroundColor: "transparent",
  },
  loginButton: {
    backgroundColor: "#4bb4f8",
    alignItems: "center",
    shadowColor: "#808080",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2, // Slightly stronger shadow
    shadowRadius: 8, // Proportional to button size
    elevation: 5,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 18, // Rounded corners for modern look
  },

  btnText: {
    color: "white", // White text color
    fontSize: 16, // Font size for the text inside TouchableOpacity
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textByRegister: {
    backgroundColor: "transparent",
    color: "black",
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
