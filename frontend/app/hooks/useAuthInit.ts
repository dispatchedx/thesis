import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export function useAuthInit(fetchCallback?: () => void) {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();
  const hasCalled = useRef(false);
  const callbackRef = useRef(fetchCallback);
  
  // Keep callback ref updated without causing re-renders
  callbackRef.current = fetchCallback;

  useEffect(() => {
    if (isAuthLoading || hasCalled.current) return;
    
    if (user === null) {
      router.replace("/login");
    } else if (callbackRef.current) {
      callbackRef.current();
      hasCalled.current = true;
    }
  }, [user, isAuthLoading, router]); // Only  dependencies
}