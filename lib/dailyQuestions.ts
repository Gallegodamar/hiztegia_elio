import { formatLocalDate } from './dateUtils';
import { supabaseClient } from './supabaseClient';

export type DailyQuestionRow = {
  id: string | number;
  date_key: string;
  idx: number;
  word_eu: string;
  prompt_eu: string;
  option_a: string;
  option_b: string;
  option_c: string;
  [key: string]: unknown;
};

export const getCurrentDateKey = (date: Date = new Date()): string => formatLocalDate(date);

export const fetchDailyQuestions = async (
  dateKey: string
): Promise<DailyQuestionRow[]> => {
  const normalizedDateKey = dateKey.trim();
  if (!normalizedDateKey) return [];

  const { data, error } = await supabaseClient
    .from('daily_questions')
    .select('*')
    .eq('date_key', normalizedDateKey)
    .order('idx', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Ezin izan dira eguneko galderak kargatu.');
  }

  return ((data ?? []) as DailyQuestionRow[]).map((row) => ({
    ...row,
    word_eu: typeof row.word_eu === 'string' ? row.word_eu.trim() : '',
    prompt_eu: typeof row.prompt_eu === 'string' ? row.prompt_eu.trim() : '',
    option_a: typeof row.option_a === 'string' ? row.option_a.trim() : '',
    option_b: typeof row.option_b === 'string' ? row.option_b.trim() : '',
    option_c: typeof row.option_c === 'string' ? row.option_c.trim() : '',
  }));
};

