import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';


const STORAGE_KEY = "@selectedShops";


export const useShopSelection = () => {
  const [selectedShopIds, setSelectedShopIds] = useState<number[]>([]);

  // Load persisted shop selection
  const debouncedSave = useCallback(
    debounce(async (shopIds: number[]) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shopIds));
      } catch (e) {
        console.warn("Failed to save shop selection", e);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (selectedShopIds.length > 0) {
      debouncedSave(selectedShopIds);
    }
  }, [selectedShopIds, debouncedSave]);

  useEffect(()=>{
    return () => debouncedSave.cancel()
  })

  //   toggle function
  const toggleShopSelection = useCallback((id: number) => {
    setSelectedShopIds((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((mid) => mid !== id)
        : [...prev, id];
      return newSelection;
    });
  }, []); // ← Empty deps = stable?

  useEffect(() => {
    if (selectedShopIds.length > 0) {
      const saveShops = async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selectedShopIds));
        } catch (e) {
          console.warn("Failed to save shop selection", e);
        }
      };
      saveShops();
    }
  }, [selectedShopIds]);

  return {
    selectedShopIds,
    toggleShopSelection, // Now !
    // Remove filterProductsByShops
  };
};
