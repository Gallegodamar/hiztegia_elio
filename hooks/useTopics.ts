import { useQuery } from '@tanstack/react-query';
import { TopicSummary } from '../appTypes';
import { fetchAllTopics } from '../lib/supabaseRepo';

export const useTopics = (): {
  topics: TopicSummary[];
  isLoading: boolean;
} => {
  const query = useQuery({
    queryKey: ['topics'],
    queryFn: fetchAllTopics,
    staleTime: 5 * 60 * 1000,
  });

  return {
    topics: query.data ?? [],
    isLoading: query.isLoading,
  };
};
