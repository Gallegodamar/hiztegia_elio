import { useQuery } from '@tanstack/react-query';
import { fetchDailyQuestions, type DailyQuestionRow } from '../lib/dailyQuestions';

export const useDailyQuestions = (
  dateKey: string
): {
  questions: DailyQuestionRow[];
  isLoading: boolean;
  error: string | null;
} => {
  const query = useQuery({
    queryKey: ['daily_questions', dateKey],
    queryFn: () => fetchDailyQuestions(dateKey),
    enabled: dateKey.trim().length > 0,
    staleTime: 60 * 1000,
  });

  return {
    questions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
};

