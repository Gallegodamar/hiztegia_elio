import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useSearch } from '../../hooks/useSearch';
import { useFavoritesData } from '../../hooks/useFavoritesData';
import { SynonymResults } from './SynonymResults';
import { MeaningFlyout } from './MeaningFlyout';
import { SearchIcon } from '../layout/Icons';
import { SearchResultItem } from '../../appTypes';

export const SynonymPanel: React.FC = () => {
  const { username, showNotice } = useAppContext();
  const search = useSearch('synonyms');
  const { setSearchTerm } = search;
  const favorites = useFavoritesData(username);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const queryTerm = searchParams.get('q');
    if (!queryTerm || !queryTerm.trim()) return;
    setSearchTerm(queryTerm.trim());
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, setSearchTerm]);

  const onSaveSynonymRow = async (row: SearchResultItem) => {
    const notice = await favorites.saveFavorite({
      word: row.hitza,
      mode: 'synonyms',
      synonyms: row.sinonimoak,
      level: row.level,
    });
    if (notice) showNotice(notice);
  };

  const onSaveDailySynonym = async (word: string, synonyms: string[]) => {
    const notice = await favorites.saveFavorite({
      word,
      mode: 'synonyms',
      synonyms,
    });
    if (notice) showNotice(notice);
  };

  return (
    <div className="dictionary-view">
      <div className="dictionary-view__controls">
        <section className="surface-card search-controls p-4 md:p-5">
          <div className="search-input-shell search-input-shell--leading">
            <SearchIcon className="search-input-icon" />
            <input
              type="text"
              value={search.searchTerm}
              onChange={(e) => search.setSearchTerm(e.target.value)}
              placeholder="Idatzi hitz bat edo sinonimo bat (adib. *bar*)..."
              className="input-shell input-shell--large input-shell--with-clear input-shell--with-icon"
            />
            {search.searchTerm.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => search.setSearchTerm('')}
                className="search-input-clear"
                aria-label="Bilaketa garbitu"
                title="Garbitu"
              >
                x
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <div className="dictionary-view__results custom-scrollbar">
        <SynonymResults
          searchTerm={search.searchTerm}
          isSearching={search.isSynonymSearching}
          rows={search.synonymResults}
          synonymPage={search.synonymPage}
          onSynonymPageChange={search.setSynonymPage}
          isSavedToday={favorites.isSavedToday}
          isSavingWord={favorites.isSavingWord}
          onSave={onSaveSynonymRow}
          onSaveDailySynonym={onSaveDailySynonym}
          onOpenMeaning={search.openMeaningFlyout}
          onSearchWord={(word) => search.studyWord(word, 'synonyms')}
        />
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
