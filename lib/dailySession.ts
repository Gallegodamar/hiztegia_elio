import { formatLocalDate } from './dateUtils';
import { getJSON, removeStoredKey, setJSON, type StorageLike } from './storage';

export const STUDY_HISTORY_STORAGE_KEY = 'hk:studyHistory';
export const STREAK_STORAGE_KEY = 'hk:streak';
export const DAILY_SESSION_STORAGE_PREFIX = 'hk:dailySession:';
export const REVIEW_SESSION_STORAGE_PREFIX = 'hk:reviewSession:';

const DAILY_QUESTION_COUNT = 5;
const VERY_OLD_DAYS_THRESHOLD = 21;
const DEFAULT_CONTEXT_TAG_HINTS = ['prentsa', 'albiste', 'berri', 'egunkari'];

export type StudyWordStatus = 'new' | 'learning' | 'reinforcing' | 'mastered';
export type StudySessionMode = 'daily' | 'review';

export type StudyWord = {
  id: string | number;
  word: string;
  meaning: string;
  tags?: string[];
  example?: string | null;
  level?: string | null;
};

export type StudyHistoryEntry = {
  lastSeen?: string | null;
  correct?: number;
  wrong?: number;
  difficulty?: number;
  nextReview?: string | null;
  correctStreak?: number;
  wrongCount?: number;
  status?: StudyWordStatus;
};

export type StudyHistory = Record<string, StudyHistoryEntry>;

export type DailyQuestion = {
  id: string;
  wordId: string;
  word: string;
  correctMeaning: string;
  distractors: string[];
  options: string[];
  explanation: string;
  example?: string | null;
};

export type DailySessionAnswer = {
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: string;
};

export type DailySession = {
  dateKey: string;
  mode?: StudySessionMode;
  ids: string[];
  currentIndex: number;
  completed: boolean;
  answers: Record<string, DailySessionAnswer>;
  questions: DailyQuestion[];
  score: number;
  completedAt: string | null;
  resultApplied: boolean;
  streakAfter: number | null;
  sourceWordIds?: string[];
};

export type StreakState = {
  current: number;
  lastCompletedDate: string | null;
};

type ValidStudyWord = {
  id: string;
  word: string;
  meaning: string;
  tags: string[];
  example?: string | null;
  level?: string | null;
};

type RngFn = () => number;

type BuildOptions = {
  rng?: RngFn;
  contextTagHints?: string[];
};

const defaultRng: RngFn = () => Math.random();

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const parseDateKey = (dateKey: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const addDaysToDateKey = (dateKey: string, days: number): string | null => {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  parsed.setDate(parsed.getDate() + days);
  return formatLocalDate(parsed);
};

const diffDays = (olderDateKey: string, newerDateKey: string): number | null => {
  const older = parseDateKey(olderDateKey);
  const newer = parseDateKey(newerDateKey);
  if (!older || !newer) return null;
  const ms = newer.getTime() - older.getTime();
  return Math.floor(ms / 86_400_000);
};

const shuffle = <T>(values: T[], rng: RngFn): T[] => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
};

const normalizeStudyWordId = (value: string | number): string => String(value).trim();

const sanitizeStudyWords = (words: StudyWord[]): ValidStudyWord[] => {
  const byId = new Map<string, ValidStudyWord>();

  words.forEach((entry) => {
    const id = normalizeStudyWordId(entry.id);
    const word = entry.word.trim();
    const meaning = entry.meaning.trim();
    if (!id || !word || !meaning) return;
    if (byId.has(id)) return;

    byId.set(id, {
      id,
      word,
      meaning,
      tags: (entry.tags ?? [])
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean),
      example:
        typeof entry.example === 'string' && entry.example.trim().length > 0
          ? entry.example.trim()
          : null,
      level:
        typeof entry.level === 'string' && entry.level.trim().length > 0
          ? entry.level.trim()
          : null,
    });
  });

  return Array.from(byId.values());
};

const isNewWord = (
  word: ValidStudyWord,
  history: StudyHistory,
  todayKey: string
): boolean => {
  const entry = history[word.id];
  const status = entry?.status;
  if (status === 'new') return true;
  if (status === 'learning' || status === 'reinforcing' || status === 'mastered') return false;
  const lastSeen = entry?.lastSeen ?? null;
  if (!lastSeen) return true;
  const age = diffDays(lastSeen, todayKey);
  if (age == null) return true;
  return age >= VERY_OLD_DAYS_THRESHOLD;
};

const inferStudyStatus = (entry?: StudyHistoryEntry): StudyWordStatus => {
  if (!entry) return 'new';
  if (entry.status) return entry.status;

  const correctStreak = Math.max(0, Math.floor(entry.correctStreak ?? 0));
  const correct = Math.max(0, Math.floor(entry.correct ?? 0));
  const wrong = Math.max(0, Math.floor(entry.wrongCount ?? entry.wrong ?? 0));

  if (!entry.lastSeen && correct === 0 && wrong === 0) return 'new';
  if (correctStreak >= 4 || (correct >= 4 && wrong === 0)) return 'mastered';
  if (correctStreak >= 3 || correct >= 3) return 'reinforcing';
  return 'learning';
};

const isDueReviewWord = (
  word: ValidStudyWord,
  history: StudyHistory,
  todayKey: string
): boolean => {
  const entry = history[word.id];
  if (!entry) return false;
  const nextReview = entry.nextReview ?? null;
  if (nextReview && nextReview <= todayKey) return true;

  const status = inferStudyStatus(entry);
  if (status === 'learning' || status === 'reinforcing') {
    const wrongCount = entry.wrongCount ?? entry.wrong ?? 0;
    const correctCount = entry.correct ?? 0;
    return wrongCount > correctCount;
  }
  return false;
};

const isActiveLearningWord = (
  word: ValidStudyWord,
  history: StudyHistory,
  todayKey: string
): boolean => {
  const entry = history[word.id];
  if (!entry) return false;
  if (isDueReviewWord(word, history, todayKey)) return false;
  const status = inferStudyStatus(entry);
  return status === 'learning' || status === 'reinforcing';
};

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  items.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });
  return result;
};

const pickFromBucket = (
  source: ValidStudyWord[],
  selectedIds: Set<string>,
  count: number,
  rng: RngFn
): ValidStudyWord[] => {
  if (count <= 0) return [];
  const eligible = source.filter((item) => !selectedIds.has(item.id));
  return shuffle(eligible, rng).slice(0, count);
};

export const selectDailyWords = (
  data: StudyWord[],
  history: StudyHistory,
  todayKey: string,
  options: BuildOptions = {}
): StudyWord[] => {
  const rng = options.rng ?? defaultRng;
  const words = sanitizeStudyWords(data);
  if (words.length === 0) return [];

  const dueReviewWords = words.filter((word) => isDueReviewWord(word, history, todayKey));
  const activeLearningWords = words.filter((word) => isActiveLearningWord(word, history, todayKey));
  const newWords = words.filter((word) => isNewWord(word, history, todayKey));
  const fallbackWords = words.filter((word) => {
    if (dueReviewWords.some((item) => item.id === word.id)) return false;
    if (activeLearningWords.some((item) => item.id === word.id)) return false;
    if (newWords.some((item) => item.id === word.id)) return false;
    return true;
  });

  const selectedIds = new Set<string>();
  const selected: ValidStudyWord[] = [];

  const appendPicks = (bucket: ValidStudyWord[], count: number): void => {
    const picks = pickFromBucket(bucket, selectedIds, count, rng);
    picks.forEach((pick) => {
      selected.push(pick);
      selectedIds.add(pick.id);
    });
  };

  // MVP ordering: due review -> active learning -> new -> fallback.
  appendPicks(dueReviewWords, DAILY_QUESTION_COUNT);
  appendPicks(activeLearningWords, DAILY_QUESTION_COUNT - selected.length);
  appendPicks(newWords, DAILY_QUESTION_COUNT - selected.length);
  appendPicks(fallbackWords, DAILY_QUESTION_COUNT - selected.length);

  if (selected.length < DAILY_QUESTION_COUNT && words.length > 0) {
    // When the pool is tiny, repeat words as a last resort to keep the daily set at 5.
    const repeatable = uniqueById([
      ...shuffle(dueReviewWords, rng),
      ...shuffle(activeLearningWords, rng),
      ...shuffle(newWords, rng),
      ...shuffle(fallbackWords, rng),
      ...shuffle(words, rng),
    ]);

    let cursor = 0;
    while (selected.length < DAILY_QUESTION_COUNT && repeatable.length > 0) {
      selected.push(repeatable[cursor % repeatable.length]);
      cursor += 1;
    }
  }

  return shuffle(selected.slice(0, DAILY_QUESTION_COUNT), rng).map((entry) => ({
    id: entry.id,
    word: entry.word,
    meaning: entry.meaning,
    tags: entry.tags,
    example: entry.example ?? null,
    level: entry.level ?? null,
  }));
};

const buildExplanation = (meaning: string): string => {
  const cleaned = meaning
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 160) return cleaned;

  const clipped = cleaned.slice(0, 157).trimEnd();
  return `${clipped}...`;
};

const ensureTwoDistractors = (values: string[], correctMeaning: string): string[] => {
  const unique = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => normalizeText(value) !== normalizeText(correctMeaning))
    )
  );

  while (unique.length < 2) {
    unique.push(`Ez da zuzena (${unique.length + 1})`);
  }

  return unique.slice(0, 2);
};

export const buildQuestionForWord = (
  word: StudyWord,
  data: StudyWord[],
  options: BuildOptions = {}
): DailyQuestion => {
  const rng = options.rng ?? defaultRng;
  const validWords = sanitizeStudyWords(data);
  const wordId = normalizeStudyWordId(word.id);
  const normalizedCorrectMeaning = word.meaning.trim();

  const distractorPool = validWords
    .filter((entry) => entry.id !== wordId)
    .map((entry) => entry.meaning)
    .filter(Boolean);

  const distractors = ensureTwoDistractors(
    shuffle(distractorPool, rng),
    normalizedCorrectMeaning
  );

  const optionsList = shuffle([normalizedCorrectMeaning, ...distractors], rng);

  return {
    id: `q-${wordId}-${Math.floor(rng() * 1_000_000)}`,
    wordId,
    word: word.word.trim(),
    correctMeaning: normalizedCorrectMeaning,
    distractors,
    options: optionsList,
    explanation: buildExplanation(normalizedCorrectMeaning),
    example:
      typeof word.example === 'string' && word.example.trim().length > 0
        ? word.example.trim()
        : null,
  };
};

export const getQuestionAnswerKey = (question: Pick<DailyQuestion, 'id' | 'wordId'>): string =>
  question.id || question.wordId;

export const getQuestionAnswer = (
  session: Pick<DailySession, 'answers'>,
  question: Pick<DailyQuestion, 'id' | 'wordId'>
): DailySessionAnswer | null =>
  session.answers[getQuestionAnswerKey(question)] ??
  session.answers[question.wordId] ??
  null;

export const getAnsweredQuestionCount = (session: Pick<DailySession, 'answers' | 'questions'>): number =>
  session.questions.reduce(
    (total, question) => total + (getQuestionAnswer(session, question) ? 1 : 0),
    0
  );

export const calculateSessionScore = (session: DailySession): number =>
  session.questions.reduce((total, question) => {
    const answer = getQuestionAnswer(session, question);
    return total + (answer?.isCorrect ? 1 : 0);
  }, 0);

export const getTodayKey = (date: Date = new Date()): string => formatLocalDate(date);

export const getDailySessionStorageKey = (todayKey: string): string =>
  `${DAILY_SESSION_STORAGE_PREFIX}${todayKey}`;

export const getReviewSessionStorageKey = (todayKey: string): string =>
  `${REVIEW_SESSION_STORAGE_PREFIX}${todayKey}`;

const getSessionStorageKey = (todayKey: string, mode: StudySessionMode): string =>
  mode === 'review' ? getReviewSessionStorageKey(todayKey) : getDailySessionStorageKey(todayKey);

const normalizeStoredQuestion = (
  rawQuestion: unknown,
  index: number
): DailyQuestion | null => {
  if (!rawQuestion || typeof rawQuestion !== 'object') return null;
  const question = rawQuestion as Partial<DailyQuestion>;
  if (typeof question.wordId !== 'string') return null;
  if (typeof question.word !== 'string') return null;
  if (typeof question.correctMeaning !== 'string') return null;
  if (!Array.isArray(question.options)) return null;

  const options = question.options
    .map((value) => String(value))
    .filter((value) => value.trim().length > 0);
  if (options.length < 3) return null;

  return {
    id:
      typeof question.id === 'string' && question.id.trim().length > 0
        ? question.id
        : `q-${question.wordId}-${index + 1}`,
    wordId: question.wordId,
    word: question.word,
    correctMeaning: question.correctMeaning,
    distractors: Array.isArray(question.distractors)
      ? question.distractors.map((value) => String(value))
      : [],
    options,
    explanation: typeof question.explanation === 'string' ? question.explanation : '',
    example:
      typeof question.example === 'string' && question.example.trim().length > 0
        ? question.example.trim()
        : null,
  };
};

const coerceDailySession = (
  value: unknown,
  todayKey: string,
  mode: StudySessionMode
): DailySession | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<DailySession>;
  if (raw.dateKey !== todayKey) return null;
  if (!Array.isArray(raw.ids)) return null;
  if (!Array.isArray(raw.questions)) return null;
  if (typeof raw.currentIndex !== 'number') return null;
  if (typeof raw.completed !== 'boolean') return null;
  if (!raw.answers || typeof raw.answers !== 'object') return null;

  const questions = raw.questions
    .map((question, index) => normalizeStoredQuestion(question, index))
    .filter((question): question is DailyQuestion => Boolean(question));
  if (questions.length === 0) return null;

  const normalizedMode =
    raw.mode === 'review' || raw.mode === 'daily' ? raw.mode : mode;

  return {
    dateKey: raw.dateKey,
    mode: normalizedMode,
    ids: raw.ids.map((id) => String(id)),
    currentIndex: clamp(Math.floor(raw.currentIndex), 0, Math.max(questions.length - 1, 0)),
    completed: raw.completed,
    answers: raw.answers as Record<string, DailySessionAnswer>,
    questions,
    score: typeof raw.score === 'number' ? raw.score : 0,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    resultApplied: Boolean(raw.resultApplied),
    streakAfter: typeof raw.streakAfter === 'number' ? raw.streakAfter : null,
    sourceWordIds: Array.isArray(raw.sourceWordIds)
      ? raw.sourceWordIds.map((value) => String(value))
      : undefined,
  };
};

export const loadDailySession = (
  todayKey: string,
  storage?: StorageLike | null
): DailySession | null => {
  const raw = getJSON<unknown>(getDailySessionStorageKey(todayKey), null, storage);
  return coerceDailySession(raw, todayKey, 'daily');
};

export const saveDailySession = (
  session: DailySession,
  storage?: StorageLike | null
): boolean => setJSON(getDailySessionStorageKey(session.dateKey), session, storage);

export const loadReviewSession = (
  todayKey: string,
  storage?: StorageLike | null
): DailySession | null => {
  const raw = getJSON<unknown>(getReviewSessionStorageKey(todayKey), null, storage);
  return coerceDailySession(raw, todayKey, 'review');
};

export const saveReviewSession = (
  session: DailySession,
  storage?: StorageLike | null
): boolean => setJSON(getReviewSessionStorageKey(session.dateKey), session, storage);

export const createDailySession = (
  data: StudyWord[],
  history: StudyHistory,
  todayKey: string,
  options: BuildOptions = {}
): DailySession => {
  const rng = options.rng ?? defaultRng;
  const selectedWords = selectDailyWords(data, history, todayKey, options);

  if (selectedWords.length < DAILY_QUESTION_COUNT) {
    throw new Error('Ez dago nahikoa hitz gaurko 5 hitzen saioa sortzeko.');
  }

  const questions = selectedWords
    .slice(0, DAILY_QUESTION_COUNT)
    .map((entry, index) => ({
      ...buildQuestionForWord(entry, data, { rng }),
      id: `q-${todayKey}-${index + 1}-${normalizeStudyWordId(entry.id)}`,
    }));

  const session: DailySession = {
    dateKey: todayKey,
    mode: 'daily',
    ids: questions.map((question) => question.wordId),
    currentIndex: 0,
    completed: false,
    answers: {},
    questions,
    score: 0,
    completedAt: null,
    resultApplied: false,
    streakAfter: null,
    sourceWordIds: questions.map((question) => question.wordId),
  };

  return session;
};

export const getOrCreateDailySession = (
  data: StudyWord[],
  history: StudyHistory,
  todayKey: string,
  storage?: StorageLike | null,
  options: BuildOptions = {}
): DailySession => {
  const existing = loadDailySession(todayKey, storage);
  if (existing && existing.questions.length > 0) return existing;

  const created = createDailySession(data, history, todayKey, options);
  saveDailySession(created, storage);
  return created;
};

export const getDueOrActiveReviewWordIds = (
  history: StudyHistory,
  todayKey: string
): string[] =>
  Object.entries(history)
    .filter(([, entry]) => {
      if (!entry) return false;
      if (entry.nextReview && entry.nextReview <= todayKey) return true;
      const status = inferStudyStatus(entry);
      return status === 'learning' || status === 'reinforcing';
    })
    .map(([wordId]) => wordId);

const buildReviewSelection = (
  data: StudyWord[],
  history: StudyHistory,
  todayKey: string,
  preferredWordIds: string[],
  options: BuildOptions = {}
): StudyWord[] => {
  const rng = options.rng ?? defaultRng;
  const words = sanitizeStudyWords(data);
  const byId = new Map(words.map((word) => [word.id, word]));
  const selected: ValidStudyWord[] = [];

  const pushUnique = (candidate: ValidStudyWord | undefined) => {
    if (!candidate) return;
    if (selected.some((item) => item.id === candidate.id)) return;
    selected.push(candidate);
  };

  preferredWordIds.forEach((wordId) => pushUnique(byId.get(String(wordId))));

  const dueOrActive = getDueOrActiveReviewWordIds(history, todayKey)
    .map((wordId) => byId.get(String(wordId)))
    .filter((word): word is ValidStudyWord => Boolean(word));
  shuffle(dueOrActive, rng).forEach(pushUnique);

  const fallback = shuffle(words, rng);
  fallback.forEach(pushUnique);

  if (selected.length < DAILY_QUESTION_COUNT && words.length > 0) {
    let cursor = 0;
    while (selected.length < DAILY_QUESTION_COUNT) {
      selected.push(fallback[cursor % fallback.length] ?? words[cursor % words.length]);
      cursor += 1;
    }
  }

  return selected.slice(0, DAILY_QUESTION_COUNT).map((entry) => ({
    id: entry.id,
    word: entry.word,
    meaning: entry.meaning,
    tags: entry.tags,
    example: entry.example ?? null,
    level: entry.level ?? null,
  }));
};

export const createReviewSession = (
  data: StudyWord[],
  history: StudyHistory,
  todayKey: string,
  preferredWordIds: string[] = [],
  options: BuildOptions = {}
): DailySession => {
  const rng = options.rng ?? defaultRng;
  const selectedWords = buildReviewSelection(data, history, todayKey, preferredWordIds, options);

  if (selectedWords.length < DAILY_QUESTION_COUNT) {
    throw new Error('Ez dago nahikoa hitz errepasorako saioa sortzeko.');
  }

  const questions = selectedWords.map((entry, index) => ({
    ...buildQuestionForWord(entry, data, { rng }),
    id: `q-review-${todayKey}-${index + 1}-${normalizeStudyWordId(entry.id)}`,
  }));

  return {
    dateKey: todayKey,
    mode: 'review',
    ids: questions.map((question) => question.wordId),
    currentIndex: 0,
    completed: false,
    answers: {},
    questions,
    score: 0,
    completedAt: null,
    resultApplied: false,
    streakAfter: null,
    sourceWordIds: preferredWordIds.map((id) => String(id)),
  };
};

export const getOrCreateReviewSession = (
  data: StudyWord[],
  history: StudyHistory,
  todayKey: string,
  preferredWordIds: string[] = [],
  storage?: StorageLike | null,
  options: BuildOptions = {}
): DailySession => {
  const existing = loadReviewSession(todayKey, storage);
  if (existing && existing.questions.length > 0) return existing;
  const created = createReviewSession(data, history, todayKey, preferredWordIds, options);
  saveReviewSession(created, storage);
  return created;
};

export const saveStudySessionByMode = (
  session: DailySession,
  storage?: StorageLike | null
): boolean => setJSON(getSessionStorageKey(session.dateKey, session.mode ?? 'daily'), session, storage);

export const clearReviewSession = (
  todayKey: string,
  storage?: StorageLike | null
): boolean => removeStoredKey(getReviewSessionStorageKey(todayKey), storage);

export const getFailedWordIdsFromSession = (session: DailySession): string[] =>
  session.questions
    .filter((question) => {
      const answer = getQuestionAnswer(session, question);
      return Boolean(answer) && !answer!.isCorrect;
    })
    .map((question) => question.wordId);

export const countPendingReviewWords = (
  history: StudyHistory,
  todayKey: string
): number => getDueOrActiveReviewWordIds(history, todayKey).length;

export const loadStudyHistory = (storage?: StorageLike | null): StudyHistory =>
  getJSON<StudyHistory>(STUDY_HISTORY_STORAGE_KEY, {}, storage);

export const saveStudyHistory = (
  history: StudyHistory,
  storage?: StorageLike | null
): boolean => setJSON(STUDY_HISTORY_STORAGE_KEY, history, storage);

export const loadStreak = (storage?: StorageLike | null): StreakState =>
  getJSON<StreakState>(
    STREAK_STORAGE_KEY,
    { current: 0, lastCompletedDate: null },
    storage
  );

export const saveStreak = (
  streak: StreakState,
  storage?: StorageLike | null
): boolean => setJSON(STREAK_STORAGE_KEY, streak, storage);

export const computeStreakUpdate = (
  current: StreakState,
  completedDate: string
): { next: StreakState; changed: boolean } => {
  if (current.lastCompletedDate === completedDate) {
    return { next: current, changed: false };
  }

  const yesterdayKey = addDaysToDateKey(completedDate, -1);
  const continues = yesterdayKey !== null && current.lastCompletedDate === yesterdayKey;

  return {
    next: {
      current: continues ? Math.max(0, current.current) + 1 : 1,
      lastCompletedDate: completedDate,
    },
    changed: true,
  };
};

export const isCurrentQuestionAnswered = (session: DailySession): boolean => {
  const question = session.questions[session.currentIndex];
  if (!question) return false;
  return Boolean(getQuestionAnswer(session, question));
};

export const answerCurrentQuestion = (
  session: DailySession,
  selectedOption: string,
  answeredAtIso: string = new Date().toISOString()
): DailySession => {
  const question = session.questions[session.currentIndex];
  if (!question) return session;
  const answerKey = getQuestionAnswerKey(question);
  if (getQuestionAnswer(session, question)) return session;

  const isCorrect = normalizeText(selectedOption) === normalizeText(question.correctMeaning);
  const nextAnswers = {
    ...session.answers,
    [answerKey]: {
      selectedOption,
      isCorrect,
      answeredAt: answeredAtIso,
    },
  };

  const nextSession = {
    ...session,
    answers: nextAnswers,
  };

  return {
    ...nextSession,
    score: calculateSessionScore(nextSession),
  };
};

export const advanceDailySession = (session: DailySession): DailySession => {
  if (session.completed) return session;
  const isLastQuestion = session.currentIndex >= session.questions.length - 1;
  if (isLastQuestion) {
    return {
      ...session,
      completed: true,
      completedAt: session.completedAt ?? new Date().toISOString(),
      score: calculateSessionScore(session),
    };
  }

  return {
    ...session,
    currentIndex: session.currentIndex + 1,
  };
};

const applyWordSpacedRepetition = (
  previous: StudyHistoryEntry,
  wasCorrect: boolean,
  completedDate: string
): StudyHistoryEntry => {
  const prevCorrect = Math.max(0, Math.floor(previous.correct ?? 0));
  const prevWrong = Math.max(0, Math.floor(previous.wrong ?? 0));
  const prevDifficulty = clamp(Math.round(previous.difficulty ?? 2), 1, 5);
  const previousStatus = inferStudyStatus(previous);
  const previousCorrectStreak = Math.max(0, Math.floor(previous.correctStreak ?? 0));
  const previousWrongCount = Math.max(
    0,
    Math.floor(previous.wrongCount ?? previous.wrong ?? 0)
  );

  if (!wasCorrect) {
    return {
      ...previous,
      lastSeen: completedDate,
      correct: prevCorrect,
      wrong: prevWrong + 1,
      wrongCount: previousWrongCount + 1,
      correctStreak: 0,
      difficulty: clamp(prevDifficulty + 1, 1, 5),
      status: 'learning',
      nextReview: addDaysToDateKey(completedDate, 1),
    };
  }

  const nextCorrectStreak = previousCorrectStreak + 1;
  let nextStatus: StudyWordStatus = previousStatus === 'new' ? 'learning' : previousStatus;
  let nextReview = addDaysToDateKey(completedDate, 3);

  // Simple MVP SRS: promote to reinforcing/mastered with longer intervals.
  if (previousStatus === 'reinforcing') {
    nextStatus = 'mastered';
    nextReview = addDaysToDateKey(completedDate, 14);
  } else if (previousStatus === 'mastered') {
    nextStatus = 'mastered';
    nextReview = addDaysToDateKey(completedDate, 14);
  } else if (nextCorrectStreak >= 3) {
    nextStatus = 'reinforcing';
    nextReview = addDaysToDateKey(completedDate, 7);
  } else {
    nextStatus = 'learning';
    nextReview = addDaysToDateKey(completedDate, 3);
  }

  return {
    ...previous,
    lastSeen: completedDate,
    correct: prevCorrect + 1,
    wrong: prevWrong,
    wrongCount: previousWrongCount,
    correctStreak: nextCorrectStreak,
    difficulty: clamp(prevDifficulty - 1, 1, 5),
    status: nextStatus,
    nextReview,
  };
};

export const applySessionCompletion = (
  session: DailySession,
  history: StudyHistory,
  streak: StreakState,
  completedDate: string
): {
  session: DailySession;
  history: StudyHistory;
  streak: StreakState;
  streakChanged: boolean;
} => {
  if (session.resultApplied || !session.completed) {
    return {
      session,
      history,
      streak,
      streakChanged: false,
    };
  }

  const nextHistory: StudyHistory = { ...history };
  session.questions.forEach((question) => {
    const answer = getQuestionAnswer(session, question);
    if (!answer) return;

    const previous = nextHistory[question.wordId] ?? {};
    nextHistory[question.wordId] = applyWordSpacedRepetition(
      previous,
      answer.isCorrect,
      completedDate
    );
  });

  const streakResult =
    (session.mode ?? 'daily') === 'daily'
      ? computeStreakUpdate(streak, completedDate)
      : { next: streak, changed: false };

  const nextSession = {
    ...session,
    score: calculateSessionScore(session),
    resultApplied: true,
    streakAfter: streakResult.next.current,
  };

  return {
    session: nextSession,
    history: nextHistory,
    streak: streakResult.next,
    streakChanged: streakResult.changed,
  };
};
