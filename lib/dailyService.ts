import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { formatLocalDate } from './dateUtils';

export type QuestionType =
  | 'WORD_TO_DEF'
  | 'DEF_TO_WORD'
  | 'CLOZE'
  | 'SYN_CONTEXT'
  | 'ERROR_SPOT'
  | string;

export type QuestionRow = {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: string[];
  answer_index: number;
  explanation: string | null;
  level: string | null;
  topics: string[] | null;
  word_ids: string[] | null;
  active?: boolean;
};

export type DailySetRow = {
  id: string;
  user_id: string;
  day: string;
  question_ids: string[];
  current_index: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type DailyAnswerRow = {
  id: string;
  user_id: string;
  day: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  answered_at: string;
};

export type SubmitAnswerResult = {
  day: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  correct_index: number;
  answered_count: number;
  current_index: number;
  completed: boolean;
};

export type ProgressSummary = {
  day: string;
  hasSessionToday: boolean;
  completedToday: boolean;
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  dueReviewCount: number;
  learnedCount: number;
};

const DEFAULT_QUESTION_COUNT = 5;

const getTodayDateKey = (): string => formatLocalDate(new Date());

const errorMessageFromSupabase = (error: PostgrestError | null): string =>
  error?.message?.trim() || 'Supabase errorea';

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter(Boolean);
};

const parseDailySetRow = (value: unknown): DailySetRow => {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('Eguneko saioaren erantzuna hutsik dago.');
  }

  const questionIds = parseStringArray(row.question_ids);
  if (questionIds.length !== DEFAULT_QUESTION_COUNT) {
    throw new Error('Eguneko saioak 5 galdera izan behar ditu.');
  }

  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    day: String(row.day ?? ''),
    question_ids: questionIds,
    current_index: Math.max(0, Number(row.current_index ?? 0) || 0),
    completed: Boolean(row.completed),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
};

const parseQuestionRow = (value: Record<string, unknown>): QuestionRow | null => {
  const id = String(value.id ?? '').trim();
  const prompt = String(value.prompt ?? '').trim();
  const type = String(value.type ?? '').trim();
  const choices = parseStringArray(value.choices);
  const answerIndex = Math.floor(Number(value.answer_index ?? -1));

  if (!id || !prompt || !type) return null;
  if (choices.length < 2) return null;
  if (answerIndex < 0 || answerIndex >= choices.length) return null;

  return {
    id,
    type,
    prompt,
    choices,
    answer_index: answerIndex,
    explanation:
      typeof value.explanation === 'string' && value.explanation.trim().length > 0
        ? value.explanation.trim()
        : null,
    level:
      typeof value.level === 'string' && value.level.trim().length > 0
        ? value.level.trim()
        : null,
    topics: Array.isArray(value.topics) ? parseStringArray(value.topics) : null,
    word_ids: Array.isArray(value.word_ids) ? parseStringArray(value.word_ids) : null,
    active: typeof value.active === 'boolean' ? value.active : undefined,
  };
};

const parseSubmitAnswerResult = (value: unknown): SubmitAnswerResult => {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('Erantzuna bidaltzeko RPCk ez du daturik itzuli.');
  }

  return {
    day: String(row.day ?? ''),
    question_id: String(row.question_id ?? ''),
    selected_index: Math.floor(Number(row.selected_index ?? 0)),
    is_correct: Boolean(row.is_correct),
    correct_index: Math.floor(Number(row.correct_index ?? 0)),
    answered_count: Math.max(0, Math.floor(Number(row.answered_count ?? 0))),
    current_index: Math.max(0, Math.floor(Number(row.current_index ?? 0))),
    completed: Boolean(row.completed),
  };
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

export const getOrCreateDailySet = async (day: string = getTodayDateKey()): Promise<DailySetRow> => {
  const { data, error } = await supabase.rpc('get_or_create_daily_set', { p_day: day });
  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }
  return parseDailySetRow(data);
};

export const getQuestionsForSet = async (questionIds: string[]): Promise<QuestionRow[]> => {
  const ids = Array.from(new Set(questionIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, type, prompt, choices, answer_index, explanation, level, topics, word_ids, active'
    )
    .in('id', ids)
    .eq('active', true);

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  const parsedRows = ((data ?? []) as Array<Record<string, unknown>>)
    .map(parseQuestionRow)
    .filter((row): row is QuestionRow => Boolean(row));

  const byId = new Map(parsedRows.map((row) => [row.id, row] as const));
  return questionIds.map((id) => byId.get(id)).filter((row): row is QuestionRow => Boolean(row));
};

export const getDailyAnswers = async (day: string = getTodayDateKey()): Promise<DailyAnswerRow[]> => {
  const { data, error } = await supabase
    .from('daily_answers')
    .select('id, user_id, day, question_id, selected_index, is_correct, answered_at')
    .eq('day', day)
    .order('answered_at', { ascending: true });

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    day: String(row.day ?? ''),
    question_id: String(row.question_id ?? ''),
    selected_index: Math.max(0, Math.floor(Number(row.selected_index ?? 0))),
    is_correct: Boolean(row.is_correct),
    answered_at: String(row.answered_at ?? ''),
  }));
};

export const submitAnswer = async (
  day: string,
  questionId: string,
  selectedIndex: number
): Promise<SubmitAnswerResult> => {
  const safeSelectedIndex = Math.floor(selectedIndex);
  if (!questionId.trim()) {
    throw new Error('question_id hutsik dago.');
  }
  if (!Number.isFinite(safeSelectedIndex) || safeSelectedIndex < 0) {
    throw new Error('selected_index ez da baliozkoa.');
  }

  const { data, error } = await supabase.rpc('submit_answer', {
    p_day: day,
    p_question_id: questionId,
    p_selected_index: safeSelectedIndex,
  });

  if (error) {
    throw new Error(errorMessageFromSupabase(error));
  }

  return parseSubmitAnswerResult(data);
};

export const getProgressSummary = async (
  day: string = getTodayDateKey()
): Promise<ProgressSummary | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [setResult, answersResult, dueResult, learnedResult] = await Promise.all([
    supabase
      .from('daily_sets')
      .select('id, user_id, day, question_ids, current_index, completed, created_at, updated_at')
      .eq('day', day)
      .maybeSingle(),
    supabase
      .from('daily_answers')
      .select('question_id, is_correct')
      .eq('day', day),
    supabase
      .from('word_progress')
      .select('word_id', { head: true, count: 'exact' })
      .not('next_review', 'is', null)
      .lte('next_review', day),
    supabase
      .from('word_progress')
      .select('word_id', { head: true, count: 'exact' })
      .in('status', ['reinforcing', 'mastered']),
  ]);

  if (setResult.error) throw new Error(errorMessageFromSupabase(setResult.error));
  if (answersResult.error) throw new Error(errorMessageFromSupabase(answersResult.error));
  if (dueResult.error) throw new Error(errorMessageFromSupabase(dueResult.error));
  if (learnedResult.error) throw new Error(errorMessageFromSupabase(learnedResult.error));

  const setRow = setResult.data ? parseDailySetRow(setResult.data) : null;
  const answers = (answersResult.data ?? []) as Array<{ question_id: string; is_correct: boolean }>;
  const totalQuestions = setRow?.question_ids.length ?? DEFAULT_QUESTION_COUNT;
  const answeredCount = setRow
    ? answers.filter((row) => setRow.question_ids.includes(String(row.question_id ?? ''))).length
    : 0;
  const correctCount = setRow
    ? answers.filter(
        (row) =>
          setRow.question_ids.includes(String(row.question_id ?? '')) && Boolean(row.is_correct)
      ).length
    : 0;

  return {
    day,
    hasSessionToday: Boolean(setRow),
    completedToday: Boolean(setRow?.completed),
    answeredCount,
    correctCount,
    totalQuestions,
    dueReviewCount: dueResult.count ?? 0,
    learnedCount: learnedResult.count ?? 0,
  };
};

export const dailyService = {
  getCurrentUserId,
  getOrCreateDailySet,
  getQuestionsForSet,
  getDailyAnswers,
  submitAnswer,
  getProgressSummary,
};

export const isDailySupabaseUnavailableError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('could not find the function') ||
    normalized.includes('does not exist') ||
    normalized.includes('relation') ||
    normalized.includes('permission denied') ||
    normalized.includes('ez dago nahikoa galdera')
  );
};

