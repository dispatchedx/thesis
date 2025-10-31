import { View, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import Button from "./components/Button";
import { useState } from "react";
import React from "react";
//bleh

export default function NotFoundScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Oops! Not Found" }} />
      <span style={styles.bigText}>404</span>
      <span style={styles.ohno}>
        It seems we can't find the page you were looking for
      </span>
      <Button
        label="Go home"
        theme="primary"
        onPress={() => router.navigate("/")}
      ></Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#25292e",
    justifyContent: "center",
    alignItems: "center",
  },
  bigText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "white",
  },
  ohno: {
    fontSize: 30,
    color: "white",
    paddingBottom: 16,
  },
  goHome: {
    fontSize: 150,
  },
});
