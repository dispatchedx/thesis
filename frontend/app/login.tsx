import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Button from "./components/Button";
import Textbox from "./components/Textbox";
import { router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import api from "./api";
import { useAuth } from "./context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const logo = require("@/assets/logo.png");

const logInSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .matches(/\./, "Invalid email address")
    .max(254, "Email can't be longer than 254 characters")
    .required("Email is required"),
  password: Yup.string()
    .min(5, "Password must be at least 5 characters") // You can adjust min length if needed
    .max(128, "Password can't be longer than 128 characters")
    .required("Password is required"),
});
export default function LogIn() {
  const { setUser } = useAuth();
  const [loginError, setLoginError] = useState("");

  const handleLogIn = async (values) => {
    setLoginError("");
    try {
      const response = await api.post("/login", values);
      const user = response.data.user;

      if (!user) {
        throw new Error("No user returned from API");
      }

      await AsyncStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      Alert.alert("Success", response.data.message);
      router.navigate("/");
      return user;
    } catch (error) {
      if (error.response) {
        const errorDetail = error.response.data.detail || "An error occurred";
        setLoginError(errorDetail);
        console.log(`Login failed: ${errorDetail}`);
      } else {
        setLoginError("Network error");
        console.error("Login failed:", error.message);
      }
      return null;
    }
  };

  const formWidth = Math.min(width * 0.9, 400); // max 400px on web, 90% width on mobile
  const isMobile = width < 768; // tablet breakpoint
  const inputWidth = isMobile ? "100%" : 350;
  const buttonWidth = isMobile ? "90%" : 320; // adjust as needed
  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView // for keyboard to not hide textbox on mobile?
        behavior={Platform.OS === "ios" ? "padding" : "height"} // idk
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

            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Sign in to continue</Text>

            <Formik
              initialValues={{ email: "", password: "" }}
              validationSchema={logInSchema}
              onSubmit={async (values, { setSubmitting }) => {
                setSubmitting(true);
                await handleLogIn(values); // handle everything inside
                setSubmitting(false);
              }}
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
                      label="Email Address"
                      placeholder="your@email.com"
                      value={values.email}
                      error={touched.email && errors.email}
                      onChangeText={handleChange("email")}
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
                      onSubmitEditing={handleSubmit}
                      error={touched.password && errors.password}
                      style={{ width: inputWidth }}
                    />
                    {errors.password && touched.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}

                    <View style={styles.forgotPasswordContainer}>
                      <TouchableOpacity style={styles.forgotPasswordButton}>
                        <Text style={styles.forgotPasswordText}>
                          Forgot Password?
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.buttonWrapper}>
                    <Button
                      label={isSubmitting ? "Signing In..." : "Sign In"}
                      theme="primary"
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                      style={[styles.signInButton, { width: buttonWidth }]}
                    />
                  </View>

                  {!!loginError && (
                    <Text style={[styles.errorText, styles.formErrorText]}>
                      {loginError}
                    </Text>
                  )}

                  <View style={styles.signUpContainer}>
                    <Text style={styles.signUpText}>
                      Don't have an account?
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.navigate("signup")}
                      style={styles.signUpButton}
                    >
                      <Text style={styles.signUpLink}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
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
    elevation: 5, // for android
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
  forgotPasswordContainer: {
    width: "100%",
    alignItems: "flex-end",
    marginTop: 8,
  },
  forgotPasswordButton: {
    padding: 4,
  },
  forgotPasswordText: {
    color: "#4bb4f8",
    fontSize: 14,
    fontWeight: "500",
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },
  signUpText: {
    color: "#6B7280",
    marginRight: 8,
    fontSize: 16,
  },
  signUpButton: {
    padding: 4,
  },
  signUpLink: {
    color: "#4bb4f8",
    fontWeight: "600",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
