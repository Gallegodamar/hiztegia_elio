import { formatLocalDate } from './dateUtils';

export type DailyStorySeenStatus = 'pending' | 'seen';

const STORAGE_KEY_PREFIX = 'dailyStoriesSeen:';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getDailyStoriesDateKey = (date: Date = new Date()): string =>
  formatLocalDate(date);

export const getDailyStoriesStorageKey = (dateKey: string = getDailyStoriesDateKey()): string =>
  `${STORAGE_KEY_PREFIX}${dateKey}`;

export const readSeenDailyStories = (
  dateKey: string = getDailyStoriesDateKey()
): Set<string> => {
  const storage = getStorage();
  if (!storage) return new Set();

  const raw = storage.getItem(getDailyStoriesStorageKey(dateKey));
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
};

export const writeSeenDailyStories = (
  ids: Iterable<string>,
  dateKey: string = getDailyStoriesDateKey()
): void => {
  const storage = getStorage();
  if (!storage) return;

  const values = Array.from(new Set(Array.from(ids).filter(Boolean)));
  storage.setItem(getDailyStoriesStorageKey(dateKey), JSON.stringify(values));
};

export const markDailyStorySeen = (
  id: string,
  dateKey: string = getDailyStoriesDateKey()
): Set<string> => {
  const next = readSeenDailyStories(dateKey);
  next.add(id);
  writeSeenDailyStories(next, dateKey);
  return next;
};
