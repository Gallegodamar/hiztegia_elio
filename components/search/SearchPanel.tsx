import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useSearch } from '../../hooks/useSearch';
import { useFavoritesData } from '../../hooks/useFavoritesData';
import { SearchControls } from './SearchControls';
import { SynonymResults } from './SynonymResults';
import { MeaningResults } from './MeaningResults';
import { MeaningFlyout } from './MeaningFlyout';
import { SearchResultItem } from '../../appTypes';

export const SearchPanel: React.FC = () => {
  const { username, showNotice } = useAppContext();
  const search = useSearch();
  const favorites = useFavoritesData(username);

  const onSaveSynonymRow = async (row: SearchResultItem) => {
    const notice = await favorites.saveFavorite({
      word: row.hitza,
      mode: 'synonyms',
      synonyms: row.sinonimoak,
      level: row.level,
    });
    if (notice) showNotice(notice);
  };

  const onSaveMeaningWord = async (word: string, meaning: string) => {
    const notice = await favorites.saveFavorite({ word, mode: 'meaning', meaning });
    if (notice) showNotice(notice);
  };

  return (
    <div className="dictionary-view">
      <div className="dictionary-view__controls">
        <SearchControls
          searchMode={search.searchMode}
          searchTerm={search.searchTerm}
          onMode={search.setSearchMode}
          onTerm={search.setSearchTerm}
        />
      </div>

      <div className="dictionary-view__results custom-scrollbar">
        {search.searchMode === 'synonyms' ? (
          <SynonymResults
            searchTerm={search.searchTerm}
            isSearching={search.isSynonymSearching}
            rows={search.synonymResults}
            synonymPage={search.synonymPage}
            onSynonymPageChange={search.setSynonymPage}
            isSavedToday={favorites.isSavedToday}
            isSavingWord={favorites.isSavingWord}
            onSave={onSaveSynonymRow}
            onOpenMeaning={search.openMeaningFlyout}
            onSearchWord={(word) => search.studyWord(word, 'synonyms')}
          />
        ) : (
          <MeaningResults
            searchTerm={search.searchTerm}
            isMeaningLoading={search.isMeaningLoading}
            meaningRows={search.meaningRows}
            fallbackUrl={search.meaningFallbackUrl}
            meaningPage={search.meaningPage}
            onMeaningPageChange={search.setMeaningPage}
            isSavedToday={favorites.isSavedToday}
            isSavingWord={favorites.isSavingWord}
            onSave={onSaveMeaningWord}
            onSearchWord={search.searchMeaningWord}
          />
        )}
      </div>

      {search.flyout ? (
        <MeaningFlyout
          flyout={search.flyout}
          flyoutRef={search.flyoutRef}
          onClose={search.closeFlyout}
        />
      ) : null}
    </div>
  );
};
