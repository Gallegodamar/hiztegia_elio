export type StudyMemoryStatsRow = {
  knownCount: number;
  againCount: number;
  lastReviewedAt: number;
};

export type StudyMemoryStatsMap = Record<string, StudyMemoryStatsRow>;

const STORAGE_KEY_PREFIX = 'hiztegia:favorites-study:v1:';

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const readFavoritesStudyStatsMemory = (username: string): StudyMemoryStatsMap => {
  if (typeof window === 'undefined') return {};

  const normalizedUser = username.trim().toLowerCase();
  if (!normalizedUser) return {};

  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${normalizedUser}`);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    if (!parsed || typeof parsed !== 'object') return {};

    const next: StudyMemoryStatsMap = {};
    Object.entries(parsed).forEach(([key, row]) => {
      if (!row || typeof row !== 'object') return;
      next[key] = {
        knownCount: Math.max(0, Math.round(toSafeNumber(row.knownCount))),
        againCount: Math.max(0, Math.round(toSafeNumber(row.againCount))),
        lastReviewedAt: toSafeNumber(row.lastReviewedAt),
      };
    });
    return next;
  } catch {
    return {};
  }
};
