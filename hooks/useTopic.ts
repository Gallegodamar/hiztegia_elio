import { useQuery } from '@tanstack/react-query';
import { TopicDetail } from '../appTypes';
import { fetchTopicBySlug } from '../lib/supabaseRepo';

export const useTopic = (
  slug: string
): {
  topic: TopicDetail | null;
  isLoading: boolean;
} => {
  const normalizedSlug = slug.trim().toLowerCase();

  const query = useQuery({
    queryKey: ['topic', normalizedSlug],
    queryFn: () => fetchTopicBySlug(normalizedSlug),
    enabled: normalizedSlug.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    topic: query.data ?? null,
    isLoading: query.isLoading,
  };
};
