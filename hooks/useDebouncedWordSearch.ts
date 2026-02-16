import { useEffect, useRef, useState } from 'react';
import { SearchResultItem } from '../appTypes';
import { searchWords } from '../lib/supabaseRepo';

export const useDebouncedWordSearch = (
  searchTerm: string,
  delayMs = 150
): { searchResults: SearchResultItem[]; isSearching: boolean } => {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const token = normalizedTerm.replace(/\*/g, '').trim();
    let isCancelled = false;

    if (!token || token.length < 1) {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchWords(normalizedTerm);
        if (isCancelled || requestId !== searchRequestIdRef.current) return;
        setSearchResults(results);
      } catch {
        if (isCancelled || requestId !== searchRequestIdRef.current) return;
        setSearchResults([]);
      } finally {
        if (isCancelled || requestId !== searchRequestIdRef.current) return;
        setIsSearching(false);
      }
    }, delayMs);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs, searchTerm]);

  return { searchResults, isSearching };
};
