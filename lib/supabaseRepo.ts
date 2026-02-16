import { DifficultyLevel } from '../types';
import { DictionaryMeaning, SearchResultItem } from '../appTypes';
import { supabase, supabasePublic } from '../supabase';
import {
  FavoriteWord,
  FavoritesByDate,
  normalizeFavoriteWordKey,
  SearchMode,
} from './userFavorites';
import { formatLocalDate } from './dateUtils';

const normalizeSynonyms = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
};

export const searchWords = async (term: string): Promise<SearchResultItem[]> => {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return [];

  const isSuffixSearch = normalizedTerm.startsWith('*');
  const token = normalizedTerm.replace(/\*/g, '').trim();
  if (token.length < 1) return [];

  const pattern = isSuffixSearch ? `%${token}` : `${token}%`;

  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak, level')
    .ilike('hitza', pattern)
    .eq('active', true)
    .order('hitza', { ascending: true })
    .limit(200);

  if (error || !data) return [];

  const rows = data as Array<{
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
    level: DifficultyLevel;
  }>;

  return rows.map((row) => ({
    id: row.source_id,
    hitza: row.hitza,
    sinonimoak: normalizeSynonyms(row.sinonimoak),
    level: row.level,
  }));
};

export type UserKeyValidationResult = {
  ok: boolean;
  missingValidationFunction?: boolean;
};

export type RegisteredUserLoginResult = {
  ok: boolean;
  normalizedUsername?: string;
  invalidCredentials?: boolean;
  errorMessage?: string;
};

const isInvalidAuthCredentialsError = (error: { message?: string; code?: string }): boolean => {
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password')
  );
};

const normalizeLoginUsername = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  if (!normalized.includes('@')) return normalized;
  return normalized.split('@')[0] ?? normalized;
};

export const signInWithRegisteredUser = async (
  usernameOrEmail: string,
  password: string
): Promise<RegisteredUserLoginResult> => {
  const normalizedInput = usernameOrEmail.trim().toLowerCase();
  const normalizedPassword = password.trim();
  if (!normalizedInput || !normalizedPassword) {
    return { ok: false, invalidCredentials: true };
  }

  const candidateEmails = normalizedInput.includes('@')
    ? [normalizedInput]
    : [`${normalizedInput}@tuapp.local`];

  let lastInvalidCredentialError = false;
  for (const email of candidateEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: normalizedPassword,
    });

    if (!error && data.user) {
      const fallbackUsername = normalizeLoginUsername(normalizedInput);
      const resolvedFromEmail =
        typeof data.user.email === 'string' && data.user.email.trim().length > 0
          ? normalizeLoginUsername(data.user.email)
          : fallbackUsername;
      return {
        ok: true,
        normalizedUsername: resolvedFromEmail || fallbackUsername,
      };
    }

    if (!error) continue;
    if (isInvalidAuthCredentialsError(error)) {
      lastInvalidCredentialError = true;
      continue;
    }

    return { ok: false, errorMessage: error.message };
  }

  return { ok: false, invalidCredentials: true };
};

export const signOutRegisteredUser = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const validateUserAccessKey = async (
  username: string,
  userKey: string
): Promise<UserKeyValidationResult> => {
  const normalizedUser = username.trim().toLowerCase();
  if (!normalizedUser || normalizedUser.length < 2 || !userKey.trim()) {
    return { ok: false };
  }

  const { data, error } = await supabase.rpc('validate_user_key', {
    p_user_name: normalizedUser,
    p_key: userKey,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      (message.includes('function') && message.includes('validate_user_key')) ||
      (message.includes('could not find the function') &&
        message.includes('validate_user_key'))
    ) {
      return { ok: false, missingValidationFunction: true };
    }
    return { ok: false };
  }

  return { ok: Boolean(data) };
};

const DICTIONARY_WORD_COLUMN_CANDIDATES = [
  'hitza',
  'basque',
  'palabra',
  'word',
  'termino',
  'term',
  'lemma',
  'entry',
  'entrada',
  'vocablo',
];

const DICTIONARY_MEANING_COLUMN_CANDIDATES = [
  'esanahia',
  'spanish',
  'significado',
  'definition',
  'meaning',
  'definizioa',
  'azalpena',
  'deskribapena',
  'descripcion',
  'definicion',
  'glosa',
];

let cachedDictionaryWordColumn: string | null = null;
let cachedDictionaryMeaningColumn: string | null = null;
let cachedDictionaryTextColumns: string[] | null = null;
let isDictionaryTableUnavailable = false;
const invalidDictionaryWordColumns = new Set<string>();

const DICTIONARY_WORD_KEY_HINTS = [
  'hitz',
  'basq',
  'palabr',
  'word',
  'term',
  'lemma',
  'entrad',
  'vocabl',
];

const DICTIONARY_MEANING_KEY_HINTS = [
  'esanah',
  'spani',
  'signific',
  'defini',
  'mean',
  'azalp',
  'deskrib',
  'descri',
  'glosa',
];

const normalizeDictionaryKey = (key: string): string =>
  key.toLowerCase().replace(/[\s_-]/g, '');

const keyMatchesHints = (key: string, hints: string[]): boolean => {
  const normalized = normalizeDictionaryKey(key);
  return hints.some((hint) => normalized.includes(hint));
};

const isDictionaryErrorForMissingTable = (message: string): boolean =>
  message.includes('relation') && message.includes('diccionario');

const isDictionaryErrorForInvalidColumn = (message: string): boolean =>
  (message.includes('column') && message.includes('does not exist')) ||
  message.includes('operator does not exist') ||
  message.includes('operator ~~*');

const sanitizeSearchToken = (term: string): string =>
  term.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeComparableText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildDictionarySearchVariants = (term: string): string[] => {
  const stripOuterPunctuation = (value: string): string =>
    value.replace(
      /^[\s"'`Â´â€˜â€™â€œâ€Â«Â»â€¹â€º()[\]{}.,;:!?Â¿Â¡\-_/\\]+|[\s"'`Â´â€˜â€™â€œâ€Â«Â»â€¹â€º()[\]{}.,;:!?Â¿Â¡\-_/\\]+$/g,
      ''
    );

  const base = term.trim();
  const stripped = stripOuterPunctuation(base);
  const deAccented = stripped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const candidates = [
    base,
    stripped,
    deAccented,
    stripped.slice(1),
    stripped.slice(0, -1),
    stripped.slice(1, -1),
  ];

  const unique = new Set<string>();
  for (const item of candidates) {
    const cleaned = sanitizeSearchToken(item);
    if (!cleaned || cleaned.length < 1) continue;
    unique.add(cleaned);
  }

  return Array.from(unique);
};

const valueAsText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
};

const findMeaningKey = (
  row: Record<string, unknown>,
  wordKey: string | null
): string | null => {
  if (cachedDictionaryMeaningColumn) {
    const cachedKey = cachedDictionaryMeaningColumn;
    if (cachedKey !== wordKey && valueAsText(row[cachedKey])) return cachedKey;
  }

  const keys = Object.keys(row);
  for (const key of keys) {
    if (key === wordKey) continue;
    if (!valueAsText(row[key])) continue;

    if (
      DICTIONARY_MEANING_COLUMN_CANDIDATES.includes(key.toLowerCase()) ||
      keyMatchesHints(key, DICTIONARY_MEANING_KEY_HINTS)
    ) {
      cachedDictionaryMeaningColumn = key;
      return key;
    }
  }

  const fallback = keys.find((key) => {
    if (key === wordKey) return false;
    if (!valueAsText(row[key])) return false;
    return !keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS);
  });
  if (fallback) return fallback;

  const anyValue = keys.find(
    (key) => key !== wordKey && Boolean(valueAsText(row[key]))
  );
  return anyValue ?? null;
};

const findWordKey = (row: Record<string, unknown>): string | null => {
  if (cachedDictionaryWordColumn && valueAsText(row[cachedDictionaryWordColumn])) {
    return cachedDictionaryWordColumn;
  }

  for (const key of Object.keys(row)) {
    if (!valueAsText(row[key])) continue;
    if (
      DICTIONARY_WORD_COLUMN_CANDIDATES.includes(key.toLowerCase()) ||
      keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS)
    ) {
      return key;
    }
  }

  return Object.keys(row).find((key) => Boolean(valueAsText(row[key]))) ?? null;
};

const probeDictionaryTextColumns = async (): Promise<string[]> => {
  if (isDictionaryTableUnavailable) return [];
  if (cachedDictionaryTextColumns) return cachedDictionaryTextColumns;

  const { data, error } = await supabasePublic.from('diccionario').select('*').limit(1);
  if (error) {
    const message = error.message.toLowerCase();
    if (isDictionaryErrorForMissingTable(message)) {
      isDictionaryTableUnavailable = true;
    }
    cachedDictionaryTextColumns = [];
    return [];
  }

  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) {
    cachedDictionaryTextColumns = [...DICTIONARY_WORD_COLUMN_CANDIDATES];
    return cachedDictionaryTextColumns;
  }

  const textKeys = Object.keys(row).filter((key) => {
    const value = row[key];
    return value == null || typeof value === 'string' || Array.isArray(value);
  });

  const ordered = [
    ...textKeys.filter((key) => keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS)),
    ...textKeys.filter((key) => !keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS)),
  ];

  if (!cachedDictionaryMeaningColumn) {
    const suggestedMeaningColumn = textKeys.find((key) =>
      keyMatchesHints(key, DICTIONARY_MEANING_KEY_HINTS)
    );
    if (suggestedMeaningColumn) cachedDictionaryMeaningColumn = suggestedMeaningColumn;
  }

  if (!cachedDictionaryWordColumn) {
    const suggestedWordColumn = ordered[0] ?? null;
    if (suggestedWordColumn) cachedDictionaryWordColumn = suggestedWordColumn;
  }

  cachedDictionaryTextColumns =
    ordered.length > 0 ? ordered : [...DICTIONARY_WORD_COLUMN_CANDIDATES];

  return cachedDictionaryTextColumns;
};

const fetchDictionaryRowByColumn = async (
  column: string,
  terms: string[]
): Promise<Record<string, unknown> | null> => {
  if (isDictionaryTableUnavailable || invalidDictionaryWordColumns.has(column)) {
    return null;
  }

  const normalizeMatchText = (value: string): string =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

  const queryByPattern = async (
    pattern: string,
    limit: number
  ): Promise<Array<Record<string, unknown>> | null> => {
    const { data, error } = await supabasePublic
      .from('diccionario')
      .select('*')
      .ilike(column, pattern)
      .limit(limit);

    if (error) {
      const message = error.message.toLowerCase();
      if (isDictionaryErrorForMissingTable(message)) isDictionaryTableUnavailable = true;
      if (isDictionaryErrorForInvalidColumn(message)) invalidDictionaryWordColumns.add(column);
      return null;
    }

    return (data ?? []) as Array<Record<string, unknown>>;
  };

  for (const term of terms) {
    const exactRows = await queryByPattern(term, 1);
    if (exactRows === null) return null;
    if (exactRows.length > 0) return exactRows[0];
  }

  for (const term of terms) {
    const startsWithRows = await queryByPattern(`${term}%`, 8);
    if (startsWithRows === null) return null;
    if (startsWithRows.length > 0) return startsWithRows[0];
  }

  for (const term of terms) {
    const containsRows = await queryByPattern(`%${term}%`, 40);
    if (containsRows === null) return null;
    if (containsRows.length === 0) continue;

    const normalizedTerm = normalizeMatchText(term);
    let bestRow: Record<string, unknown> | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestLength = Number.POSITIVE_INFINITY;

    for (const row of containsRows) {
      const candidateValue = valueAsText(row[column]);
      if (!candidateValue) continue;

      const normalizedCandidate = normalizeMatchText(candidateValue);
      if (!normalizedCandidate) continue;

      let score = Number.POSITIVE_INFINITY;
      if (normalizedCandidate === normalizedTerm) {
        score = 0;
      } else if (normalizedCandidate.startsWith(`${normalizedTerm} `)) {
        score = 1;
      } else if (normalizedCandidate.startsWith(normalizedTerm)) {
        score = 2;
      } else if (` ${normalizedCandidate} `.includes(` ${normalizedTerm} `)) {
        score = 3;
      } else {
        const index = normalizedCandidate.indexOf(normalizedTerm);
        if (index >= 0) score = 10 + index;
      }

      if (!Number.isFinite(score)) continue;
      const length = normalizedCandidate.length;
      if (score < bestScore || (score === bestScore && length < bestLength)) {
        bestScore = score;
        bestLength = length;
        bestRow = row;
      }
    }

    if (bestRow) return bestRow;
  }

  return null;
};

const fetchDictionaryRowsByColumn = async (
  column: string,
  terms: string[],
  options: { suffixSearch: boolean; limit: number }
): Promise<Array<Record<string, unknown>> | null> => {
  if (isDictionaryTableUnavailable || invalidDictionaryWordColumns.has(column)) {
    return [];
  }

  const perTermLimit = Math.max(20, Math.ceil(options.limit / Math.max(terms.length, 1)));
  const collected: Array<Record<string, unknown>> = [];

  for (const term of terms) {
    const pattern = options.suffixSearch ? `%${term}` : `${term}%`;
    const { data, error } = await supabasePublic
      .from('diccionario')
      .select('*')
      .ilike(column, pattern)
      .limit(perTermLimit);

    if (error) {
      const message = error.message.toLowerCase();
      if (isDictionaryErrorForMissingTable(message)) isDictionaryTableUnavailable = true;
      if (isDictionaryErrorForInvalidColumn(message)) invalidDictionaryWordColumns.add(column);
      return null;
    }

    if (!data || data.length === 0) continue;
    collected.push(...(data as Array<Record<string, unknown>>));
    if (collected.length >= options.limit) break;
  }

  return collected.slice(0, options.limit);
};

export const searchDictionaryMeanings = async (
  term: string,
  limit = 200
): Promise<DictionaryMeaning[]> => {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];
  if (isDictionaryTableUnavailable) return [];

  const isSuffixSearch = normalized.startsWith('*');
  const token = normalized.replace(/\*/g, '').trim();
  if (!token) return [];

  const searchVariants = buildDictionarySearchVariants(token);
  if (searchVariants.length === 0) return [];

  const normalizedToken = normalizeComparableText(token);
  if (!normalizedToken) return [];

  const probedColumns = await probeDictionaryTextColumns();
  const columnsToTry = [
    ...(cachedDictionaryWordColumn ? [cachedDictionaryWordColumn] : []),
    ...DICTIONARY_WORD_COLUMN_CANDIDATES,
    ...probedColumns,
  ];

  const byWordKey = new Map<string, DictionaryMeaning>();
  const visitedColumns = new Set<string>();

  for (const column of columnsToTry) {
    if (visitedColumns.has(column)) continue;
    visitedColumns.add(column);

    const rows = await fetchDictionaryRowsByColumn(column, searchVariants, {
      suffixSearch: isSuffixSearch,
      limit,
    });
    if (!rows || rows.length === 0) continue;

    for (const row of rows) {
      const wordKey = findWordKey(row) ?? column;
      cachedDictionaryWordColumn = wordKey;

      const meaningKey = findMeaningKey(row, wordKey);
      if (!meaningKey) continue;

      const hitza = valueAsText(row[wordKey]);
      const esanahia = valueAsText(row[meaningKey]);
      if (!hitza || !esanahia) continue;

      const normalizedWord = normalizeComparableText(hitza);
      const matchesToken = isSuffixSearch
        ? normalizedWord.endsWith(normalizedToken)
        : normalizedWord.startsWith(normalizedToken);
      if (!matchesToken) continue;

      const mapKey = normalizeFavoriteWordKey(hitza);
      if (!mapKey || byWordKey.has(mapKey)) continue;
      byWordKey.set(mapKey, { hitza, esanahia });

      if (byWordKey.size >= limit) break;
    }

    if (byWordKey.size >= limit) break;
  }

  return Array.from(byWordKey.values())
    .sort((a, b) => a.hitza.localeCompare(b.hitza, 'eu', { sensitivity: 'base' }))
    .slice(0, limit);
};

export const lookupDictionaryMeaning = async (
  term: string
): Promise<DictionaryMeaning | null> => {
  const matches = await searchDictionaryMeanings(term, 1);
  return matches[0] ?? null;
};

const FAVORITES_TABLE = 'user_favorite_words';

export type FavoriteSyncErrorReason = 'missing_table' | 'duplicate' | 'error';

export type FavoriteSyncError = {
  reason: FavoriteSyncErrorReason;
  message: string;
};

type FavoriteRepoResult<T> = {
  data: T;
  error: FavoriteSyncError | null;
};

type FavoriteWordRow = {
  id: string | number;
  favorite_date: string | null;
  word: string;
  mode: SearchMode;
  meaning: string | null;
  synonyms: unknown;
  level: number | null;
  created_at: string | null;
};

type InsertFavoriteParams = {
  username: string;
  dateKey: string;
  word: string;
  mode: SearchMode;
  meaning?: string | null;
  synonyms?: string[];
  level?: DifficultyLevel | null;
};

type DeleteFavoriteParams = {
  username: string;
  favoriteId: string;
};

const isFavoriteMode = (value: unknown): value is SearchMode =>
  value === 'synonyms' || value === 'meaning';

const isFavoriteLevel = (value: unknown): value is DifficultyLevel =>
  value === 1 || value === 2 || value === 3 || value === 4;

const sanitizeFavoriteSynonyms = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (synonym): synonym is string =>
        typeof synonym === 'string' && synonym.trim().length > 0
    )
    .map((synonym) => synonym.trim());
};

const isMissingFavoritesTableError = (message: string): boolean =>
  message.includes('relation') && message.includes(FAVORITES_TABLE);

const mapFavoriteRow = (row: FavoriteWordRow): FavoriteWord => ({
  id: String(row.id),
  word: row.word.trim(),
  mode: isFavoriteMode(row.mode) ? row.mode : 'synonyms',
  savedAt: row.created_at ?? new Date().toISOString(),
  meaning:
    typeof row.meaning === 'string' && row.meaning.trim().length > 0
      ? row.meaning.trim()
      : null,
  synonyms: sanitizeFavoriteSynonyms(row.synonyms),
  level: isFavoriteLevel(row.level) ? row.level : null,
});

export const fetchFavoritesByUsername = async (
  username: string
): Promise<FavoriteRepoResult<FavoritesByDate>> => {
  const normalizedUser = username.trim().toLowerCase();
  if (!normalizedUser) return { data: {}, error: null };

  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select('id, favorite_date, word, mode, meaning, synonyms, level, created_at')
    .eq('user_name', normalizedUser)
    .order('created_at', { ascending: false });

  if (error) {
    const message = error.message.toLowerCase();
    if (isMissingFavoritesTableError(message)) {
      return {
        data: {},
        error: {
          reason: 'missing_table',
          message: `"${FAVORITES_TABLE}" taula falta da Supabasen.`,
        },
      };
    }
    return { data: {}, error: { reason: 'error', message: error.message } };
  }

  const grouped: FavoritesByDate = {};
  ((data ?? []) as FavoriteWordRow[]).forEach((row) => {
    const favorite = mapFavoriteRow(row);
    if (!favorite.word) return;
    const fallbackDate = formatLocalDate(new Date(favorite.savedAt));
    const dateKey =
      typeof row.favorite_date === 'string' && row.favorite_date.trim().length > 0
        ? row.favorite_date
        : fallbackDate;
    const rows = grouped[dateKey] ?? [];
    const exists = rows.some(
      (entry) =>
        normalizeFavoriteWordKey(entry.word) ===
        normalizeFavoriteWordKey(favorite.word)
    );
    if (exists) return;
    grouped[dateKey] = [...rows, favorite];
  });

  return { data: grouped, error: null };
};

export const insertFavoriteByUsername = async (
  params: InsertFavoriteParams
): Promise<
  FavoriteRepoResult<{
    dateKey: string;
    favorite: FavoriteWord;
  } | null>
> => {
  const normalizedUser = params.username.trim().toLowerCase();
  const word = params.word.trim();
  const wordKey = normalizeFavoriteWordKey(word);
  if (!normalizedUser || normalizedUser.length < 2 || !word || !wordKey) {
    return {
      data: null,
      error: { reason: 'error', message: 'Gogokoa gordetzeko datu osatugabeak.' },
    };
  }

  const synonyms = Array.from(
    new Set(
      (params.synonyms ?? [])
        .map((synonym) => synonym.trim())
        .filter((synonym) => synonym.length > 0)
    )
  );

  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .insert({
      user_name: normalizedUser,
      favorite_date: params.dateKey,
      word,
      word_key: wordKey,
      mode: params.mode,
      meaning: params.meaning?.trim() || null,
      synonyms,
      level: params.level ?? null,
    })
    .select('id, favorite_date, word, mode, meaning, synonyms, level, created_at')
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      return {
        data: null,
        error: { reason: 'duplicate', message: 'Hitza gaur jada gordeta dago.' },
      };
    }
    const message = error.message.toLowerCase();
    if (isMissingFavoritesTableError(message)) {
      return {
        data: null,
        error: {
          reason: 'missing_table',
          message: `"${FAVORITES_TABLE}" taula falta da Supabasen.`,
        },
      };
    }
    return { data: null, error: { reason: 'error', message: error.message } };
  }

  const row = data as FavoriteWordRow;
  const dateKey =
    typeof row.favorite_date === 'string' && row.favorite_date.trim().length > 0
      ? row.favorite_date
      : params.dateKey;

  return {
    data: { dateKey, favorite: mapFavoriteRow(row) },
    error: null,
  };
};

export const deleteFavoriteById = async (
  params: DeleteFavoriteParams
): Promise<FavoriteRepoResult<{ deleted: boolean }>> => {
  const normalizedUser = params.username.trim().toLowerCase();
  const favoriteId = Number(params.favoriteId);

  if (!normalizedUser || normalizedUser.length < 2 || !Number.isFinite(favoriteId)) {
    return {
      data: { deleted: false },
      error: { reason: 'error', message: 'Gogokoa ezabatzeko datu osatugabeak.' },
    };
  }

  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .delete()
    .eq('id', favoriteId)
    .eq('user_name', normalizedUser)
    .select('id');

  if (error) {
    const message = error.message.toLowerCase();
    if (isMissingFavoritesTableError(message)) {
      return {
        data: { deleted: false },
        error: {
          reason: 'missing_table',
          message: `"${FAVORITES_TABLE}" taula falta da Supabasen.`,
        },
      };
    }
    return {
      data: { deleted: false },
      error: { reason: 'error', message: error.message },
    };
  }

  return {
    data: { deleted: (data ?? []).length > 0 },
    error: null,
  };
};
