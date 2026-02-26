// Storage utility functions

/**
 * Safely get an item from localStorage
 */
export function getStorageItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

/**
 * Safely set an item in localStorage
 */
export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error(`Failed to save ${key} to localStorage`);
  }
}

/**
 * Safely remove an item from localStorage
 */
export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    console.error(`Failed to remove ${key} from localStorage`);
  }
}
