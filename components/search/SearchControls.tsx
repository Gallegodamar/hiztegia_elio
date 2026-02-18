import React from 'react';
import { SearchMode } from '../../lib/userFavorites';
import { SearchIcon } from '../layout/Icons';

type SearchControlsProps = {
  searchMode: SearchMode;
  searchTerm: string;
  onMode: (mode: SearchMode) => void;
  onTerm: (value: string) => void;
};

export const SearchControls: React.FC<SearchControlsProps> = ({
  searchMode,
  searchTerm,
  onMode,
  onTerm,
}) => (
  <section className="surface-card search-controls p-4 md:p-5">
    <div className="search-tabs">
      <button
        type="button"
        onClick={() => onMode('synonyms')}
        className={`search-tab ${searchMode === 'synonyms' ? 'search-tab--active' : ''}`}
      >
        Sinonimoak
      </button>
      <span className="search-tabs__divider" aria-hidden="true" />
      <button
        type="button"
        onClick={() => onMode('meaning')}
        className={`search-tab ${searchMode === 'meaning' ? 'search-tab--active' : ''}`}
      >
        Esanahia
      </button>
    </div>
    <div className="search-input-shell search-input-shell--leading">
      <SearchIcon className="search-input-icon" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onTerm(e.target.value)}
        placeholder={
          searchMode === 'synonyms'
            ? 'Idatzi hitz bat edo sinonimo bat (adib. *bar*)...'
            : 'Idatzi hitz bat esanahia ikusteko (adib. *bar*)...'
        }
        className="input-shell input-shell--large input-shell--with-clear input-shell--with-icon"
      />
      {searchTerm.trim().length > 0 ? (
        <button
          type="button"
          onClick={() => onTerm('')}
          className="search-input-clear"
          aria-label="Bilaketa garbitu"
          title="Garbitu"
        >
          x
        </button>
      ) : null}
    </div>
  </section>
);
