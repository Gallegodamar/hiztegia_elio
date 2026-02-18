import { useCallback, useReducer } from 'react';
import { addSynonymWord } from '../lib/supabaseRepo';

type AddSynonymState = {
  word: string;
  synonymList: string;
  isSubmitting: boolean;
  error: string | null;
};

type AddSynonymAction =
  | { type: 'SET_WORD'; value: string }
  | { type: 'SET_SYNONYMS'; value: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

const initialState: AddSynonymState = {
  word: '',
  synonymList: '',
  isSubmitting: false,
  error: null,
};

function addSynonymReducer(state: AddSynonymState, action: AddSynonymAction): AddSynonymState {
  switch (action.type) {
    case 'SET_WORD':
      return { ...state, word: action.value, error: null };
    case 'SET_SYNONYMS':
      return { ...state, synonymList: action.value, error: null };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return { ...initialState };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export type UseAddSynonymResult = {
  word: string;
  synonymList: string;
  isSubmitting: boolean;
  error: string | null;
  setWord: (value: string) => void;
  setSynonymList: (value: string) => void;
  clearError: () => void;
  reset: () => void;
  submit: (username: string) => Promise<string | null>;
};

export const useAddSynonym = (): UseAddSynonymResult => {
  const [state, dispatch] = useReducer(addSynonymReducer, initialState);

  const setWord = useCallback((value: string) => dispatch({ type: 'SET_WORD', value }), []);
  const setSynonymList = useCallback((value: string) => dispatch({ type: 'SET_SYNONYMS', value }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const submit = useCallback(
    async (username: string): Promise<string | null> => {
      if (username !== 'admin') {
        dispatch({ type: 'SUBMIT_ERROR', error: 'Aukera hau admin erabiltzailearentzat bakarrik da.' });
        return null;
      }

      const word = state.word.trim();
      const synonyms: string[] = Array.from(
        new Set(
          state.synonymList
            .split(/[\n,;]+/g)
            .map((item) => item.trim())
            .filter((item): item is string => item.length > 0)
        )
      );

      if (!word) {
        dispatch({ type: 'SUBMIT_ERROR', error: 'Hitza bete behar da.' });
        return null;
      }
      if (synonyms.length === 0) {
        dispatch({ type: 'SUBMIT_ERROR', error: 'Sinonimo bat gutxienez bete behar da.' });
        return null;
      }

      dispatch({ type: 'SUBMIT_START' });
      const result = await addSynonymWord(word, synonyms);

      if (!result.ok) {
        dispatch({ type: 'SUBMIT_ERROR', error: result.error?.message ?? 'Ezin izan da sinonimoa gehitu.' });
        return null;
      }

      dispatch({ type: 'SUBMIT_SUCCESS' });
      return `"${word.trim().toLowerCase()}" sinonimoen hiztegian gorde da (1. maila).`;
    },
    [state.word, state.synonymList]
  );

  return { ...state, setWord, setSynonymList, clearError, reset, submit };
};
