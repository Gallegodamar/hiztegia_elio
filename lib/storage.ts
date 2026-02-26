export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

const resolveStorage = (storage?: StorageLike | null): StorageLike | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getJSON = <T>(
  key: string,
  defaultValue: T,
  storage?: StorageLike | null
): T => {
  const target = resolveStorage(storage);
  if (!target) return defaultValue;

  try {
    const raw = target.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
};

export const setJSON = <T>(
  key: string,
  value: T,
  storage?: StorageLike | null
): boolean => {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const removeStoredKey = (
  key: string,
  storage?: StorageLike | null
): boolean => {
  const target = resolveStorage(storage);
  if (!target || !target.removeItem) return false;

  try {
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
