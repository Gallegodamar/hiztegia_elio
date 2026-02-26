import { useQuery } from '@tanstack/react-query';
import type { StudyWord } from '../lib/dailySession';
import { fetchStudyWordPool } from '../lib/supabaseRepo';

export const useWords = (): {
  words: StudyWord[];
  isLoading: boolean;
  error: string | null;
} => {
  const query = useQuery({
    queryKey: ['study-words'],
    queryFn: () => fetchStudyWordPool(240),
    staleTime: 10 * 60 * 1000,
  });

  return {
    words: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
};

