import { DifficultyLevel } from '../types';
import { formatLocalDate } from './dateUtils';

export type SearchMode = 'synonyms' | 'meaning';

export type FavoriteWord = {
  id: string;
  word: string;
  mode: SearchMode;
  savedAt: string;
  meaning: string | null;
  synonyms: string[];
  level: DifficultyLevel | null;
};

export type FavoritesByDate = Record<string, FavoriteWord[]>;

const ACTIVE_USER_KEY = 'hiztegia:active-user:v1';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const normalizeFavoriteWordKey = (value: string): string =>
  value.trim().toLowerCase();

export const todayKey = (): string => formatLocalDate(new Date());

export const readActiveUser = (): string | null => {
  const storage = getStorage();
  const value = storage?.getItem(ACTIVE_USER_KEY)?.trim() ?? '';
  return value.length >= 2 ? value : null;
};

export const writeActiveUser = (username: string): void => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ACTIVE_USER_KEY, username.trim());
};

export const clearActiveUser = (): void => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ACTIVE_USER_KEY);
};

export const hasFavoriteInDate = (
  favorites: FavoritesByDate,
  dateKey: string,
  word: string
): boolean => {
  const candidate = normalizeFavoriteWordKey(word);
  return (favorites[dateKey] ?? []).some(
    (entry) => normalizeFavoriteWordKey(entry.word) === candidate
  );
};

export const addFavoriteEntryToState = (
  favorites: FavoritesByDate,
  dateKey: string,
  favorite: FavoriteWord
): FavoritesByDate => {
  const dayRows = favorites[dateKey] ?? [];
  const exists = dayRows.some(
    (entry) =>
      normalizeFavoriteWordKey(entry.word) ===
      normalizeFavoriteWordKey(favorite.word)
  );
  if (exists) return favorites;

  return {
    ...favorites,
    [dateKey]: [favorite, ...dayRows],
  };
};

export const removeFavoriteEntryFromState = (
  favorites: FavoritesByDate,
  favoriteId: string
): FavoritesByDate => {
  let changed = false;
  const next: FavoritesByDate = {};

  Object.entries(favorites).forEach(([dateKey, rows]) => {
    const filtered = rows.filter((entry) => entry.id !== favoriteId);
    if (filtered.length !== rows.length) changed = true;
    if (filtered.length > 0) next[dateKey] = filtered;
  });

  return changed ? next : favorites;
};
