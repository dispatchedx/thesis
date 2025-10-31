import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/Types";

// Define the type for the AuthContext
type AuthContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthLoading: boolean;
  logout: () => void; // Add logout function to the context type
};
console.log("Auth context.tsx update");
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // while loading user auth

  // Load user data from AsyncStorage when the app initializes
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user"); // Get data from local storage
        if (userData) {
          setUser(JSON.parse(userData)); // Set user data if found
        }
      } catch (e) {
        console.error("Failed to load user:", e);
      } finally {
        setIsAuthLoading(false); // Set the loading state to false
      }
    };

    loadUser();
  }, []);

  // Function to log out the user (clear user data and AsyncStorage)
  const logout = async () => {
    try {
      setUser(null); // Clear user state
      await AsyncStorage.removeItem("user"); // Remove user data from AsyncStorage
    } catch (e) {
      console.error("Failed to logout:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
