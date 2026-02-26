import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getJSON, removeStoredKey, setJSON } from './storage';

export type GrammarLevel = 'B1' | 'B2' | 'C1';

export type GrammarExample = {
  eu: string;
  es: string;
};

export type GrammarLesson = {
  id: string;
  level: GrammarLevel;
  title: string;
  shortExplanation: string;
  examples: GrammarExample[];
  moreInfo: string | null;
  estimatedMinutes: number;
  tags: string[];
};

export type GrammarQuestion = {
  id: string;
  lessonId: string;
  position: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
};

export type GrammarLessonBundle = {
  lesson: GrammarLesson;
  questions: GrammarQuestion[];
};

export type GrammarUserSettings = {
  userId: string;
  preferredLevel: GrammarLevel;
  timezone: string;
};

export type GrammarDailyAssignment = {
  id: string;
  userId: string;
  day: string;
  lessonId: string;
  level: GrammarLevel;
  timezone: string;
};

export type GrammarAttemptAnswer = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: string;
};

export type SaveGrammarAttemptPayload = {
  assignmentId: string;
  lessonId: string;
  day: string;
  answers: GrammarAttemptAnswer[];
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  score: number;
  durationSeconds: number;
  completed: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type GrammarAttempt = {
  id: string;
  userId: string;
  assignmentId: string;
  lessonId: string;
  day: string;
  answers: GrammarAttemptAnswer[];
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  score: number;
  durationSeconds: number;
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveGrammarAttemptResult = {
  ok: boolean;
  queued: boolean;
  attempt?: GrammarAttempt;
  errorMessage?: string;
};

export type GrammarStatsRange = { from?: string; to?: string; days?: number };

export type GrammarStatsSummary = {
  completedCount: number;
  totalCorrect: number;
  totalWrong: number;
  avgScore: number;
  recentAttempts: GrammarAttempt[];
};

export type GrammarCardState = {
  settings: GrammarUserSettings;
  assignment: GrammarDailyAssignment;
  lesson: Pick<GrammarLesson, 'id' | 'title' | 'estimatedMinutes' | 'level'>;
  completed: boolean;
  score: number | null;
};

type PendingAttemptRecord = {
  payload: SaveGrammarAttemptPayload;
  queuedAt: string;
};

export type GrammarDraft = {
  assignmentId: string;
  step: 1 | 2 | 3;
  questionIndex: number;
  answers: GrammarAttemptAnswer[];
  startedAt: string;
  lessonExpanded?: boolean;
};

const GRAMMAR_PENDING_ATTEMPTS_KEY = 'hk:grammar:pendingAttempts';
const GRAMMAR_DRAFT_PREFIX = 'hk:grammar:draft:';

const VALID_LEVELS: GrammarLevel[] = ['B1', 'B2', 'C1'];

const normalizeLevel = (value: unknown, fallback: GrammarLevel = 'B1'): GrammarLevel => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return (VALID_LEVELS.find((level) => level === normalized) ?? fallback) as GrammarLevel;
};

const errorMessageFromSupabase = (error: PostgrestError | null): string =>
  error?.message?.trim() || 'Supabase errorea';

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter(Boolean);
};

const parseExamples = (value: unknown): GrammarExample[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const eu = String(row.eu ?? '').trim();
      const es = String(row.es ?? '').trim();
      if (!eu && !es) return null;
      return { eu, es };
    })
    .filter((entry): entry is GrammarExample => Boolean(entry));
};

const parseLesson = (row: Record<string, unknown>): GrammarLesson => ({
  id: String(row.id ?? ''),
  level: normalizeLevel(row.level, 'B1'),
  title: String(row.title ?? '').trim(),
  shortExplanation: String(row.short_explanation ?? '').trim(),
  examples: parseExamples(row.examples),
  moreInfo:
    typeof row.more_info === 'string' && row.more_info.trim().length > 0
      ? row.more_info.trim()
      : null,
  estimatedMinutes: Math.max(1, Math.floor(Number(row.estimated_minutes ?? 4) || 4)),
  tags: parseStringArray(row.tags),
});

const parseQuestion = (row: Record<string, unknown>): GrammarQuestion => ({
  id: String(row.id ?? ''),
  lessonId: String(row.lesson_id ?? ''),
  position: Math.max(1, Math.floor(Number(row.position ?? 1) || 1)),
  prompt: String(row.prompt ?? '').trim(),
  options: parseStringArray(row.options),
  correctIndex: Math.max(0, Math.floor(Number(row.correct_index ?? 0) || 0)),
  explanation:
    typeof row.explanation === 'string' && row.explanation.trim().length > 0
      ? row.explanation.trim()
      : null,
});

const parseSettings = (row: Record<string, unknown>): GrammarUserSettings => ({
  userId: String(row.user_id ?? ''),
  preferredLevel: normalizeLevel(row.preferred_level, 'B1'),
  timezone:
    typeof row.timezone === 'string' && row.timezone.trim().length > 0
      ? row.timezone.trim()
      : 'Europe/Madrid',
});

const parseAssignment = (row: Record<string, unknown>): GrammarDailyAssignment => ({
  id: String(row.id ?? ''),
  userId: String(row.user_id ?? ''),
  day: String(row.day ?? ''),
  lessonId: String(row.lesson_id ?? ''),
  level: normalizeLevel(row.level, 'B1'),
  timezone:
    typeof row.timezone === 'string' && row.timezone.trim().length > 0
      ? row.timezone.trim()
      : 'Europe/Madrid',
});

const parseAttempt = (row: Record<string, unknown>): GrammarAttempt => ({
  id: String(row.id ?? ''),
  userId: String(row.user_id ?? ''),
  assignmentId: String(row.assignment_id ?? ''),
  lessonId: String(row.lesson_id ?? ''),
  day: String(row.day ?? ''),
  answers: Array.isArray(row.answers)
    ? (row.answers as unknown[]).map((entry) => {
        const value = (entry ?? {}) as Record<string, unknown>;
        return {
          questionId: String(value.questionId ?? value.question_id ?? '').trim(),
          selectedIndex: Math.max(0, Math.floor(Number(value.selectedIndex ?? value.selected_index ?? 0))),
          isCorrect: Boolean(value.isCorrect ?? value.is_correct),
          answeredAt: String(value.answeredAt ?? value.answered_at ?? ''),
        };
      })
    : [],
  correctCount: Math.max(0, Math.floor(Number(row.correct_count ?? 0) || 0)),
  wrongCount: Math.max(0, Math.floor(Number(row.wrong_count ?? 0) || 0)),
  totalQuestions: Math.max(0, Math.floor(Number(row.total_questions ?? 0) || 0)),
  score: Number(row.score ?? 0) || 0,
  durationSeconds: Math.max(0, Math.floor(Number(row.duration_seconds ?? 0) || 0)),
  completed: Boolean(row.completed),
  startedAt: row.started_at ? String(row.started_at) : null,
  completedAt: row.completed_at ? String(row.completed_at) : null,
  createdAt: String(row.created_at ?? ''),
  updatedAt: String(row.updated_at ?? ''),
});

const getDeviceTimezone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.trim() ? tz.trim() : 'Europe/Madrid';
  } catch {
    return 'Europe/Madrid';
  }
};

const isOfflineLikeError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('fetch') ||
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed')
  );
};

const getPendingAttempts = (): PendingAttemptRecord[] =>
  getJSON<PendingAttemptRecord[]>(GRAMMAR_PENDING_ATTEMPTS_KEY, []);

const setPendingAttempts = (records: PendingAttemptRecord[]): void => {
  if (records.length === 0) {
    removeStoredKey(GRAMMAR_PENDING_ATTEMPTS_KEY);
    return;
  }
  setJSON(GRAMMAR_PENDING_ATTEMPTS_KEY, records);
};

const queuePendingAttempt = (payload: SaveGrammarAttemptPayload): void => {
  const current = getPendingAttempts();
  const deduped = current.filter((entry) => entry.payload.assignmentId !== payload.assignmentId);
  deduped.push({ payload, queuedAt: new Date().toISOString() });
  setPendingAttempts(deduped);
};

const requireAuthUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || 'Autentikazio errorea');
  }

  if (!user?.id) {
    throw new Error('Erabiltzailea autentifikatuta egon behar da');
  }

  return user.id;
};

const upsertAttemptRecord = async (
  userId: string,
  payload: SaveGrammarAttemptPayload
): Promise<GrammarAttempt> => {
  const row = {
    user_id: userId,
    assignment_id: payload.assignmentId,
    lesson_id: payload.lessonId,
    day: payload.day,
    answers: payload.answers,
    correct_count: payload.correctCount,
    wrong_count: payload.wrongCount,
    total_questions: payload.totalQuestions,
    score: payload.score,
    duration_seconds: payload.durationSeconds,
    completed: payload.completed,
    started_at: payload.startedAt ?? null,
    completed_at: payload.completedAt ?? null,
  };

  const { data, error } = await supabase
    .from('grammar_attempts')
    .upsert(row, { onConflict: 'user_id,assignment_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  return parseAttempt((data ?? {}) as Record<string, unknown>);
};

export const getOrCreateUserSettings = async (): Promise<GrammarUserSettings> => {
  const timezone = getDeviceTimezone();

  const { data, error } = await supabase.rpc('get_or_create_user_settings', {
    p_preferred_level: null,
    p_timezone: timezone,
  });

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row) {
    throw new Error('Ezin izan dira erabiltzailearen ezarpenak kargatu.');
  }

  return parseSettings(row);
};

export const setUserLevel = async (level: GrammarLevel): Promise<GrammarUserSettings> => {
  const userId = await requireAuthUserId();
  const timezone = getDeviceTimezone();

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        preferred_level: normalizeLevel(level, 'B1'),
        timezone,
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  return parseSettings((data ?? {}) as Record<string, unknown>);
};

export const setUserTimezone = async (timezone: string): Promise<GrammarUserSettings> => {
  const userId = await requireAuthUserId();
  const safeTimezone = timezone.trim() || 'Europe/Madrid';

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, timezone: safeTimezone }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  return parseSettings((data ?? {}) as Record<string, unknown>);
};

export const getTodayAssignment = async (
  level?: GrammarLevel,
  timezone?: string
): Promise<GrammarDailyAssignment> => {
  await flushPendingAttempts();

  const { data, error } = await supabase.rpc('get_or_create_grammar_assignment', {
    p_level: level ?? null,
    p_timezone: timezone ?? getDeviceTimezone(),
    p_now: new Date().toISOString(),
  });

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row) {
    throw new Error('Ezin izan da gaurko gramatika saioa prestatu.');
  }

  return parseAssignment(row);
};

export const fetchLessonWithQuestions = async (lessonId: string): Promise<GrammarLessonBundle> => {
  const trimmedLessonId = lessonId.trim();
  if (!trimmedLessonId) {
    throw new Error('lessonId hutsik dago.');
  }

  const [{ data: lessonData, error: lessonError }, { data: questionsData, error: questionsError }] =
    await Promise.all([
      supabase
        .from('grammar_lessons')
        .select('*')
        .eq('id', trimmedLessonId)
        .eq('active', true)
        .single(),
      supabase
        .from('grammar_questions')
        .select('*')
        .eq('lesson_id', trimmedLessonId)
        .eq('active', true)
        .order('position', { ascending: true }),
    ]);

  if (lessonError) throw new Error(errorMessageFromSupabase(lessonError));
  if (questionsError) throw new Error(errorMessageFromSupabase(questionsError));

  const lesson = parseLesson((lessonData ?? {}) as Record<string, unknown>);
  const questions = ((questionsData ?? []) as Array<Record<string, unknown>>)
    .map(parseQuestion)
    .filter((question) => question.id && question.options.length >= 2);

  if (questions.length === 0) {
    throw new Error('Ikasgai honek ez du galderarik.');
  }

  return { lesson, questions };
};

export const fetchAttemptForAssignment = async (
  assignmentId: string
): Promise<GrammarAttempt | null> => {
  const { data, error } = await supabase
    .from('grammar_attempts')
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  if (!data) return null;
  return parseAttempt(data as Record<string, unknown>);
};

export const saveAttempt = async (
  payload: SaveGrammarAttemptPayload
): Promise<SaveGrammarAttemptResult> => {
  const userId = await requireAuthUserId();

  try {
    const attempt = await upsertAttemptRecord(userId, payload);
    return { ok: true, queued: false, attempt };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ezin izan da emaitza gorde.';
    if (isOfflineLikeError(message)) {
      queuePendingAttempt(payload);
      return { ok: true, queued: true, errorMessage: message };
    }
    return { ok: false, queued: false, errorMessage: message };
  }
};

export const flushPendingAttempts = async (): Promise<number> => {
  const pending = getPendingAttempts();
  if (pending.length === 0) return 0;

  const userId = await requireAuthUserId();
  const remaining: PendingAttemptRecord[] = [];
  let flushed = 0;

  for (const entry of pending) {
    try {
      await upsertAttemptRecord(userId, entry.payload);
      flushed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'sync error';
      if (isOfflineLikeError(message)) {
        remaining.push(entry);
        continue;
      }
      // Permanent errors are dropped to avoid blocking the queue forever.
    }
  }

  setPendingAttempts(remaining);
  return flushed;
};

export const fetchStats = async (range: GrammarStatsRange = { days: 7 }): Promise<GrammarStatsSummary> => {
  let query = supabase
    .from('grammar_attempts')
    .select('*')
    .eq('completed', true)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(50);

  if (typeof range.from === 'string' && range.from) {
    query = query.gte('day', range.from);
  }
  if (typeof range.to === 'string' && range.to) {
    query = query.lte('day', range.to);
  }
  if (!range.from && !range.to && typeof range.days === 'number' && range.days > 0) {
    const from = new Date();
    from.setDate(from.getDate() - Math.max(0, Math.floor(range.days) - 1));
    query = query.gte('day', from.toISOString().slice(0, 10));
  }

  const { data, error } = await query;
  if (error) throw new Error(errorMessageFromSupabase(error));

  const attempts = ((data ?? []) as Array<Record<string, unknown>>).map(parseAttempt);
  const totals = attempts.reduce(
    (acc, attempt) => {
      acc.correct += attempt.correctCount;
      acc.wrong += attempt.wrongCount;
      acc.score += attempt.score;
      return acc;
    },
    { correct: 0, wrong: 0, score: 0 }
  );

  return {
    completedCount: attempts.length,
    totalCorrect: totals.correct,
    totalWrong: totals.wrong,
    avgScore: attempts.length > 0 ? totals.score / attempts.length : 0,
    recentAttempts: attempts,
  };
};

export const getTodayGrammarCardState = async (): Promise<GrammarCardState> => {
  const settings = await getOrCreateUserSettings();
  const assignment = await getTodayAssignment(settings.preferredLevel, settings.timezone);
  const [bundle, attempt] = await Promise.all([
    fetchLessonWithQuestions(assignment.lessonId),
    fetchAttemptForAssignment(assignment.id),
  ]);

  return {
    settings,
    assignment,
    lesson: {
      id: bundle.lesson.id,
      title: bundle.lesson.title,
      estimatedMinutes: bundle.lesson.estimatedMinutes,
      level: bundle.lesson.level,
    },
    completed: Boolean(attempt?.completed),
    score: attempt ? attempt.score : null,
  };
};

export const loadGrammarDraft = (assignmentId: string): GrammarDraft | null =>
  getJSON<GrammarDraft | null>(`${GRAMMAR_DRAFT_PREFIX}${assignmentId}`, null);

export const saveGrammarDraft = (draft: GrammarDraft): void => {
  setJSON(`${GRAMMAR_DRAFT_PREFIX}${draft.assignmentId}`, draft);
};

export const clearGrammarDraft = (assignmentId: string): void => {
  removeStoredKey(`${GRAMMAR_DRAFT_PREFIX}${assignmentId}`);
};

export const grammarService = {
  getOrCreateUserSettings,
  setUserLevel,
  setUserTimezone,
  getTodayAssignment,
  fetchLessonWithQuestions,
  fetchAttemptForAssignment,
  saveAttempt,
  flushPendingAttempts,
  fetchStats,
  getTodayGrammarCardState,
  loadGrammarDraft,
  saveGrammarDraft,
  clearGrammarDraft,
};
