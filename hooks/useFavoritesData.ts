import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFavoritesByUsername,
  insertFavoriteByUsername,
  deleteFavoriteById,
} from '../lib/supabaseRepo';
import {
  FavoritesByDate,
  FavoriteWord,
  SearchMode,
  addFavoriteEntryToState,
  hasFavoriteInDate,
  normalizeFavoriteWordKey,
  removeFavoriteEntryFromState,
  todayKey,
} from '../lib/userFavorites';
import { DifficultyLevel } from '../types';

export type SaveFavoriteParams = {
  word: string;
  mode: SearchMode;
  meaning?: string | null;
  synonyms?: string[];
  level?: DifficultyLevel | null;
};

export type UseFavoritesDataResult = {
  favoritesByDate: FavoritesByDate;
  isLoading: boolean;
  error: string | null;
  isSavedToday: (word: string) => boolean;
  isSavingWord: (word: string) => boolean;
  isDeletingFavorite: (id: string) => boolean;
  saveFavorite: (params: SaveFavoriteParams) => Promise<string | null>;
  deleteFavorite: (favorite: FavoriteWord) => Promise<string | null>;
};

export const favoritesQueryKey = (username: string) => ['favorites', username] as const;

export const useFavoritesData = (username: string): UseFavoritesDataResult => {
  const queryClient = useQueryClient();
  const currentDay = todayKey();

  const query = useQuery({
    queryKey: favoritesQueryKey(username),
    queryFn: async () => {
      const result = await fetchFavoritesByUsername(username);
      if (result.error) {
        throw new Error(
          result.error.reason === 'missing_table'
            ? 'Gogokoen taula falta da Supabasen. Exekutatu supabase_favorites.sql.'
            : result.error.reason === 'unauthorized'
              ? 'Gogokoak erabiltzeko, Supabase Auth bidez saioa hasi behar duzu.'
            : 'Ezin izan dira gogokoak Supabasetik kargatu.'
        );
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const favoritesByDate: FavoritesByDate = query.data ?? {};

  const isSavedToday = useCallback(
    (word: string) => hasFavoriteInDate(favoritesByDate, currentDay, word),
    [favoritesByDate, currentDay]
  );

  const saveMutation = useMutation({
    mutationFn: (params: SaveFavoriteParams & { username: string; dateKey: string }) =>
      insertFavoriteByUsername(params),
    onSuccess: (result) => {
      if (!result.data) return;
      queryClient.setQueryData<FavoritesByDate>(
        favoritesQueryKey(username),
        (old) => addFavoriteEntryToState(old ?? {}, result.data!.dateKey, result.data!.favorite)
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (params: { username: string; favoriteId: string }) =>
      deleteFavoriteById(params),
    onSuccess: (result, variables) => {
      if (!result.data?.deleted) return;
      queryClient.setQueryData<FavoritesByDate>(
        favoritesQueryKey(username),
        (old) => removeFavoriteEntryFromState(old ?? {}, variables.favoriteId)
      );
    },
  });

  const saveFavorite = useCallback(
    async (params: SaveFavoriteParams): Promise<string | null> => {
      const word = params.word.trim();
      if (!word) return null;
      if (hasFavoriteInDate(favoritesByDate, currentDay, word)) {
        return `"${word}" gaur jada gordeta dago.`;
      }
      const result = await saveMutation.mutateAsync({
        ...params,
        username,
        dateKey: currentDay,
        word,
      });
      if (result.error) {
        if (result.error.reason === 'duplicate') return `"${word}" gaur jada gordeta dago.`;
        if (result.error.reason === 'missing_table') return 'Gogokoen taula falta da Supabasen.';
        if (result.error.reason === 'unauthorized') {
          return 'Gogokoak gordetzeko, Supabase Auth bidez saioa hasi behar duzu.';
        }
        return 'Ezin izan da gogokoa Supabasen gorde.';
      }
      if (!result.data) return 'Ezin izan da gogokoa Supabasen gorde.';
      return `"${word}" gogokoetan gorde da.`;
    },
    [favoritesByDate, currentDay, saveMutation, username]
  );

  const deleteFavorite = useCallback(
    async (favorite: FavoriteWord): Promise<string | null> => {
      const confirmed = window.confirm(`"${favorite.word}" gogokoetatik ezabatu nahi duzu?`);
      if (!confirmed) return null;
      const result = await deleteMutation.mutateAsync({ username, favoriteId: favorite.id });
      if (result.error) {
        if (result.error.reason === 'missing_table') return 'Gogokoen taula falta da Supabasen.';
        if (result.error.reason === 'unauthorized') {
          return 'Gogokoak ezabatzeko, Supabase Auth bidez saioa hasi behar duzu.';
        }
        return 'Ezin izan da gogokoa ezabatu.';
      }
      if (!result.data?.deleted) return 'Ez da ezabatzeko gogokoa aurkitu.';
      return `"${favorite.word}" gogokoetatik ezabatu da.`;
    },
    [deleteMutation, username]
  );

  const isSavingWord = useCallback(
    (word: string) =>
      saveMutation.isPending &&
      normalizeFavoriteWordKey(saveMutation.variables?.word ?? '') ===
        normalizeFavoriteWordKey(word),
    [saveMutation.isPending, saveMutation.variables]
  );

  const isDeletingFavorite = useCallback(
    (id: string) => deleteMutation.isPending && deleteMutation.variables?.favoriteId === id,
    [deleteMutation.isPending, deleteMutation.variables]
  );

  return {
    favoritesByDate,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    isSavedToday,
    isSavingWord,
    isDeletingFavorite,
    saveFavorite,
    deleteFavorite,
  };
};
