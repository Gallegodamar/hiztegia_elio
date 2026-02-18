import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DictionaryMeaning, SearchResultItem } from '../appTypes';
import { DifficultyLevel } from '../types';
import { AppShell } from './layout/AppShell';
import { useDebouncedWordSearch } from '../hooks/useDebouncedWordSearch';
import {
  addSynonymWord,
  deleteFavoriteById,
  fetchFavoritesByUsername,
  insertFavoriteByUsername,
  lookupDictionaryMeaning,
  searchDictionaryMeanings,
  signInWithRegisteredUser,
  signOutRegisteredUser,
  validateUserAccessKey,
} from '../lib/supabaseRepo';
import {
  addFavoriteEntryToState,
  SearchMode,
  clearActiveUser,
  FavoriteWord,
  FavoritesByDate,
  hasFavoriteInDate,
  normalizeFavoriteWordKey,
  readActiveUser,
  removeFavoriteEntryFromState,
  todayKey,
  writeActiveUser,
} from '../lib/userFavorites';

type ActiveView = 'dictionary' | 'favorites' | 'addSynonym';
const RESULTS_PAGE_SIZE = 10;
const APP_ICON_SRC = '/icon-192x192.png';

const segmentedButtonClass = (isActive: boolean): string =>
  `segmented-btn ${isActive ? 'segmented-btn--active' : 'segmented-btn--idle'}`;

const accentActionClass = (isDisabled: boolean): string =>
  `action-pill ${isDisabled ? 'action-pill--disabled' : 'action-pill--accent'}`;

const dangerActionClass = (isDisabled: boolean): string =>
  `action-pill ${isDisabled ? 'action-pill--disabled' : 'action-pill--danger'}`;

const buildMeaningFallbackUrl = (term: string): string =>
  `https://hiztegiak.elhuyar.eus/eu/${encodeURIComponent(term)}`;

const openExternalDictionary = (url: string): void => {
  const externalWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!externalWindow) {
    window.location.assign(url);
  }
};

const isTermReady = (value: string): boolean =>
  value.trim().replace(/\*/g, '').length >= 1;

const buildUserInitials = (rawUsername: string): string => {
  const normalized = rawUsername.trim();
  if (!normalized) return '?';

  const tokens = normalized.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (tokens.length >= 2) {
    return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
  }

  const fallback = (tokens[0] ?? normalized).replace(/[^a-zA-Z0-9]/g, '');
  return (fallback.slice(0, 2) || normalized.slice(0, 1)).toUpperCase();
};

type MeaningFlyout = {
  term: string;
  meaning: string | null;
  fallbackUrl: string;
  loading: boolean;
  width: number;
  left: number;
  top: number;
};

const ScreenHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = ({
  title,
  subtitle,
}) => (
  <div className="elio-brand-header">
    <div className="elio-brand-header__main">
      <div className="elio-brand-icon-shell" aria-hidden="true">
        <img src={APP_ICON_SRC} alt="" className="elio-brand-icon" />
      </div>
      <div className="min-w-0">
        <h1 className="display-title">{title}</h1>
        {subtitle ? (
          <p className="elio-brand-subtitle">{subtitle}</p>
        ) : null}
      </div>
    </div>
  </div>
);

const LoginView: React.FC<{
  usernameInput: string;
  userKeyInput: string;
  isLoggingIn: boolean;
  usernameError: string | null;
  onUserInput: (value: string) => void;
  onKeyInput: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}> = ({
  usernameInput,
  userKeyInput,
  isLoggingIn,
  usernameError,
  onUserInput,
  onKeyInput,
  onSubmit,
}) => (
  <AppShell
    header={<ScreenHeader title="Hiztegia" />}
    contentClassName="mx-auto flex w-full max-w-5xl items-center justify-center"
  >
    <section className="surface-card surface-card--muted auth-card w-full max-w-lg p-6 md:p-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="field-label">
            Erabiltzailea
          </span>
          <input
            type="text"
            value={usernameInput}
            onChange={(event) => onUserInput(event.target.value)}
            placeholder="adib. s_01 edo user@email.com"
            className="input-shell"
            required
          />
        </label>

        <label className="block">
          <span className="field-label">
            Gakoa
          </span>
          <input
            type="password"
            value={userKeyInput}
            onChange={(event) => onKeyInput(event.target.value)}
            placeholder="Zure gakoa"
            className="input-shell"
            required
          />
        </label>

        {usernameError ? (
          <p className="notice notice--error">
            {usernameError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          className="btn-primary w-full py-3 text-sm"
        >
          {isLoggingIn ? 'Egiaztatzen...' : 'Sartu'}
        </button>
      </form>
    </section>
  </AppShell>
);

const OpenBookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 6.6c-1.1-.7-2.4-1.1-3.8-1.1H5.8c-.9 0-1.6.7-1.6 1.6v9.8c0 .9.7 1.6 1.6 1.6h2.3c1.4 0 2.7.4 3.9 1.1 1.2-.7 2.5-1.1 3.9-1.1h2.3c.9 0 1.6-.7 1.6-1.6V7.1c0-.9-.7-1.6-1.6-1.6H16c-1.4 0-2.7.4-4 1.1Z" />
    <path d="M12 6.6V18.7" />
  </svg>
);

const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 20.7s-7.2-4.5-8.5-8.6c-.8-2.6.5-5.4 3.1-6.2 2.1-.7 4.4.2 5.4 2.1 1-1.9 3.3-2.8 5.4-2.1 2.6.8 3.9 3.6 3.1 6.2-1.3 4.1-8.5 8.6-8.5 8.6Z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 5.8v12.4" />
    <path d="M5.8 12h12.4" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4.4-4.4" />
  </svg>
);

const MoreHorizontalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
  </svg>
);

const BottomTaskBar: React.FC<{
  activeView: ActiveView;
  onChange: (view: ActiveView) => void;
  isAdminUser: boolean;
}> = ({ activeView, onChange, isAdminUser }) => {
  const views = isAdminUser
    ? (['dictionary', 'favorites', 'addSynonym'] as const)
    : (['dictionary', 'favorites'] as const);

  return (
    <nav className="bottom-taskbar" aria-label="Nabigazio nagusia">
      <div className="bottom-taskbar__buttons">
        {views.map((view, index) => {
          const label =
            view === 'dictionary'
              ? 'Hiztegia'
              : view === 'favorites'
                ? 'Gogokoak'
                : 'Sinonimoa gehitu';
          const isActive = activeView === view;

          return (
            <React.Fragment key={view}>
              {index > 0 ? <span className="bottom-taskbar__separator" aria-hidden="true" /> : null}
              <button
                type="button"
                onClick={() => onChange(view)}
                className={`bottom-taskbar__button ${
                  isActive ? 'bottom-taskbar__button--active' : 'bottom-taskbar__button--idle'
                }`}
                aria-label={label}
                title={label}
              >
                {view === 'dictionary' ? (
                  <OpenBookIcon className="bottom-taskbar__icon bottom-taskbar__icon--dictionary" />
                ) : view === 'favorites' ? (
                  <HeartIcon className="bottom-taskbar__icon bottom-taskbar__icon--favorites" />
                ) : (
                  <PlusIcon className="bottom-taskbar__icon bottom-taskbar__icon--add" />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

const DictionarySearchControls: React.FC<{
  searchMode: SearchMode;
  searchTerm: string;
  onMode: (mode: SearchMode) => void;
  onTerm: (value: string) => void;
}> = ({ searchMode, searchTerm, onMode, onTerm }) => (
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
        onChange={(event) => onTerm(event.target.value)}
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

const SynonymSearchResults: React.FC<{
  searchTerm: string;
  isSearching: boolean;
  rows: SearchResultItem[];
  synonymPage: number;
  onSynonymPageChange: (page: number) => void;
  isSavedToday: (word: string) => boolean;
  isSavingWord: (word: string) => boolean;
  onSave: (row: SearchResultItem) => void;
  onOpenMeaning: (term: string, anchorEl: HTMLElement) => void;
  onSearchWord: (word: string) => void;
}> = ({
  searchTerm,
  isSearching,
  rows,
  synonymPage,
  onSynonymPageChange,
  isSavedToday,
  isSavingWord,
  onSave,
  onOpenMeaning,
  onSearchWord,
}) => {
  if (!isTermReady(searchTerm)) {
    return (
      <p className="status-copy">
        Idazten hasi bilatzeko.
      </p>
    );
  }

  if (isSearching) {
    return (
      <p className="status-copy">
        Sinonimoak bilatzen...
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="status-copy">Ez da emaitzarik aurkitu.</p>;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(synonymPage, 1), totalPages);
  const pageStart = (safePage - 1) * RESULTS_PAGE_SIZE;
  const visibleRows = rows.slice(pageStart, pageStart + RESULTS_PAGE_SIZE);

  return (
    <div className="space-y-3">
      {totalPages > 1 ? (
        <section className="surface-card surface-card--muted p-3 results-pagination">
          <div className="results-pagination__controls">
            <button
              type="button"
              onClick={() => onSynonymPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aurrekoa
            </button>
            <p className="section-label results-pagination__meta">
              <span>{rows.length} emaitza</span>
              <span>{safePage}/{totalPages}</span>
            </p>
            <button
              type="button"
              onClick={() => onSynonymPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hurrengoa
            </button>
          </div>
        </section>
      ) : (
        <section className="surface-card surface-card--muted p-3">
          <p className="section-label">
            {rows.length} emaitza
          </p>
        </section>
      )}

      <section className="grid gap-3">
        {visibleRows.map((row, index) => {
        const savedToday = isSavedToday(row.hitza);
        const saving = isSavingWord(row.hitza);
        return (
          <article key={`${row.id}-${index}`} className="surface-card word-result-card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={(event) => onOpenMeaning(row.hitza, event.currentTarget)}
                  className="word-link"
                  title="Esanahia ikusi"
                >
                  {row.hitza}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSave(row)}
                disabled={savedToday || saving}
                className={accentActionClass(savedToday || saving)}
              >
                {savedToday ? 'Gaur gordeta' : saving ? 'Gordetzen...' : 'Gogokoetara'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {row.sinonimoak.map((synonym, synonymIndex) => (
                <button
                  key={`${row.id}-${synonym}-${synonymIndex}`}
                  type="button"
                  onClick={() => onSearchWord(synonym)}
                  className="term-chip"
                  title={`"${synonym}" bilatu`}
                >
                  {synonym}
                </button>
              ))}
            </div>
          </article>
        );
        })}
      </section>
    </div>
  );
};

const MeaningSearchResults: React.FC<{
  searchTerm: string;
  isMeaningLoading: boolean;
  meaningRows: DictionaryMeaning[];
  fallbackUrl: string | null;
  meaningPage: number;
  onMeaningPageChange: (page: number) => void;
  isSavedToday: (word: string) => boolean;
  isSavingWord: (word: string) => boolean;
  onSave: (word: string, meaning: string) => void;
  onSearchWord: (word: string) => void;
}> = ({
  searchTerm,
  isMeaningLoading,
  meaningRows,
  fallbackUrl,
  meaningPage,
  onMeaningPageChange,
  isSavedToday,
  isSavingWord,
  onSave,
  onSearchWord,
}) => {
  if (!isTermReady(searchTerm)) {
    return (
      <p className="status-copy">
        Idazten hasi esanahia bilatzeko.
      </p>
    );
  }

  if (isMeaningLoading) {
    return (
      <p className="status-copy">
        Esanahiak bilatzen...
      </p>
    );
  }

  if (meaningRows.length === 0) {
    return (
      <article className="surface-card surface-card--muted p-4 md:p-5">
        <p className="status-copy">
          Ez da tokiko hiztegian esanahirik aurkitu.
        </p>
        {fallbackUrl ? (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dictionary-flyout__link mt-3"
          >
            Ireki Elhuyar-en
          </a>
        ) : null}
      </article>
    );
  }

  const totalPages = Math.max(1, Math.ceil(meaningRows.length / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(meaningPage, 1), totalPages);
  const pageStart = (safePage - 1) * RESULTS_PAGE_SIZE;
  const visibleRows = meaningRows.slice(pageStart, pageStart + RESULTS_PAGE_SIZE);

  return (
    <div className="space-y-3">
      {totalPages > 1 ? (
        <section className="surface-card surface-card--muted p-3 results-pagination">
          <div className="results-pagination__controls">
            <button
              type="button"
              onClick={() => onMeaningPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aurrekoa
            </button>
            <p className="section-label results-pagination__meta">
              <span>{meaningRows.length} emaitza</span>
              <span>{safePage}/{totalPages}</span>
            </p>
            <button
              type="button"
              onClick={() => onMeaningPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hurrengoa
            </button>
          </div>
        </section>
      ) : (
        <section className="surface-card surface-card--muted p-3">
          <p className="section-label">
            {meaningRows.length} emaitza
          </p>
        </section>
      )}

      <section className="grid gap-3">
        {visibleRows.map((row, index) => {
          const savedToday = isSavedToday(row.hitza);
          const saving = isSavingWord(row.hitza);
          const definitionParagraphs =
            row.definizioak.length > 0
              ? row.definizioak
              : row.esanahia.trim()
                ? [row.esanahia.trim()]
                : [];
          return (
            <article key={`${row.hitza}-${index}`} className="surface-card word-result-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="word-title">
                    {row.hitza}
                  </h3>
                  {row.sinonimoak.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.sinonimoak.map((synonym, synonymIndex) => (
                        <button
                          key={`${row.hitza}-${synonym}-${synonymIndex}`}
                          type="button"
                          onClick={() => onSearchWord(synonym)}
                          className="term-chip"
                          title={`"${synonym}" bilatu`}
                        >
                          {synonym}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSave(
                      row.hitza,
                      definitionParagraphs.length > 0
                        ? definitionParagraphs.join('\n\n')
                        : row.esanahia
                    )
                  }
                  disabled={savedToday || saving}
                  className={accentActionClass(savedToday || saving)}
                >
                  {savedToday ? 'Gaur gordeta' : saving ? 'Gordetzen...' : 'Gogokoetara'}
                </button>
              </div>
              {definitionParagraphs.map((definition, definitionIndex) => (
                <p
                  key={`${row.hitza}-definition-${definitionIndex}`}
                  className={
                    `meaning-copy ${definitionIndex === 0 ? 'mt-3' : 'mt-2'}`
                  }
                >
                  {definition}
                </p>
              ))}
            </article>
          );
        })}
      </section>
    </div>
  );
};

const FavoritesPanel: React.FC<{
  currentDay: string;
  historyDate: string;
  setHistoryDate: (date: string) => void;
  rows: FavoriteWord[];
  isLoading: boolean;
  syncError: string | null;
  favoriteQuery: string;
  onFavoriteQueryChange: (value: string) => void;
  deletingFavoriteId: string | null;
  onDeleteFavorite: (favorite: FavoriteWord) => void;
  onStudyWord: (word: string, mode: SearchMode) => void;
}> = ({
  currentDay,
  historyDate,
  setHistoryDate,
  rows,
  isLoading,
  syncError,
  favoriteQuery,
  onFavoriteQueryChange,
  deletingFavoriteId,
  onDeleteFavorite,
  onStudyWord,
}) => (
  <div className="favorites-view">
    <div className="favorites-view__controls">
      <section className="surface-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="helper-note !m-0">
            {rows.length} hitz gordeta.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={historyDate}
              max={currentDay}
              onChange={(event) => setHistoryDate(event.target.value)}
              className="input-shell !w-auto !py-2 !text-sm"
            />
            <button
              type="button"
              onClick={() => setHistoryDate(currentDay)}
              className="btn-secondary !py-2 !text-sm"
            >
              Gaur
            </button>
          </div>
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="search-input-shell">
          <input
            type="text"
            value={favoriteQuery}
            onChange={(event) => onFavoriteQueryChange(event.target.value)}
            placeholder="Hitzaren arabera iragazi..."
            className="input-shell input-shell--with-clear !py-2.5 !text-sm"
            aria-label="Gogokoetan bilatu"
          />
          {favoriteQuery.trim().length > 0 ? (
            <button
              type="button"
              onClick={() => onFavoriteQueryChange('')}
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

    <div className="favorites-view__results custom-scrollbar">
      {isLoading ? (
        <section className="surface-card surface-card--muted p-4 md:p-5">
          <p className="status-copy">Gogokoak Supabasetik kargatzen...</p>
        </section>
      ) : syncError ? (
        <section className="surface-card surface-card--muted p-4 md:p-5">
          <p className="notice notice--error">{syncError}</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="surface-card surface-card--muted p-4 md:p-5">
          <p className="status-copy">
            Ez dago data honetarako hitz gordeturik.
          </p>
        </section>
      ) : (
        <section className="grid gap-3">
          {rows.map((entry) => (
            <article key={entry.id} className="surface-card word-result-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="word-title">
                    {entry.word}
                  </h3>
                  <p className="section-label mt-1">
                    {entry.mode === 'meaning' ? 'Esanahia' : 'Sinonimoak'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onStudyWord(entry.word, entry.mode)}
                    className="action-pill action-pill--neutral"
                  >
                    Ikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFavorite(entry)}
                    disabled={deletingFavoriteId === entry.id}
                    className={dangerActionClass(deletingFavoriteId === entry.id)}
                  >
                    {deletingFavoriteId === entry.id ? 'Ezabatzen...' : 'Ezabatu'}
                  </button>
                </div>
              </div>

              {entry.meaning ? (
                <p className="meaning-copy mt-3 !text-sm md:!text-base">
                  {entry.meaning}
                </p>
              ) : null}

              {entry.synonyms.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.synonyms.map((synonym, index) => (
                    <span
                      key={`${entry.id}-${synonym}-${index}`}
                      className="term-chip term-chip--static"
                    >
                      {synonym}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  </div>
);

const AddSynonymPanel: React.FC<{
  newWord: string;
  newSynonyms: string;
  isSubmitting: boolean;
  addError: string | null;
  onWordChange: (value: string) => void;
  onSynonymsChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}> = ({
  newWord,
  newSynonyms,
  isSubmitting,
  addError,
  onWordChange,
  onSynonymsChange,
  onSubmit,
}) => (
  <section className="surface-card p-4 md:p-5">
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="status-copy">
        Hitz berria sinonimoen hiztegian gehitu (beti <strong>1. mailan</strong>).
      </p>
      <p className="helper-note">
        Sistemak automatikoki egiaztatzen du hitza jada badagoen sinonimoen
        hiztegi osoan.
      </p>

      <label className="block">
        <span className="field-label">
          Hitza
        </span>
        <input
          type="text"
          value={newWord}
          onChange={(event) => onWordChange(event.target.value)}
          placeholder="Adib. dagoeneko"
          className="input-shell"
          required
        />
      </label>

      <label className="block">
        <span className="field-label">
          Sinonimoak
        </span>
        <textarea
          value={newSynonyms}
          onChange={(event) => onSynonymsChange(event.target.value)}
          placeholder="Adib. jadanik, honezkero, dagoenez"
          className="input-shell min-h-24 resize-y"
          required
        />
        <p className="helper-note mt-1">
          Banandu komaz, puntu eta komaz edo lerro-jauziez.
        </p>
      </label>

      {addError ? (
        <p className="notice notice--error">
          {addError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full py-3 text-sm"
      >
        {isSubmitting ? 'Gordetzen...' : 'Sinonimoa gehitu'}
      </button>
    </form>
  </section>
);

export const DictionaryApp: React.FC = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState(() => readActiveUser() ?? '');
  const [userKeyInput, setUserKeyInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const userInitials = useMemo(
    () => (username ? buildUserInitials(username) : ''),
    [username]
  );

  const [activeView, setActiveView] = useState<ActiveView>('dictionary');
  const [searchMode, setSearchMode] = useState<SearchMode>('synonyms');
  const [searchTerm, setSearchTerm] = useState('');
  const [synonymPage, setSynonymPage] = useState(1);
  const { searchResults, isSearching } = useDebouncedWordSearch(
    searchMode === 'synonyms' ? searchTerm : ''
  );

  const [meaningRows, setMeaningRows] = useState<DictionaryMeaning[]>([]);
  const [meaningPage, setMeaningPage] = useState(1);
  const [isMeaningLoading, setIsMeaningLoading] = useState(false);
  const [meaningFallbackUrl, setMeaningFallbackUrl] = useState<string | null>(null);
  const meaningRequestRef = useRef(0);
  const meaningAutoFallbackTermKeyRef = useRef<string | null>(null);
  const [meaningFlyout, setMeaningFlyout] = useState<MeaningFlyout | null>(null);
  const meaningFlyoutRef = useRef<HTMLDivElement | null>(null);
  const meaningFlyoutRequestRef = useRef(0);

  const [favoritesByDate, setFavoritesByDate] = useState<FavoritesByDate>({});
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [savingWordKey, setSavingWordKey] = useState<string | null>(null);
  const [deletingFavoriteId, setDeletingFavoriteId] = useState<string | null>(null);
  const [historyDate, setHistoryDate] = useState(() => todayKey());
  const [favoriteQuery, setFavoriteQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [newSynonymWord, setNewSynonymWord] = useState('');
  const [newSynonymList, setNewSynonymList] = useState('');
  const [isSubmittingSynonym, setIsSubmittingSynonym] = useState(false);
  const [addSynonymError, setAddSynonymError] = useState<string | null>(null);
  const isAdminUser = username === 'admin';

  const currentDay = todayKey();
  const todayFavoritesCount = favoritesByDate[currentDay]?.length ?? 0;
  const allDays = useMemo(
    () =>
      Object.keys(favoritesByDate)
        .sort((a, b) => b.localeCompare(a))
        .map((date) => ({ date, total: favoritesByDate[date]?.length ?? 0 })),
    [favoritesByDate]
  );
  const historyRows = useMemo(() => {
    const rows = [...(favoritesByDate[historyDate] ?? [])].sort((a, b) =>
      b.savedAt.localeCompare(a.savedAt)
    );
    const query = normalizeFavoriteWordKey(favoriteQuery);
    if (!query) return rows;
    return rows.filter((entry) =>
      normalizeFavoriteWordKey(entry.word).includes(query)
    );
  }, [favoriteQuery, favoritesByDate, historyDate]);

  const isSavedToday = useCallback(
    (word: string) => hasFavoriteInDate(favoritesByDate, currentDay, word),
    [favoritesByDate, currentDay]
  );

  const isSavingWord = useCallback(
    (word: string) =>
      Boolean(savingWordKey) &&
      normalizeFavoriteWordKey(word) === savingWordKey,
    [savingWordKey]
  );

  useEffect(() => {
    if (!username) {
      setFavoritesByDate({});
      setFavoritesError(null);
      setIsFavoritesLoading(false);
      return;
    }

    let isActive = true;
    setIsFavoritesLoading(true);
    setFavoritesError(null);

    void (async () => {
      const result = await fetchFavoritesByUsername(username);
      if (!isActive) return;

      if (result.error) {
        setFavoritesByDate({});
        setFavoritesError(
          result.error.reason === 'missing_table'
            ? 'Gogokoen taula falta da Supabasen. Exekutatu supabase_favorites.sql.'
            : 'Ezin izan dira gogokoak Supabasetik kargatu.'
        );
        setIsFavoritesLoading(false);
        return;
      }

      setFavoritesByDate(result.data);
      setHistoryDate(todayKey());
      setFavoriteQuery('');
      setIsFavoritesLoading(false);
    })();

    return () => {
      isActive = false;
    };
  }, [username]);

  useEffect(() => {
    if (allDays.length === 0) return;
    const exists = allDays.some((day) => day.date === historyDate);
    if (!exists) {
      setHistoryDate(allDays[0].date);
    }
  }, [allDays, historyDate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (activeView !== 'addSynonym' && addSynonymError) {
      setAddSynonymError(null);
    }
  }, [activeView, addSynonymError]);

  useEffect(() => {
    if (!isAdminUser && activeView === 'addSynonym') {
      setActiveView('dictionary');
    }
  }, [activeView, isAdminUser]);

  useEffect(() => {
    setMeaningFlyout(null);
    meaningFlyoutRequestRef.current += 1;
  }, [activeView, searchMode, searchTerm]);

  useEffect(() => {
    if (!meaningFlyout) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (meaningFlyoutRef.current?.contains(target)) return;
      setMeaningFlyout(null);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMeaningFlyout(null);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [meaningFlyout]);

  useEffect(() => {
    if (searchMode === 'synonyms') {
      setSynonymPage(1);
      return;
    }
    setMeaningPage(1);
  }, [searchMode, searchTerm]);

  useEffect(() => {
    if (searchMode !== 'meaning') {
      meaningRequestRef.current += 1;
      meaningAutoFallbackTermKeyRef.current = null;
      setMeaningRows([]);
      setMeaningPage(1);
      setMeaningFallbackUrl(null);
      setIsMeaningLoading(false);
      return;
    }

    const normalized = searchTerm.trim();
    if (!isTermReady(normalized)) {
      meaningRequestRef.current += 1;
      meaningAutoFallbackTermKeyRef.current = null;
      setMeaningRows([]);
      setMeaningPage(1);
      setMeaningFallbackUrl(null);
      setIsMeaningLoading(false);
      return;
    }

    const requestId = ++meaningRequestRef.current;
    const timer = window.setTimeout(async () => {
      setIsMeaningLoading(true);
      try {
        const results = await searchDictionaryMeanings(normalized, 200);
        if (requestId !== meaningRequestRef.current) return;
        const normalizedSearchKey = normalizeFavoriteWordKey(normalized);
        const shouldAutoOpenFallback =
          Boolean(normalizedSearchKey) &&
          meaningAutoFallbackTermKeyRef.current === normalizedSearchKey;

        if (results.length > 0) {
          meaningAutoFallbackTermKeyRef.current = null;
          setMeaningRows(results);
          setMeaningPage(1);
          setMeaningFallbackUrl(null);
        } else {
          const fallbackUrl = buildMeaningFallbackUrl(normalized);
          if (shouldAutoOpenFallback) {
            meaningAutoFallbackTermKeyRef.current = null;
            openExternalDictionary(fallbackUrl);
          }
          setMeaningRows([]);
          setMeaningPage(1);
          setMeaningFallbackUrl(fallbackUrl);
        }
      } catch {
        if (requestId !== meaningRequestRef.current) return;
        const normalizedSearchKey = normalizeFavoriteWordKey(normalized);
        const shouldAutoOpenFallback =
          Boolean(normalizedSearchKey) &&
          meaningAutoFallbackTermKeyRef.current === normalizedSearchKey;
        const fallbackUrl = buildMeaningFallbackUrl(normalized);
        if (shouldAutoOpenFallback) {
          meaningAutoFallbackTermKeyRef.current = null;
          openExternalDictionary(fallbackUrl);
        }
        setMeaningRows([]);
        setMeaningPage(1);
        setMeaningFallbackUrl(fallbackUrl);
      } finally {
        if (requestId !== meaningRequestRef.current) return;
        setIsMeaningLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [searchMode, searchTerm]);

  const login = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalized = usernameInput.trim().toLowerCase();
      if (normalized.length < 2) {
        setUsernameError('Erabiltzaileak gutxienez 2 karaktere izan behar ditu.');
        return;
      }
      const key = userKeyInput.trim();
      if (key.length < 3) {
        setUsernameError('Gakoak gutxienez 3 karaktere izan behar ditu.');
        return;
      }

      setIsLoggingIn(true);
      const authLogin = await signInWithRegisteredUser(normalized, key);
      if (authLogin.ok) {
        const resolvedUsername = authLogin.normalizedUsername ?? normalized;
        setIsLoggingIn(false);
        writeActiveUser(resolvedUsername);
        setUsername(resolvedUsername);
        setUserKeyInput('');
        setUsernameError(null);
        setActiveView('dictionary');
        return;
      }

      const validation = await validateUserAccessKey(normalized, key);
      setIsLoggingIn(false);

      if (validation.ok) {
        writeActiveUser(normalized);
        setUsername(normalized);
        setUserKeyInput('');
        setUsernameError(null);
        setActiveView('dictionary');
        return;
      }

      if (authLogin.errorMessage) {
        setUsernameError(`Auth errorea: ${authLogin.errorMessage}`);
        return;
      }

      if (!validation.ok) {
        setUsernameError('Erabiltzailea edo gakoa ez dira zuzenak.');
        return;
      }
    },
    [userKeyInput, usernameInput]
  );

  const logout = useCallback(async () => {
    try {
      await signOutRegisteredUser();
    } catch {
      // no-op: local cleanup still runs
    }
    clearActiveUser();
    setUsername(null);
    setUsernameInput('');
    setUserKeyInput('');
    setIsLoggingIn(false);
    setUsernameError(null);
    setSearchMode('synonyms');
    setSearchTerm('');
    setSynonymPage(1);
    setMeaningRows([]);
    setMeaningPage(1);
    setMeaningFallbackUrl(null);
    setMeaningFlyout(null);
    meaningFlyoutRequestRef.current += 1;
    setFavoritesByDate({});
    setFavoritesError(null);
    setIsFavoritesLoading(false);
    setSavingWordKey(null);
    setDeletingFavoriteId(null);
    setNotice(null);
    setHistoryDate(todayKey());
    setFavoriteQuery('');
    setNewSynonymWord('');
    setNewSynonymList('');
    setIsSubmittingSynonym(false);
    setAddSynonymError(null);
  }, []);

  const saveFavorite = useCallback(
    async (params: {
      word: string;
      mode: SearchMode;
      meaning?: string | null;
      synonyms?: string[];
      level?: DifficultyLevel | null;
    }) => {
      if (!username) return;
      const word = params.word.trim();
      if (!word) return;

      const dateKey = todayKey();
      if (hasFavoriteInDate(favoritesByDate, dateKey, word)) {
        setNotice(`"${word}" gaur jada gordeta dago.`);
        return;
      }

      const wordKey = normalizeFavoriteWordKey(word);
      setSavingWordKey(wordKey);

      const result = await insertFavoriteByUsername({
        username,
        dateKey,
        word,
        mode: params.mode,
        meaning: params.meaning,
        synonyms: params.synonyms,
        level: params.level,
      });

      setSavingWordKey(null);

      if (result.error) {
        if (result.error.reason === 'duplicate') {
          setNotice(`"${word}" gaur jada gordeta dago.`);
          return;
        }
        if (result.error.reason === 'missing_table') {
          setNotice('Gogokoen taula falta da Supabasen.');
          setFavoritesError(
            'Gogokoen taula falta da Supabasen. Exekutatu supabase_favorites.sql.'
          );
          return;
        }
        setNotice('Ezin izan da gogokoa Supabasen gorde.');
        return;
      }

      if (!result.data) {
        setNotice('Ezin izan da gogokoa Supabasen gorde.');
        return;
      }

      const saved = result.data;
      setFavoritesByDate((previous) =>
        addFavoriteEntryToState(previous, saved.dateKey, saved.favorite)
      );
      setHistoryDate(saved.dateKey);
      setNotice(`"${word}" gogokoetan gorde da.`);
    },
    [favoritesByDate, username]
  );

  const openMeaningFlyout = useCallback(
    (term: string, anchorEl: HTMLElement) => {
      const normalized = term.trim();
      if (!normalized) return;

      const rect = anchorEl.getBoundingClientRect();
      const sideMargin = 12;
      const flyoutWidth = Math.min(320, window.innerWidth - sideMargin * 2);
      const maxLeft = window.innerWidth - flyoutWidth - sideMargin;
      const left = Math.min(Math.max(rect.left, sideMargin), Math.max(sideMargin, maxLeft));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 56);

      const fallbackUrl = buildMeaningFallbackUrl(normalized);
      const requestId = ++meaningFlyoutRequestRef.current;

      setMeaningFlyout({
        term: normalized,
        meaning: null,
        fallbackUrl,
        loading: true,
        width: flyoutWidth,
        left,
        top,
      });

      void (async () => {
        try {
          const match = await lookupDictionaryMeaning(normalized);
          if (requestId !== meaningFlyoutRequestRef.current) return;
          setMeaningFlyout((current) =>
            current
              ? { ...current, loading: false, meaning: match?.esanahia ?? null }
              : current
          );
        } catch {
          if (requestId !== meaningFlyoutRequestRef.current) return;
          setMeaningFlyout((current) =>
            current ? { ...current, loading: false, meaning: null } : current
          );
        }
      })();
    },
    []
  );

  const onStudyWord = useCallback((word: string, mode: SearchMode) => {
    setActiveView('dictionary');
    setSearchMode(mode);
    setSearchTerm(word);
  }, []);

  const onSearchMeaningWord = useCallback((word: string) => {
    const normalizedWord = word.trim();
    if (!normalizedWord) return;
    meaningAutoFallbackTermKeyRef.current = normalizeFavoriteWordKey(normalizedWord) || null;
    setActiveView('dictionary');
    setSearchMode('meaning');
    setSearchTerm(normalizedWord);
  }, []);

  const onSaveSynonymRow = useCallback(
    (row: SearchResultItem) => {
      saveFavorite({
        word: row.hitza,
        mode: 'synonyms',
        synonyms: row.sinonimoak,
        level: row.level,
      });
    },
    [saveFavorite]
  );

  const onDeleteFavorite = useCallback(
    async (favorite: FavoriteWord) => {
      if (!username) return;

      const confirmed = window.confirm(
        `"${favorite.word}" gogokoetatik ezabatu nahi duzu?`
      );
      if (!confirmed) return;

      setDeletingFavoriteId(favorite.id);
      const result = await deleteFavoriteById({
        username,
        favoriteId: favorite.id,
      });
      setDeletingFavoriteId(null);

      if (result.error) {
        if (result.error.reason === 'missing_table') {
          setFavoritesError(
            'Gogokoen taula falta da Supabasen. Exekutatu supabase_favorites.sql.'
          );
        }
        setNotice('Ezin izan da gogokoa ezabatu.');
        return;
      }

      if (!result.data.deleted) {
        setNotice('Ez da ezabatzeko gogokoa aurkitu.');
        return;
      }

      setFavoritesByDate((previous) =>
        removeFavoriteEntryFromState(previous, favorite.id)
      );
      setNotice(`"${favorite.word}" gogokoetatik ezabatu da.`);
    },
    [username]
  );

  const onSubmitNewSynonym = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isAdminUser) {
        setAddSynonymError('Aukera hau admin erabiltzailearentzat bakarrik da.');
        return;
      }

      const word = newSynonymWord.trim();
      const synonyms = Array.from(
        new Set(
          newSynonymList
            .split(/[\n,;]+/g)
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        )
      );

      if (!word) {
        setAddSynonymError('Hitza bete behar da.');
        return;
      }

      if (synonyms.length === 0) {
        setAddSynonymError('Sinonimo bat gutxienez bete behar da.');
        return;
      }

      setIsSubmittingSynonym(true);
      setAddSynonymError(null);

      const result = await addSynonymWord(word, synonyms);

      setIsSubmittingSynonym(false);
      if (!result.ok) {
        setAddSynonymError(result.error?.message ?? 'Ezin izan da sinonimoa gehitu.');
        return;
      }

      setNewSynonymWord('');
      setNewSynonymList('');
      setNotice(`"${word.trim().toLowerCase()}" sinonimoen hiztegian gorde da (1. maila).`);
      setSearchMode('synonyms');
      setSearchTerm(word.trim().toLowerCase());
    },
    [isAdminUser, newSynonymList, newSynonymWord]
  );

  if (!username) {
    return (
      <LoginView
        usernameInput={usernameInput}
        userKeyInput={userKeyInput}
        isLoggingIn={isLoggingIn}
        usernameError={usernameError}
        onUserInput={(value) => {
          setUsernameInput(value);
          if (usernameError) setUsernameError(null);
        }}
        onKeyInput={(value) => {
          setUserKeyInput(value);
          if (usernameError) setUsernameError(null);
        }}
        onSubmit={login}
      />
    );
  }

  return (
    <AppShell
      header={
        <ScreenHeader
          title="Hiztegia"
          subtitle={activeView === 'dictionary' ? `${todayFavoritesCount} hitz gordeta - Gaur` : undefined}
        />
      }
      topRightControl={
        activeView === 'dictionary' ? (
          <button
            onClick={logout}
            className="header-more-button"
            type="button"
            title={`${username} - Irten`}
            aria-label={`${username} - Irten`}
          >
            <MoreHorizontalIcon className="header-more-button__icon" />
          </button>
        ) : (
          <button
            onClick={logout}
            className="user-avatar-button"
            type="button"
            title={`${username} - Irten`}
            aria-label={`${username} - Irten`}
          >
            {userInitials}
          </button>
        )
      }
      footer={
        <BottomTaskBar
          activeView={activeView}
          onChange={setActiveView}
          isAdminUser={isAdminUser}
        />
      }
      footerClassName="app-shell__footer--menu app-shell__footer--taskbar"
      contentClassName={`mx-auto w-full max-w-5xl ${
        activeView === 'dictionary'
          ? 'app-shell__content--dictionary'
          : activeView === 'favorites'
            ? 'app-shell__content--favorites'
            : 'space-y-4'
      }`}
    >
      {notice ? (
        <p className="notice notice--info">
          {notice}
        </p>
      ) : null}

      {activeView === 'dictionary' ? (
        <div className="dictionary-view">
          <div className="dictionary-view__controls">
            <DictionarySearchControls
              searchMode={searchMode}
              searchTerm={searchTerm}
              onMode={setSearchMode}
              onTerm={setSearchTerm}
            />
          </div>

          <div className="dictionary-view__results custom-scrollbar">
            {searchMode === 'synonyms' ? (
              <SynonymSearchResults
                searchTerm={searchTerm}
                isSearching={isSearching}
                rows={searchResults}
                synonymPage={synonymPage}
                onSynonymPageChange={setSynonymPage}
                isSavedToday={isSavedToday}
                isSavingWord={isSavingWord}
                onSave={onSaveSynonymRow}
                onOpenMeaning={openMeaningFlyout}
                onSearchWord={(word) => onStudyWord(word, 'synonyms')}
              />
            ) : (
              <MeaningSearchResults
                searchTerm={searchTerm}
                isMeaningLoading={isMeaningLoading}
                meaningRows={meaningRows}
                fallbackUrl={meaningFallbackUrl}
                meaningPage={meaningPage}
                onMeaningPageChange={setMeaningPage}
                isSavedToday={isSavedToday}
                isSavingWord={isSavingWord}
                onSave={(word, meaning) =>
                  saveFavorite({ word, mode: 'meaning', meaning })
                }
                onSearchWord={onSearchMeaningWord}
              />
            )}
          </div>
        </div>
      ) : activeView === 'favorites' ? (
        <FavoritesPanel
          currentDay={currentDay}
          historyDate={historyDate}
          setHistoryDate={setHistoryDate}
          rows={historyRows}
          isLoading={isFavoritesLoading}
          syncError={favoritesError}
          favoriteQuery={favoriteQuery}
          onFavoriteQueryChange={setFavoriteQuery}
          deletingFavoriteId={deletingFavoriteId}
          onDeleteFavorite={onDeleteFavorite}
          onStudyWord={onStudyWord}
        />
      ) : isAdminUser ? (
        <AddSynonymPanel
          newWord={newSynonymWord}
          newSynonyms={newSynonymList}
          isSubmitting={isSubmittingSynonym}
          addError={addSynonymError}
          onWordChange={(value) => {
            setNewSynonymWord(value);
            if (addSynonymError) setAddSynonymError(null);
          }}
          onSynonymsChange={(value) => {
            setNewSynonymList(value);
            if (addSynonymError) setAddSynonymError(null);
          }}
          onSubmit={onSubmitNewSynonym}
        />
      ) : null}

      {meaningFlyout ? (
        <section
          ref={meaningFlyoutRef}
          className="dictionary-flyout"
          style={{
            left: `${meaningFlyout.left}px`,
            top: `${meaningFlyout.top}px`,
            width: `${meaningFlyout.width}px`,
          }}
        >
          <div className="dictionary-flyout__header">
            <strong className="font-display flyout-term">
              {meaningFlyout.term}
            </strong>
            <button
              type="button"
              className="dictionary-flyout__close"
              onClick={() => setMeaningFlyout(null)}
              aria-label="Itxi"
            >
              x
            </button>
          </div>

          <div className="dictionary-flyout__body">
            {meaningFlyout.loading
              ? 'Esanahia bilatzen...'
              : meaningFlyout.meaning ?? 'Ez da tokiko hiztegian esanahirik aurkitu.'}
          </div>

          {!meaningFlyout.loading && !meaningFlyout.meaning ? (
            <a
              href={meaningFlyout.fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dictionary-flyout__link"
            >
              Ireki Elhuyar-en
            </a>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
};
