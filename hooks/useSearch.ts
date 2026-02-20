import { useCallback, useReducer, useRef, RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DictionaryMeaning } from '../appTypes';
import { searchDictionaryMeanings, lookupDictionaryMeaning } from '../lib/supabaseRepo';
import { normalizeFavoriteWordKey, SearchMode } from '../lib/userFavorites';
import { useDebouncedWordSearch } from './useDebouncedWordSearch';
import { useDebounce } from './useDebounce';

const buildMeaningFallbackUrl = (term: string): string =>
  `https://hiztegiak.elhuyar.eus/eu/${encodeURIComponent(term)}`;

export const isTermReady = (value: string): boolean =>
  value.trim().replace(/\*/g, '').length >= 1;

export type MeaningFlyout = {
  term: string;
  meaning: string | null;
  fallbackUrl: string;
  loading: boolean;
  width: number;
  left: number;
  top: number;
};

type SearchState = {
  searchTerm: string;
  searchMode: SearchMode;
  synonymPage: number;
  meaningPage: number;
  flyout: MeaningFlyout | null;
};

type SearchAction =
  | { type: 'SET_TERM'; term: string }
  | { type: 'SET_MODE'; mode: SearchMode }
  | { type: 'SET_SYNONYM_PAGE'; page: number }
  | { type: 'SET_MEANING_PAGE'; page: number }
  | { type: 'SET_FLYOUT'; flyout: MeaningFlyout | null }
  | { type: 'UPDATE_FLYOUT'; patch: Partial<MeaningFlyout> }
  | { type: 'STUDY_WORD'; word: string; mode: SearchMode }
  | { type: 'RESET' };

const initialState: SearchState = {
  searchTerm: '',
  searchMode: 'meaning',
  synonymPage: 1,
  meaningPage: 1,
  flyout: null,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_TERM':
      return {
        ...state,
        searchTerm: action.term,
        synonymPage: 1,
        meaningPage: 1,
        flyout: null,
      };
    case 'SET_MODE':
      return {
        ...state,
        searchMode: action.mode,
        synonymPage: 1,
        meaningPage: 1,
        flyout: null,
      };
    case 'SET_SYNONYM_PAGE':
      return { ...state, synonymPage: action.page };
    case 'SET_MEANING_PAGE':
      return { ...state, meaningPage: action.page };
    case 'SET_FLYOUT':
      return { ...state, flyout: action.flyout };
    case 'UPDATE_FLYOUT':
      return state.flyout ? { ...state, flyout: { ...state.flyout, ...action.patch } } : state;
    case 'STUDY_WORD':
      return {
        ...state,
        searchTerm: action.word,
        searchMode: action.mode,
        synonymPage: 1,
        meaningPage: 1,
        flyout: null,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export type UseSearchResult = {
  searchTerm: string;
  searchMode: SearchMode;
  synonymPage: number;
  meaningPage: number;
  flyout: MeaningFlyout | null;
  flyoutRef: RefObject<HTMLDivElement | null>;
  // synonym search
  synonymResults: ReturnType<typeof useDebouncedWordSearch>['searchResults'];
  isSynonymSearching: boolean;
  // meaning search
  meaningRows: DictionaryMeaning[];
  isMeaningLoading: boolean;
  meaningFallbackUrl: string | null;
  // actions
  setSearchTerm: (term: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setSynonymPage: (page: number) => void;
  setMeaningPage: (page: number) => void;
  closeFlyout: () => void;
  openMeaningFlyout: (term: string, anchorEl: HTMLElement) => void;
  studyWord: (word: string, mode: SearchMode) => void;
  searchMeaningWord: (word: string) => void;
  reset: () => void;
};

export const useSearch = (defaultMode?: SearchMode): UseSearchResult => {
  const [state, dispatch] = useReducer(
    searchReducer,
    defaultMode ? { ...initialState, searchMode: defaultMode } : initialState,
  );
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const flyoutRequestRef = useRef(0);
  const autoFallbackTermKeyRef = useRef<string | null>(null);

  // Synonym search (debounced, existing hook)
  const { searchResults: synonymResults, isSearching: isSynonymSearching } =
    useDebouncedWordSearch(state.searchMode === 'synonyms' ? state.searchTerm : '');

  // Meaning search via React Query with debounce
  const debouncedMeaningTerm = useDebounce(state.searchTerm, 180);
  const meaningEnabled =
    state.searchMode === 'meaning' && isTermReady(debouncedMeaningTerm);

  const meaningQuery = useQuery({
    queryKey: ['meanings', debouncedMeaningTerm],
    queryFn: () => searchDictionaryMeanings(debouncedMeaningTerm, 200),
    enabled: meaningEnabled,
    staleTime: 3 * 60 * 1000,
  });

  const meaningRows: DictionaryMeaning[] = meaningQuery.data ?? [];
  const isMeaningLoading = meaningEnabled && (meaningQuery.isLoading || meaningQuery.isFetching);

  const meaningFallbackUrl =
    state.searchMode === 'meaning' &&
    isTermReady(state.searchTerm) &&
    !isMeaningLoading &&
    meaningRows.length === 0
      ? buildMeaningFallbackUrl(state.searchTerm)
      : null;

  const setSearchTerm = useCallback((term: string) => dispatch({ type: 'SET_TERM', term }), []);
  const setSearchMode = useCallback((mode: SearchMode) => dispatch({ type: 'SET_MODE', mode }), []);
  const setSynonymPage = useCallback((page: number) => dispatch({ type: 'SET_SYNONYM_PAGE', page }), []);
  const setMeaningPage = useCallback((page: number) => dispatch({ type: 'SET_MEANING_PAGE', page }), []);
  const closeFlyout = useCallback(() => dispatch({ type: 'SET_FLYOUT', flyout: null }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const studyWord = useCallback((word: string, mode: SearchMode) => {
    dispatch({ type: 'STUDY_WORD', word, mode });
  }, []);

  const searchMeaningWord = useCallback((word: string) => {
    const normalized = word.trim();
    if (!normalized) return;
    autoFallbackTermKeyRef.current = normalizeFavoriteWordKey(normalized) || null;
    dispatch({ type: 'STUDY_WORD', word: normalized, mode: 'meaning' });
  }, []);

  const openMeaningFlyout = useCallback((term: string, anchorEl: HTMLElement) => {
    const normalized = term.trim();
    if (!normalized) return;

    const rect = anchorEl.getBoundingClientRect();
    const sideMargin = 12;
    const flyoutWidth = Math.min(320, window.innerWidth - sideMargin * 2);
    const maxLeft = window.innerWidth - flyoutWidth - sideMargin;
    const left = Math.min(Math.max(rect.left, sideMargin), Math.max(sideMargin, maxLeft));
    const top = Math.min(rect.bottom + 6, window.innerHeight - 56);

    const requestId = ++flyoutRequestRef.current;

    dispatch({
      type: 'SET_FLYOUT',
      flyout: {
        term: normalized,
        meaning: null,
        fallbackUrl: buildMeaningFallbackUrl(normalized),
        loading: true,
        width: flyoutWidth,
        left,
        top,
      },
    });

    void (async () => {
      try {
        const match = await lookupDictionaryMeaning(normalized);
        if (requestId !== flyoutRequestRef.current) return;
        dispatch({ type: 'UPDATE_FLYOUT', patch: { loading: false, meaning: match?.esanahia ?? null } });
      } catch {
        if (requestId !== flyoutRequestRef.current) return;
        dispatch({ type: 'UPDATE_FLYOUT', patch: { loading: false, meaning: null } });
      }
    })();
  }, []);

  return {
    searchTerm: state.searchTerm,
    searchMode: state.searchMode,
    synonymPage: state.synonymPage,
    meaningPage: state.meaningPage,
    flyout: state.flyout,
    flyoutRef,
    synonymResults,
    isSynonymSearching,
    meaningRows,
    isMeaningLoading,
    meaningFallbackUrl,
    setSearchTerm,
    setSearchMode,
    setSynonymPage,
    setMeaningPage,
    closeFlyout,
    openMeaningFlyout,
    studyWord,
    searchMeaningWord,
    reset,
  };
};
