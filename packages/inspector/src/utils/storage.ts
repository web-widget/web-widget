/**
 * Local storage utility functions
 * Responsible for handling inspector configuration and state persistence
 */

export function getStoredValue<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

export function setStoredValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
