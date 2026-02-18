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

const sanitizeLemmaToken = (value: string): string =>
  value
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const extractSynonymLookupCandidates = (value: string): string[] => {
  const base = value.trim();
  if (!base) return [];

  const chunks = base
    .split(/[;,/|]+/g)
    .map(sanitizeLemmaToken)
    .filter(Boolean);

  const sourceChunks = chunks.length > 0 ? chunks : [sanitizeLemmaToken(base)].filter(Boolean);
  const candidates = new Set<string>();

  sourceChunks.forEach((chunk) => {
    const normalizedChunk = normalizeFavoriteWordKey(chunk);
    if (normalizedChunk) candidates.add(normalizedChunk);
  });

  return Array.from(candidates);
};

type SynonymsRow = {
  hitza: string;
  sinonimoak: unknown;
};

type SynonymExpansionEntry = {
  hitza: string;
  sinonimoak: string[];
};

let cachedSynonymExpansionData: {
  byWord: Map<string, string[]>;
  reverseBySynonym: Map<string, SynonymExpansionEntry[]>;
} | null = null;
let synonymExpansionCacheUnavailable = false;

const clearSynonymExpansionCache = (): void => {
  cachedSynonymExpansionData = null;
  synonymExpansionCacheUnavailable = false;
};

const normalizeSearchTerm = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

type SearchPatternMode = 'prefix' | 'suffix' | 'contains';

const normalizedTextMatchesMode = (
  normalizedCandidate: string,
  normalizedToken: string,
  matchMode: SearchPatternMode
): boolean => {
  if (!normalizedCandidate) return false;
  if (matchMode === 'contains') {
    return normalizedCandidate.includes(normalizedToken);
  }
  if (matchMode === 'suffix') {
    return normalizedCandidate.endsWith(normalizedToken);
  }
  return normalizedCandidate.startsWith(normalizedToken);
};

const parseSearchPattern = (
  rawTerm: string
): { token: string; matchMode: SearchPatternMode } | null => {
  const normalizedTerm = rawTerm.trim().toLowerCase();
  if (!normalizedTerm) return null;

  const hasLeadingWildcard = normalizedTerm.startsWith('*');
  const hasTrailingWildcard = normalizedTerm.endsWith('*');

  let token = normalizedTerm;
  let matchMode: SearchPatternMode = 'prefix';

  if (hasLeadingWildcard && hasTrailingWildcard && normalizedTerm.length >= 2) {
    matchMode = 'contains';
    token = normalizedTerm.slice(1, -1).trim();
  } else if (hasLeadingWildcard) {
    matchMode = 'suffix';
    token = normalizedTerm.slice(1).trim();
  } else if (hasTrailingWildcard) {
    token = normalizedTerm.slice(0, -1).trim();
  }

  const normalizedToken = token.replace(/\*/g, '').trim();
  if (!normalizedToken) return null;

  return { token: normalizedToken, matchMode };
};

const buildIlikePattern = (
  token: string,
  matchMode: SearchPatternMode
): string => {
  if (matchMode === 'contains') return `%${token}%`;
  if (matchMode === 'suffix') return `%${token}`;
  return `${token}%`;
};

const termMatchesMode = (
  candidate: string,
  normalizedToken: string,
  matchMode: SearchPatternMode
): boolean => {
  const normalizedCandidate = normalizeSearchTerm(candidate);
  return normalizedTextMatchesMode(normalizedCandidate, normalizedToken, matchMode);
};

export const searchWords = async (term: string): Promise<SearchResultItem[]> => {
  const parsedPattern = parseSearchPattern(term);
  if (!parsedPattern) return [];

  const { token, matchMode } = parsedPattern;
  const normalizedToken = normalizeSearchTerm(token);
  if (!normalizedToken) return [];

  const pattern = buildIlikePattern(token, matchMode);
  const selectColumns = 'source_id, hitza, sinonimoak, level';

  const { data: hitzaData, error: hitzaError } = await supabase
    .from('syn_words')
    .select(selectColumns)
    .ilike('hitza', pattern)
    .eq('active', true)
    .order('hitza', { ascending: true })
    .limit(200);

  type SynWordRow = {
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
    level: DifficultyLevel;
  };

  const rowsByHitza = hitzaError || !hitzaData ? [] : (hitzaData as SynWordRow[]);
  let rowsBySynonym: SynWordRow[] = [];

  const { data: searchTextData, error: searchTextError } = await supabase
    .from('syn_words')
    .select(selectColumns)
    .ilike('search_text', `%${token}%`)
    .eq('active', true)
    .order('hitza', { ascending: true })
    .limit(300);

  if (!searchTextError && searchTextData) {
    rowsBySynonym = searchTextData as SynWordRow[];
  } else {
    const errorMessage = (searchTextError?.message ?? '').toLowerCase();
    const isMissingSearchTextColumn =
      errorMessage.includes('search_text') && errorMessage.includes('does not exist');

    if (isMissingSearchTextColumn) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('syn_words')
        .select(selectColumns)
        .eq('active', true)
        .order('hitza', { ascending: true })
        .limit(1200);
      if (!fallbackError && fallbackData) {
        rowsBySynonym = fallbackData as SynWordRow[];
      }
    }
  }

  const merged = new Map<string, SynWordRow>();
  [...rowsByHitza, ...rowsBySynonym].forEach((row) => {
    const key = String(row.source_id ?? row.hitza).trim();
    if (!key || merged.has(key)) return;
    merged.set(key, row);
  });

  const filteredRows = Array.from(merged.values())
    .filter((row) => {
      if (termMatchesMode(row.hitza, normalizedToken, matchMode)) return true;
      const synonyms = normalizeSynonyms(row.sinonimoak);
      return synonyms.some((synonym) =>
        termMatchesMode(synonym, normalizedToken, matchMode)
      );
    })
    .sort((a, b) => a.hitza.localeCompare(b.hitza, 'eu', { sensitivity: 'base' }))
    .slice(0, 200);

  return filteredRows.map((row) => ({
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

export type AddSynonymWordErrorReason =
  | 'invalid'
  | 'duplicate'
  | 'missing_table'
  | 'missing_function'
  | 'error';

export type AddSynonymWordResult = {
  ok: boolean;
  error: { reason: AddSynonymWordErrorReason; message: string } | null;
};

type AddSynonymWordRpcResponse = {
  ok?: boolean;
  reason?: string | null;
  message?: string | null;
};

const normalizeSynonymWordInput = (value: string): string => value.trim().toLowerCase();

const sanitizeNewSynonyms = (value: string[]): string[] =>
  Array.from(
    new Set(
      value
        .map((item) => normalizeSynonymWordInput(item))
        .filter((item) => item.length > 0)
    )
  );

export const addSynonymWord = async (
  word: string,
  synonyms: string[]
): Promise<AddSynonymWordResult> => {
  const normalizedWord = normalizeSynonymWordInput(word);
  const sanitizedSynonyms = sanitizeNewSynonyms(synonyms).filter(
    (synonym) => synonym !== normalizedWord
  );

  if (!normalizedWord) {
    return {
      ok: false,
      error: {
        reason: 'invalid',
        message: 'Hitza bete behar da.',
      },
    };
  }

  if (sanitizedSynonyms.length === 0) {
    return {
      ok: false,
      error: {
        reason: 'invalid',
        message: 'Sinonimo bat gutxienez behar da.',
      },
    };
  }

  const { data, error } = await supabase.rpc('add_synonym_word', {
    p_word: normalizedWord,
    p_synonyms: sanitizedSynonyms,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      (message.includes('function') && message.includes('add_synonym_word')) ||
      (message.includes('could not find the function') &&
        message.includes('add_synonym_word'))
    ) {
      return {
        ok: false,
        error: {
          reason: 'missing_function',
          message:
            'Sinonimo berriak gehitzeko funtzioa falta da Supabasen. Exekutatu supabase_favorites.sql.',
        },
      };
    }
    if (message.includes('relation') && message.includes('syn_words')) {
      return {
        ok: false,
        error: {
          reason: 'missing_table',
          message: '"syn_words" taula falta da Supabasen.',
        },
      };
    }
    return {
      ok: false,
      error: {
        reason: 'error',
        message: error.message,
      },
    };
  }

  const payload =
    data && typeof data === 'object'
      ? (data as AddSynonymWordRpcResponse)
      : null;

  if (!payload) {
    return {
      ok: false,
      error: {
        reason: 'error',
        message: 'Supabasetik erantzun baliogabea jaso da.',
      },
    };
  }

  if (payload.ok) {
    clearSynonymExpansionCache();
    return { ok: true, error: null };
  }

  const reason = (payload.reason ?? 'error').toLowerCase();
  if (reason === 'duplicate') {
    return {
      ok: false,
      error: {
        reason: 'duplicate',
        message:
          payload.message ?? 'Hitza jada badago sinonimoen hiztegian.',
      },
    };
  }
  if (reason === 'missing_table') {
    return {
      ok: false,
      error: {
        reason: 'missing_table',
        message: payload.message ?? '"syn_words" taula falta da Supabasen.',
      },
    };
  }
  if (reason === 'invalid') {
    return {
      ok: false,
      error: {
        reason: 'invalid',
        message: payload.message ?? 'Datuak ez dira baliozkoak.',
      },
    };
  }

  return {
    ok: false,
    error: {
      reason: 'error',
      message: payload.message ?? 'Ezin izan da sinonimoa gehitu.',
    },
  };
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

const DICTIONARY_DEFINITIONS_TABLE = 'diccionario_definiciones';
const DICTIONARY_ID_COLUMN_CANDIDATES = [
  'id',
  'diccionario_id',
  'dictionary_id',
  'entry_id',
  'word_id',
  'source_id',
];
const DICTIONARY_DEFINITION_REFERENCE_COLUMN_CANDIDATES = [
  'diccionario_id',
  'dictionary_id',
  'entry_id',
  'word_id',
  'id_diccionario',
  'diccionarioid',
  'lemma_id',
];
const DICTIONARY_DEFINITION_TEXT_COLUMN_CANDIDATES = [
  'definizioa',
  'definition',
  'definicion',
  'significado',
  'meaning',
  'esanahia',
  'descripcion',
  'description',
  'deskribapena',
  'azalpena',
  'testua',
  'texto',
  'contenido',
  'acepcion',
];
const DICTIONARY_DEFINITION_ORDER_COLUMN_CANDIDATES = [
  'orden',
  'order',
  'position',
  'indice',
  'index',
  'numero',
  'number',
  'acepcion',
];

let cachedDictionaryWordColumn: string | null = null;
let cachedDictionaryMeaningColumn: string | null = null;
let cachedDictionaryTextColumns: string[] | null = null;
let isDictionaryTableUnavailable = false;
const invalidDictionaryWordColumns = new Set<string>();
let isDictionaryDefinitionsTableUnavailable = false;
let cachedDictionaryDefinitionReferenceColumns: string[] | null = null;
let cachedDictionaryDefinitionTextColumns: string[] | null = null;
let cachedDictionaryDefinitionOrderColumn: string | null = null;
const invalidDictionaryDefinitionReferenceColumns = new Set<string>();

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

const isDictionaryDefinitionsErrorForMissingTable = (message: string): boolean =>
  message.includes('relation') && message.includes(DICTIONARY_DEFINITIONS_TABLE);

const isDictionaryDefinitionsErrorForInvalidColumn = (message: string): boolean =>
  (message.includes('column') && message.includes('does not exist')) ||
  message.includes('operator does not exist') ||
  message.includes('operator =');

const sanitizeSearchToken = (term: string): string =>
  term.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeComparableText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDictionaryIdentifier = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.toLowerCase();
};

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

const findDictionaryEntryIdValue = (row: Record<string, unknown>): string | null => {
  for (const key of Object.keys(row)) {
    if (!DICTIONARY_ID_COLUMN_CANDIDATES.includes(key.toLowerCase())) continue;
    const normalized = normalizeDictionaryIdentifier(row[key]);
    if (normalized) return normalized;
  }

  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeDictionaryKey(key);
    if (normalizedKey !== 'id' && !normalizedKey.endsWith('id')) continue;
    const normalized = normalizeDictionaryIdentifier(row[key]);
    if (normalized) return normalized;
  }

  return null;
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
  options: { matchMode: SearchPatternMode; limit: number }
): Promise<Array<Record<string, unknown>> | null> => {
  if (isDictionaryTableUnavailable || invalidDictionaryWordColumns.has(column)) {
    return [];
  }

  const perTermLimit = Math.max(20, Math.ceil(options.limit / Math.max(terms.length, 1)));
  const collected: Array<Record<string, unknown>> = [];

  for (const term of terms) {
    const pattern = buildIlikePattern(term, options.matchMode);
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

type DictionaryDefinitionsMetadata = {
  referenceColumns: string[];
  textColumns: string[];
  orderColumn: string | null;
};

const probeDictionaryDefinitionsMetadata = async (): Promise<DictionaryDefinitionsMetadata | null> => {
  if (isDictionaryDefinitionsTableUnavailable) return null;
  if (cachedDictionaryDefinitionReferenceColumns && cachedDictionaryDefinitionTextColumns) {
    return {
      referenceColumns: cachedDictionaryDefinitionReferenceColumns,
      textColumns: cachedDictionaryDefinitionTextColumns,
      orderColumn: cachedDictionaryDefinitionOrderColumn,
    };
  }

  const { data, error } = await supabasePublic
    .from(DICTIONARY_DEFINITIONS_TABLE)
    .select('*')
    .limit(1);

  if (error) {
    const message = error.message.toLowerCase();
    if (isDictionaryDefinitionsErrorForMissingTable(message)) {
      isDictionaryDefinitionsTableUnavailable = true;
    }
    return null;
  }

  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) {
    cachedDictionaryDefinitionReferenceColumns = [...DICTIONARY_DEFINITION_REFERENCE_COLUMN_CANDIDATES];
    cachedDictionaryDefinitionTextColumns = [...DICTIONARY_DEFINITION_TEXT_COLUMN_CANDIDATES];
    cachedDictionaryDefinitionOrderColumn = null;
    return {
      referenceColumns: cachedDictionaryDefinitionReferenceColumns,
      textColumns: cachedDictionaryDefinitionTextColumns,
      orderColumn: cachedDictionaryDefinitionOrderColumn,
    };
  }

  const keys = Object.keys(row);
  const referenceColumns: string[] = [];
  const referenceSeen = new Set<string>();
  const pushReferenceColumn = (key: string): void => {
    const normalized = key.toLowerCase();
    if (referenceSeen.has(normalized)) return;
    referenceSeen.add(normalized);
    referenceColumns.push(key);
  };

  keys
    .filter((key) =>
      DICTIONARY_DEFINITION_REFERENCE_COLUMN_CANDIDATES.includes(key.toLowerCase())
    )
    .forEach(pushReferenceColumn);

  keys.forEach((key) => {
    const normalized = normalizeDictionaryKey(key);
    if (normalized.includes('diccionario') && normalized.includes('id')) {
      pushReferenceColumn(key);
    }
  });

  keys.forEach((key) => {
    const normalized = normalizeDictionaryKey(key);
    if (normalized !== 'id' && !normalized.endsWith('id')) return;
    pushReferenceColumn(key);
  });

  const textColumns: string[] = [];
  const textSeen = new Set<string>();
  const pushTextColumn = (key: string): void => {
    const normalized = key.toLowerCase();
    if (textSeen.has(normalized)) return;
    textSeen.add(normalized);
    textColumns.push(key);
  };

  keys
    .filter((key) =>
      DICTIONARY_DEFINITION_TEXT_COLUMN_CANDIDATES.includes(key.toLowerCase())
    )
    .forEach(pushTextColumn);

  keys.forEach((key) => {
    if (referenceSeen.has(key.toLowerCase())) return;
    if (!valueAsText(row[key])) return;
    if (keyMatchesHints(key, DICTIONARY_MEANING_KEY_HINTS)) {
      pushTextColumn(key);
    }
  });

  if (textColumns.length === 0) {
    keys.forEach((key) => {
      if (referenceSeen.has(key.toLowerCase())) return;
      const normalized = normalizeDictionaryKey(key);
      if (normalized.includes('id')) return;
      if (normalized.includes('created') || normalized.includes('updated')) return;
      if (normalized.includes('order') || normalized.includes('indice')) return;
      if (!valueAsText(row[key])) return;
      pushTextColumn(key);
    });
  }

  const orderColumn =
    keys.find((key) =>
      DICTIONARY_DEFINITION_ORDER_COLUMN_CANDIDATES.includes(key.toLowerCase())
    ) ?? null;

  cachedDictionaryDefinitionReferenceColumns =
    referenceColumns.length > 0
      ? referenceColumns
      : [...DICTIONARY_DEFINITION_REFERENCE_COLUMN_CANDIDATES];
  cachedDictionaryDefinitionTextColumns =
    textColumns.length > 0
      ? textColumns
      : [...DICTIONARY_DEFINITION_TEXT_COLUMN_CANDIDATES];
  cachedDictionaryDefinitionOrderColumn = orderColumn;

  return {
    referenceColumns: cachedDictionaryDefinitionReferenceColumns,
    textColumns: cachedDictionaryDefinitionTextColumns,
    orderColumn: cachedDictionaryDefinitionOrderColumn,
  };
};

const normalizeDefinitionParagraph = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractDefinitionParagraph = (
  row: Record<string, unknown>,
  textColumns: string[],
  referenceColumns: string[],
  orderColumn: string | null
): string | null => {
  for (const column of textColumns) {
    const text = valueAsText(row[column]);
    if (!text) continue;
    const normalizedText = normalizeDefinitionParagraph(text);
    if (normalizedText) return normalizedText;
  }

  const referenceSet = new Set(referenceColumns.map((column) => column.toLowerCase()));
  const fallbackKey = Object.keys(row).find((key) => {
    if (referenceSet.has(key.toLowerCase())) return false;
    if (orderColumn && key === orderColumn) return false;
    const normalized = normalizeDictionaryKey(key);
    if (normalized.includes('id')) return false;
    if (normalized.includes('created') || normalized.includes('updated')) return false;
    return Boolean(valueAsText(row[key]));
  });

  if (!fallbackKey) return null;
  const fallbackValue = valueAsText(row[fallbackKey]);
  if (!fallbackValue) return null;
  const normalizedFallback = normalizeDefinitionParagraph(fallbackValue);
  return normalizedFallback || null;
};

const fetchDictionaryDefinitionsByEntryIds = async (
  entryIds: string[]
): Promise<Map<string, string[]>> => {
  const definitionsByEntryId = new Map<string, string[]>();
  const uniqueEntryIds = Array.from(new Set(entryIds.filter(Boolean)));
  if (uniqueEntryIds.length === 0) return definitionsByEntryId;

  const metadata = await probeDictionaryDefinitionsMetadata();
  if (!metadata) return definitionsByEntryId;

  const aggregatedByEntryId = new Map<string, Map<string, string>>();
  const entryIdSet = new Set(uniqueEntryIds);
  const referenceColumns =
    metadata.referenceColumns.length > 0
      ? metadata.referenceColumns
      : DICTIONARY_DEFINITION_REFERENCE_COLUMN_CANDIDATES;

  for (const referenceColumn of referenceColumns) {
    if (invalidDictionaryDefinitionReferenceColumns.has(referenceColumn)) continue;

    let query = supabasePublic
      .from(DICTIONARY_DEFINITIONS_TABLE)
      .select('*')
      .in(referenceColumn, uniqueEntryIds)
      .limit(5000);

    if (metadata.orderColumn && metadata.orderColumn !== referenceColumn) {
      query = query.order(metadata.orderColumn, { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      const message = error.message.toLowerCase();
      if (isDictionaryDefinitionsErrorForMissingTable(message)) {
        isDictionaryDefinitionsTableUnavailable = true;
        return definitionsByEntryId;
      }
      if (isDictionaryDefinitionsErrorForInvalidColumn(message)) {
        invalidDictionaryDefinitionReferenceColumns.add(referenceColumn);
      }
      continue;
    }

    if (!data || data.length === 0) continue;

    (data as Array<Record<string, unknown>>).forEach((row) => {
      const normalizedReferenceId = normalizeDictionaryIdentifier(row[referenceColumn]);
      if (!normalizedReferenceId || !entryIdSet.has(normalizedReferenceId)) return;

      const paragraph = extractDefinitionParagraph(
        row,
        metadata.textColumns,
        referenceColumns,
        metadata.orderColumn
      );
      if (!paragraph) return;

      const dedupeKey = normalizeComparableText(paragraph);
      const currentParagraphs = aggregatedByEntryId.get(normalizedReferenceId) ?? new Map();
      if (!currentParagraphs.has(dedupeKey)) {
        currentParagraphs.set(dedupeKey, paragraph);
      }
      aggregatedByEntryId.set(normalizedReferenceId, currentParagraphs);
    });

    break;
  }

  aggregatedByEntryId.forEach((paragraphs, entryId) => {
    definitionsByEntryId.set(entryId, Array.from(paragraphs.values()));
  });

  return definitionsByEntryId;
};

const buildSynonymExpansionCache = (
  rows: SynonymsRow[]
): {
  byWord: Map<string, string[]>;
  reverseBySynonym: Map<string, SynonymExpansionEntry[]>;
} => {
  const byWord = new Map<string, string[]>();
  const reverseBySynonym = new Map<string, SynonymExpansionEntry[]>();

  rows.forEach((row) => {
    const hitza = row.hitza.trim();
    const wordKey = normalizeFavoriteWordKey(hitza);
    if (!wordKey) return;

    const synonyms = normalizeSynonyms(row.sinonimoak);
    const mergedDirectSynonyms = new Set(byWord.get(wordKey) ?? []);
    synonyms.forEach((synonym) => {
      const synonymKey = normalizeFavoriteWordKey(synonym);
      if (!synonymKey || synonymKey === wordKey) return;
      mergedDirectSynonyms.add(synonym);
    });
    byWord.set(wordKey, Array.from(mergedDirectSynonyms));

    const entry: SynonymExpansionEntry = { hitza, sinonimoak: synonyms };
    synonyms.forEach((synonym) => {
      const synonymKey = normalizeFavoriteWordKey(synonym);
      if (!synonymKey) return;
      const rowsForSynonym = reverseBySynonym.get(synonymKey) ?? [];
      rowsForSynonym.push(entry);
      reverseBySynonym.set(synonymKey, rowsForSynonym);
    });
  });

  return { byWord, reverseBySynonym };
};

const getSynonymExpansionCache = async (): Promise<{
  byWord: Map<string, string[]>;
  reverseBySynonym: Map<string, SynonymExpansionEntry[]>;
} | null> => {
  if (cachedSynonymExpansionData) return cachedSynonymExpansionData;
  if (synonymExpansionCacheUnavailable) return null;

  const { data, error } = await supabase
    .from('syn_words')
    .select('hitza, sinonimoak')
    .eq('active', true)
    .order('hitza', { ascending: true })
    .limit(5000);

  if (error || !data) {
    synonymExpansionCacheUnavailable = true;
    return null;
  }

  cachedSynonymExpansionData = buildSynonymExpansionCache(data as SynonymsRow[]);
  return cachedSynonymExpansionData;
};

const fetchSynonymsForDictionaryWords = async (
  words: string[]
): Promise<Map<string, string[]>> => {
  const synonymsByWord = new Map<string, string[]>();
  const requestedWords = Array.from(
    new Map(
      words
        .map((word) => {
          const originalKey = normalizeFavoriteWordKey(word);
          if (!originalKey) return null;

          const lookupKeys = Array.from(
            new Set([
              originalKey,
              ...extractSynonymLookupCandidates(word),
            ])
          );

          return [originalKey, lookupKeys] as const;
        })
        .filter(Boolean)
    ).entries()
  ).map(([originalKey, lookupKeys]) => ({ originalKey, lookupKeys }));

  if (requestedWords.length === 0) return synonymsByWord;

  const expansionCache = await getSynonymExpansionCache();
  if (!expansionCache) return synonymsByWord;

  requestedWords.forEach(({ originalKey, lookupKeys }) => {
    const merged = new Map<string, string>();
    const excludedKeys = new Set<string>(lookupKeys);

    const appendSynonym = (value: string): void => {
      const cleaned = value.trim();
      if (!cleaned) return;
      const cleanedKey = normalizeFavoriteWordKey(cleaned);
      if (!cleanedKey || excludedKeys.has(cleanedKey) || merged.has(cleanedKey)) return;
      merged.set(cleanedKey, cleaned);
    };

    lookupKeys.forEach((lookupKey) => {
      (expansionCache.byWord.get(lookupKey) ?? []).forEach(appendSynonym);
    });

    lookupKeys.forEach((lookupKey) => {
      (expansionCache.reverseBySynonym.get(lookupKey) ?? []).forEach((entry) => {
        appendSynonym(entry.hitza);
        entry.sinonimoak.forEach(appendSynonym);
      });
    });

    synonymsByWord.set(originalKey, Array.from(merged.values()));
  });

  return synonymsByWord;
};

export const searchDictionaryMeanings = async (
  term: string,
  limit = 200
): Promise<DictionaryMeaning[]> => {
  const parsedPattern = parseSearchPattern(term);
  if (!parsedPattern) return [];
  if (isDictionaryTableUnavailable) return [];

  const { token, matchMode } = parsedPattern;

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

  type DictionaryMeaningRow = {
    mapKey: string;
    hitza: string;
    esanahia: string;
    dictionaryEntryIds: string[];
  };

  const byWordKey = new Map<string, DictionaryMeaningRow>();
  const visitedColumns = new Set<string>();

  for (const column of columnsToTry) {
    if (visitedColumns.has(column)) continue;
    visitedColumns.add(column);

    const rows = await fetchDictionaryRowsByColumn(column, searchVariants, {
      matchMode,
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
      const matchesToken = normalizedTextMatchesMode(
        normalizedWord,
        normalizedToken,
        matchMode
      );
      if (!matchesToken) continue;

      const mapKey = normalizeFavoriteWordKey(hitza);
      if (!mapKey || byWordKey.has(mapKey)) continue;
      const dictionaryEntryId = findDictionaryEntryIdValue(row);
      byWordKey.set(mapKey, {
        mapKey,
        hitza,
        esanahia,
        dictionaryEntryIds: dictionaryEntryId ? [dictionaryEntryId] : [],
      });

      if (byWordKey.size >= limit) break;
    }

    if (byWordKey.size >= limit) break;
  }

  const baseRows = Array.from(byWordKey.values())
    .sort((a, b) => a.hitza.localeCompare(b.hitza, 'eu', { sensitivity: 'base' }))
    .slice(0, limit);

  if (baseRows.length === 0) return [];

  const dictionaryEntryIds = Array.from(
    new Set(baseRows.flatMap((row) => row.dictionaryEntryIds))
  );

  const definitionsByEntryId = await fetchDictionaryDefinitionsByEntryIds(
    dictionaryEntryIds
  );

  const synonymsByWord = await fetchSynonymsForDictionaryWords(
    baseRows.map((row) => row.hitza)
  );

  return baseRows.map((row) => ({
    hitza: row.hitza,
    esanahia: row.esanahia,
    sinonimoak: synonymsByWord.get(normalizeFavoriteWordKey(row.hitza)) ?? [],
    definizioak: (() => {
      const deduped = new Map<string, string>();
      row.dictionaryEntryIds.forEach((entryId) => {
        (definitionsByEntryId.get(entryId) ?? []).forEach((definition) => {
          const key = normalizeComparableText(definition);
          if (!key || deduped.has(key)) return;
          deduped.set(key, definition);
        });
      });

      if (deduped.size > 0) return Array.from(deduped.values());

      const fallback = row.esanahia.trim();
      return fallback ? [fallback] : [];
    })(),
  }));
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
