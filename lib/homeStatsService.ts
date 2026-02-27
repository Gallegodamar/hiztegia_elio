import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { DifficultyLevel } from '../types';

export type HomeStatsPoint = {
  day: string;
  reviews: number;
  favorites: number;
};

export type HomeStats = {
  favoritesCount: number;
  reviewedWordsCount7d: number;
  reviewEventsCount7d: number;
  series7d: HomeStatsPoint[];
};

export type ReviewEventSource = 'daily' | 'review' | 'practice';

type TrackFavoriteParams = {
  word: string;
  wordIdHint?: string | null;
  level?: DifficultyLevel | null;
};

type TrackReviewEventParams = {
  word: string;
  wordIdHint?: string | null;
  source: ReviewEventSource;
  isCorrect?: boolean | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_DAYS = 7;

const difficultyLevelToCefr = (level?: DifficultyLevel | null): 'B1' | 'B2' | 'C1' | 'C2' | null => {
  switch (level) {
    case 1:
      return 'B1';
    case 2:
      return 'B2';
    case 3:
      return 'C1';
    case 4:
      return 'C2';
    default:
      return null;
  }
};

const isUuid = (value: string | null | undefined): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value.trim());

const supabaseErrorMessage = (error: PostgrestError | null): string =>
  error?.message?.trim() || 'Supabase errorea';

const isMissingRelationOrFunction = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('relation') ||
    normalized.includes('does not exist') ||
    normalized.includes('could not find the function')
  );
};

const getAuthenticatedUserId = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

const parseNumber = (value: unknown): number => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

const parseSeriesPoint = (value: unknown): HomeStatsPoint | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const day = String(row.day ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return {
    day,
    reviews: parseNumber(row.reviews),
    favorites: parseNumber(row.favorites),
  };
};

const buildEmptySeries = (days: number): HomeStatsPoint[] => {
  const safeDays = Math.max(1, Math.min(days, 31));
  const rows: HomeStatsPoint[] = [];
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    rows.push({
      day: date.toISOString().slice(0, 10),
      reviews: 0,
      favorites: 0,
    });
  }
  return rows;
};

const parseHomeStats = (value: unknown, days = DEFAULT_DAYS): HomeStats => {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null;
  if (!row || typeof row !== 'object') {
    return {
      favoritesCount: 0,
      reviewedWordsCount7d: 0,
      reviewEventsCount7d: 0,
      series7d: buildEmptySeries(days),
    };
  }

  const parsedSeries = Array.isArray(row.series_7d)
    ? row.series_7d.map(parseSeriesPoint).filter((item): item is HomeStatsPoint => Boolean(item))
    : [];

  return {
    favoritesCount: parseNumber(row.favorites_count),
    reviewedWordsCount7d: parseNumber(row.reviewed_words_count_7d),
    reviewEventsCount7d: parseNumber(row.review_events_count_7d),
    series7d: parsedSeries.length > 0 ? parsedSeries : buildEmptySeries(days),
  };
};

const findWordIdByLemma = async (lemma: string): Promise<string | null> => {
  const normalizedLemma = lemma.trim();
  if (!normalizedLemma) return null;

  const { data, error } = await supabase
    .from('words')
    .select('id')
    .eq('lemma', normalizedLemma)
    .maybeSingle();

  if (error) {
    throw new Error(supabaseErrorMessage(error));
  }

  const id = typeof data?.id === 'string' ? data.id.trim() : '';
  return id || null;
};

const getOrCreateWordId = async (
  lemma: string,
  options?: { wordIdHint?: string | null; level?: DifficultyLevel | null }
): Promise<string | null> => {
  const normalizedLemma = lemma.trim();
  if (!normalizedLemma) return null;

  const hintedId = options?.wordIdHint?.trim() ?? '';
  if (isUuid(hintedId)) {
    const { data, error } = await supabase.from('words').select('id').eq('id', hintedId).maybeSingle();
    if (error) {
      throw new Error(supabaseErrorMessage(error));
    }
    if (typeof data?.id === 'string' && data.id.trim()) {
      return data.id.trim();
    }
  }

  const existingId = await findWordIdByLemma(normalizedLemma);
  if (existingId) return existingId;

  const { data, error } = await supabase
    .from('words')
    .insert({
      lemma: normalizedLemma,
      level: difficultyLevelToCefr(options?.level),
    })
    .select('id')
    .single();

  if (error) {
    // Retry read in case another request inserted the lemma concurrently.
    if (String(error.code ?? '') === '23505') {
      return findWordIdByLemma(normalizedLemma);
    }
    throw new Error(supabaseErrorMessage(error));
  }

  return typeof data?.id === 'string' && data.id.trim() ? data.id.trim() : null;
};

export const getHomeStats = async (days = DEFAULT_DAYS): Promise<HomeStats | null> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const safeDays = Math.max(1, Math.min(Math.floor(days) || DEFAULT_DAYS, 31));
  const { data, error } = await supabase.rpc('get_home_stats', { p_days: safeDays });
  if (error) {
    throw new Error(supabaseErrorMessage(error));
  }

  return parseHomeStats(data, safeDays);
};

export const trackFavoriteAdded = async ({
  word,
  wordIdHint,
  level,
}: TrackFavoriteParams): Promise<void> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;

  const wordId = await getOrCreateWordId(word, { wordIdHint, level });
  if (!wordId) return;

  const { error } = await supabase
    .from('user_favorites')
    .upsert(
      {
        user_id: userId,
        word_id: wordId,
      },
      {
        onConflict: 'user_id,word_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(supabaseErrorMessage(error));
  }
};

export const trackFavoriteRemoved = async ({
  word,
  wordIdHint,
}: Pick<TrackFavoriteParams, 'word' | 'wordIdHint'>): Promise<void> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;

  let wordId: string | null = null;
  if (isUuid(wordIdHint)) {
    wordId = wordIdHint.trim();
  } else {
    wordId = await findWordIdByLemma(word);
  }

  if (!wordId) return;

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('word_id', wordId);

  if (error) {
    throw new Error(supabaseErrorMessage(error));
  }
};

export const trackReviewEvent = async ({
  word,
  wordIdHint,
  source,
  isCorrect = null,
}: TrackReviewEventParams): Promise<void> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;

  const wordId = await getOrCreateWordId(word, { wordIdHint });
  if (!wordId) return;

  const { error } = await supabase.from('review_events').insert({
    user_id: userId,
    word_id: wordId,
    source,
    is_correct: typeof isCorrect === 'boolean' ? isCorrect : null,
  });

  if (error) {
    throw new Error(supabaseErrorMessage(error));
  }
};

export const isHomeStatsUnavailableError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    isMissingRelationOrFunction(normalized) ||
    normalized.includes('row-level security') ||
    normalized.includes('permission denied')
  );
};

export const homeStatsService = {
  getHomeStats,
  trackFavoriteAdded,
  trackFavoriteRemoved,
  trackReviewEvent,
};

