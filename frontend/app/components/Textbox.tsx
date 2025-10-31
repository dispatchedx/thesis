import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StyleProp, ViewStyle, TextStyle } from "react-native";

type Props = {
  label?: string;
  theme?: "primary" | "passwordBox"; // Allow 'passwordBox' theme
  placeholder: string;
  value?: string;
  style?: StyleProp<ViewStyle | TextStyle>;
  onBlur?: () => void;
  icon?: any;
  onChangeText: (text: string) => void;
  error?: string | false; // Add error prop for error handling. used to be just boolean..
  onSubmitEditing?: () => void; // for accessibility enter goes to next field/submits
};

export default function Textbox({
  label,
  theme,
  placeholder,
  value,
  style,
  onChangeText,
  onSubmitEditing,
  error, // Error handling
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  // Only needed if the theme is passwordBox
  const isPasswordField = theme === "passwordBox";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  // Dynamic border color: error (if present), else focus, else default
  const borderColor = error
    ? "#cc5a5a" // Error color
    : isFocused
    ? "#4bb4f8" // Primary color when focused
    : "#CCCCCC"; // Default border

  return (
    <>
      <View
        style={[
          styles.inputContainer,
          { borderWidth: 2, borderColor: borderColor },
          style,
        ]}
      >
        <TextInput
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          underlineColorAndroid="transparent"
          onChangeText={onChangeText}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          autoCapitalize="none"
          autoCorrect={false}
          // If password, secureTextEntry is true unless toggled visible.
          secureTextEntry={isPasswordField ? !isPasswordVisible : false}
          style={[
            styles.inputText,
            //{ outline: "none" },
            isPasswordField && { paddingRight: 40 }, // Make space for icon
          ]}
        />

        {/* Conditionally render the toggle button if password field */}
        {isPasswordField && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.iconAbsolute}
          >
            <FontAwesome
              name={isPasswordVisible ? "eye" : "eye-slash"}
              size={24}
              color="#333"
            />
          </TouchableOpacity>
        )}
      </View>
      {/* Optionally display error text */}
      {error && typeof error === "string" && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    height: 50,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#808080",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Slightly stronger shadow - nvm
    shadowRadius: 3, // Proportional to button size
    elevation: 2,
    overflow: "hidden",
  },

  inputText: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    paddingVertical: 12,
    paddingHorizontal: 8,
    includeFontPadding: false, // Better text vertical alignment ?
  },
  iconContainer: {
    padding: 5,
    width: 36, // Prevent it from over-expanding
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#cc5a5a",
    fontSize: 12,
    marginTop: -15,
    marginBottom: 10,
  },
  iconAbsolute: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 10,
  },
});
