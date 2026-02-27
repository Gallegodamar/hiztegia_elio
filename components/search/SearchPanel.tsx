import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useSearch } from '../../hooks/useSearch';
import { useFavoritesData } from '../../hooks/useFavoritesData';
import { MeaningResults } from './MeaningResults';
import { SynonymResults } from './SynonymResults';
import { MeaningFlyout } from './MeaningFlyout';
import { Icon } from '../ui/Icon';
import { SearchResultItem } from '../../appTypes';

export const SearchPanel: React.FC = () => {
  const { username, showNotice } = useAppContext();
  const search = useSearch();
  const favorites = useFavoritesData(username);
  const [searchParams, setSearchParams] = useSearchParams();
  const isSynonymsMode = searchParams.get('mode') === 'synonyms';

  useEffect(() => {
    const queryTerm = searchParams.get('q');
    if (!queryTerm || !queryTerm.trim()) return;
    search.setSearchTerm(queryTerm.trim());
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, search.setSearchTerm]);

  useEffect(() => {
    const nextMode = isSynonymsMode ? 'synonyms' : 'meaning';
    if (search.searchMode !== nextMode) {
      search.setSearchMode(nextMode);
    }
  }, [isSynonymsMode, search.searchMode, search.setSearchMode]);

  const onSaveMeaningWord = async (word: string, meaning: string) => {
    const notice = await favorites.saveFavorite({ word, mode: 'meaning', meaning });
    if (notice) showNotice(notice);
  };

  const onSaveSynonymRow = async (row: SearchResultItem) => {
    const notice = await favorites.saveFavorite({
      word: row.hitza,
      mode: 'synonyms',
      synonyms: row.sinonimoak,
      level: row.level,
    });
    if (notice) showNotice(notice);
  };

  const handleSetSearchMode = (nextMode: 'meaning' | 'synonyms') => {
    if ((nextMode === 'synonyms') === isSynonymsMode) return;
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === 'synonyms') nextParams.set('mode', 'synonyms');
    else nextParams.delete('mode');
    setSearchParams(nextParams, { replace: true });
  };

  const hasSearchTerm = search.searchTerm.trim().length > 0;

  const handleClearSearch = () => {
    if (!hasSearchTerm) return;
    search.setSearchTerm('');
  };

  const handleSearchAction = () => {
    const term = search.searchTerm.trim();
    if (!term) return;
    if (isSynonymsMode) {
      search.studyWord(term, 'synonyms');
      return;
    }
    search.searchMeaningWord(term);
  };

  return (
    <div className="dictionary-view">
      <div className="dictionary-view__controls">
        <section className="surface-card search-controls search-controls--home p-3 md:p-4">
          <div className="home-search-tabs" role="tablist" aria-label="Bilaketa mota">
            <button
              type="button"
              role="tab"
              aria-selected={!isSynonymsMode}
              className={`home-search-tabs__tab ${!isSynonymsMode ? 'home-search-tabs__tab--active' : ''}`}
              onClick={() => handleSetSearchMode('meaning')}
            >
              Definizioak
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSynonymsMode}
              className={`home-search-tabs__tab ${isSynonymsMode ? 'home-search-tabs__tab--active' : ''}`}
              onClick={() => handleSetSearchMode('synonyms')}
            >
              Sinonimoak
            </button>
          </div>

          <div className="search-input-shell search-input-shell--leading search-input-shell--home">
            <Icon name="search" className="search-input-icon" />
            <input
              type="text"
              value={search.searchTerm}
              onChange={(e) => search.setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchAction();
              }}
              placeholder={
                isSynonymsMode
                  ? 'Idatzi hitz bat edo sinonimo bat (adib. *bar*)...'
                  : 'Idatzi hitz bat esanahia ikusteko (adib. *bar*)...'
              }
              className="input-shell input-shell--large input-shell--with-icon input-shell--with-cta home-search-input"
            />
            <button
              type="button"
              onClick={handleClearSearch}
              className="home-search-input__cta"
              aria-label="Bilaketa garbitu"
              title="Garbitu"
              disabled={!hasSearchTerm}
            >
              <Icon name="x" className="home-search-input__cta-icon" />
            </button>
          </div>
        </section>
      </div>

      <div className="dictionary-view__results custom-scrollbar">
        {isSynonymsMode ? (
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
