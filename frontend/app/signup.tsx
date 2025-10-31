import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import Button from "./components/Button";
import Textbox from "./components/Textbox";
import api from "./api";
import { router } from "expo-router";

import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./context/AuthContext";

const { width } = Dimensions.get("window");
const logo = require("@/assets/logo.png");

const signUpSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .matches(/\./, "Invalid email address")
    .max(254, "Email can't be longer than 254 characters")
    .required("Email is required"),
  password: Yup.string()
    .min(5, "Password must be at least 5 characters") // You can adjust min length if needed
    .max(255, "Password can't be longer than 255 characters")
    .required("Password is required"),
  first_name: Yup.string()
    .max(30, "First name can't be longer than 30 characters")
    .required("First name is required"),
});

export default function SignUp() {
  const { setUser } = useAuth();
  const [signUpError, setSignUpError] = useState("");
  const formWidth = Math.min(width * 0.9, 400);
  const isMobile = width < 768;
  const inputWidth = isMobile ? "100%" : 350;
  const buttonWidth = isMobile ? "90%" : 315;

  const handleSignUp = async (values) => {
    setSignUpError("");
    try {
      const response = await api.post("/users", values);

      // Automatically log the user in after successful signup
      const loginResponse = await api.post("/login", {
        email: values.email,
        password: values.password,
      });

      await AsyncStorage.setItem(
        "user",
        JSON.stringify(loginResponse.data.user)
      );
      setUser(loginResponse.data.user);

      router.replace("/"); // Redirect to main app screen
    } catch (err: any) {
      if ((err.response?.data?.detail).includes("Email already registered")) {
        // inline error for email already registered
        setSignUpError(
          "This email is already registered. Try logging in or use a different email."
        );
      } else {
        Toast.show({
          // toast error for network / internal server error
          type: "error",
          text1: "Error",
          text2: `Error creating account: ${err.message}`,
        });
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formBox, { width: formWidth }]}>
            <Image
              source={logo}
              style={[
                styles.logo,
                {
                  width: isMobile ? 180 : 200,
                  height: isMobile ? 90 : 100,
                },
              ]}
              resizeMode="contain"
            />

            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitleText}>
              Join thousands of happy shoppers
            </Text>

            <Formik
              initialValues={{
                email: "",
                password: "",
                first_name: "",
              }}
              validationSchema={signUpSchema}
              onSubmit={handleSignUp}
            >
              {({
                handleChange,
                handleSubmit,
                values,
                errors,
                touched,
                isSubmitting,
              }) => (
                <View style={styles.formContent}>
                  <View style={styles.inputWrapper}>
                    <Textbox
                      label="First Name"
                      placeholder="John"
                      value={values.first_name}
                      onChangeText={handleChange("first_name")}
                      error={touched.first_name && errors.first_name}
                      style={{ width: inputWidth }}
                    />
                    {errors.first_name && touched.first_name && (
                      <Text style={styles.errorText}>{errors.first_name}</Text>
                    )}
                  </View>

                  <View style={styles.inputWrapper}>
                    <Textbox
                      label="Email Address"
                      placeholder="your@email.com"
                      value={values.email}
                      onChangeText={handleChange("email")}
                      error={touched.email && errors.email}
                      style={{ width: inputWidth }}
                    />
                    {errors.email && touched.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}
                  </View>

                  <View style={styles.inputWrapper}>
                    <Textbox
                      theme="passwordBox"
                      label="Password"
                      placeholder="••••••••"
                      value={values.password}
                      onChangeText={handleChange("password")}
                      error={touched.password && errors.password}
                      style={{ width: inputWidth }}
                    />
                    {errors.password && touched.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>

                  <View style={styles.buttonWrapper}>
                    <Button
                      label={
                        isSubmitting ? "Creating Account..." : "Create Account"
                      }
                      theme="primary"
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                      style={[styles.signInButton, { width: buttonWidth }]}
                    />
                  </View>

                  {!!signUpError && (
                    <Text style={[styles.errorText, styles.formErrorText]}>
                      {signUpError}
                    </Text>
                  )}

                  <View style={styles.loginPrompt}>
                    <Text style={styles.loginText}>
                      Already have an account?
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.navigate("login")}
                      style={styles.loginButton}
                    >
                      <Text style={styles.loginLink}>Sign In</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.termsText}>
                    By registering, you agree to our
                    <Text style={styles.termsLink}> Terms of Service</Text> and
                    <Text style={styles.termsLink}> Privacy Policy</Text>
                  </Text>
                </View>
              )}
            </Formik>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  formBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
    alignItems: "center",
  },
  formContent: {
    width: "100%",
    alignItems: "center",
  },
  logo: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  inputWrapper: {
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonWrapper: {
    width: "100%",
    marginTop: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  signInButton: {
    height: 50,
    justifyContent: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
    width: "100%",
  },
  formErrorText: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 0,
  },
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },
  loginText: {
    color: "#6B7280",
    marginRight: 8,
    fontSize: 16,
  },
  loginButton: {
    padding: 4,
  },
  loginLink: {
    color: "#4bb4f8",
    fontWeight: "600",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  termsText: {
    color: "#9CA3AF",
    textAlign: "center",
    fontSize: 12,
    marginTop: 24,
    lineHeight: 18,
    width: "100%",
  },
  termsLink: {
    color: "#4bb4f8",
    fontWeight: "500",
  },
});
