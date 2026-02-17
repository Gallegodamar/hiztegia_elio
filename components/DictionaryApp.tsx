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

const segmentedButtonClass = (isActive: boolean): string =>
  `segmented-btn ${isActive ? 'segmented-btn--active' : 'segmented-btn--idle'}`;

const accentActionClass = (isDisabled: boolean): string =>
  `action-pill ${isDisabled ? 'action-pill--disabled' : 'action-pill--accent'}`;

const dangerActionClass = (isDisabled: boolean): string =>
  `action-pill ${isDisabled ? 'action-pill--disabled' : 'action-pill--danger'}`;

const levelBadgeClass = (level: DifficultyLevel): string => {
  if (level === 1) return 'level-pill--1';
  if (level === 2) return 'level-pill--2';
  if (level === 3) return 'level-pill--3';
  return 'level-pill--4';
};

const buildMeaningFallbackUrl = (term: string): string =>
  `https://hiztegiak.elhuyar.eus/eu/${encodeURIComponent(term)}`;

const isTermReady = (value: string): boolean =>
  value.trim().replace(/\*/g, '').length >= 1;

type MeaningFlyout = {
  term: string;
  meaning: string | null;
  fallbackUrl: string;
  loading: boolean;
  width: number;
  left: number;
  top: number;
};

const ScreenHeader: React.FC<{ title: string }> = ({
  title,
}) => (
  <div className="elio-brand-header">
    <div className="elio-brand-header__main">
      <div className="elio-brand-icon-shell" aria-hidden="true">
        <img src="/elio_favicon_64.png" alt="" className="elio-brand-icon" />
      </div>
      <div className="min-w-0">
        <p className="elio-kicker">Hiztegia Elio</p>
        <h1 className="display-title">{title}</h1>
        <p className="display-subtitle">
          Sinonimoak, esanahiak eta eguneroko ikasketa leku berean.
        </p>
      </div>
    </div>
    <div className="elio-brand-orbs" aria-hidden="true">
      <span className="elio-brand-orb elio-brand-orb--sun" />
      <span className="elio-brand-orb elio-brand-orb--leaf" />
      <span className="elio-brand-orb elio-brand-orb--dot" />
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

const ViewSwitcher: React.FC<{
  activeView: ActiveView;
  onChange: (view: ActiveView) => void;
  notice: string | null;
  isAdminUser: boolean;
}> = ({ activeView, onChange, notice, isAdminUser }) => (
  <section className="surface-card view-switcher p-4">
    <div className="flex flex-wrap gap-2">
      {(isAdminUser
        ? (['dictionary', 'favorites', 'addSynonym'] as const)
        : (['dictionary', 'favorites'] as const)
      ).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          className={segmentedButtonClass(activeView === view)}
        >
          {view === 'dictionary'
            ? 'Hiztegia'
            : view === 'favorites'
              ? 'Gogokoak'
              : 'Sinonimoa gehitu'}
        </button>
      ))}
    </div>
    {notice ? (
      <p className="notice notice--info mt-3">
        {notice}
      </p>
    ) : null}
  </section>
);

const DictionarySearchControls: React.FC<{
  searchMode: SearchMode;
  searchTerm: string;
  onMode: (mode: SearchMode) => void;
  onTerm: (value: string) => void;
}> = ({ searchMode, searchTerm, onMode, onTerm }) => (
  <section className="surface-card search-controls p-4 md:p-5">
    <div className="mb-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onMode('synonyms')}
        className={segmentedButtonClass(searchMode === 'synonyms')}
      >
        Sinonimoak
      </button>
      <button
        type="button"
        onClick={() => onMode('meaning')}
        className={segmentedButtonClass(searchMode === 'meaning')}
      >
        Esanahia
      </button>
    </div>
    <p className="helper-note mb-2">
      Lehen letratik bertatik bilatzen da (adib. `a`, `a`-z hasten diren hitzak).
      Amaiera bidez bilatzeko erabili `*`: adib. `*tasun`.
    </p>
    <input
      type="text"
      value={searchTerm}
      onChange={(event) => onTerm(event.target.value)}
      placeholder={
        searchMode === 'synonyms'
          ? 'Idatzi hitz bat edo sinonimo bat...'
          : 'Idatzi hitz bat esanahia ikusteko...'
      }
      className="input-shell input-shell--large"
    />
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
      <section className="surface-card surface-card--muted p-4">
        <p className="section-label">
          {rows.length} emaitza
        </p>
        {totalPages > 1 ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSynonymPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aurrekoa
            </button>
            <p className="section-label">
              Orria {safePage}/{totalPages}
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
        ) : null}
      </section>

      <section className="grid gap-3">
        {visibleRows.map((row, index) => {
        const savedToday = isSavedToday(row.hitza);
        const saving = isSavingWord(row.hitza);
        return (
          <article key={`${row.id}-${index}`} className="surface-card p-4 md:p-5">
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
                <span
                  className={
                    'level-pill mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ' +
                    levelBadgeClass(row.level)
                  }
                >
                  Maila {row.level}
                </span>
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
                  onClick={(event) => onOpenMeaning(synonym, event.currentTarget)}
                  className="term-chip"
                  title="Esanahia ikusi"
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
      <section className="surface-card surface-card--muted p-4">
        <p className="section-label">
          {meaningRows.length} emaitza
        </p>
        {totalPages > 1 ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onMeaningPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aurrekoa
            </button>
            <p className="section-label">
              Orria {safePage}/{totalPages}
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
        ) : null}
      </section>

      <section className="grid gap-3">
        {visibleRows.map((row, index) => {
          const savedToday = isSavedToday(row.hitza);
          const saving = isSavingWord(row.hitza);
          return (
            <article key={`${row.hitza}-${index}`} className="surface-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="word-title">
                  {row.hitza}
                </h3>
                <button
                  type="button"
                  onClick={() => onSave(row.hitza, row.esanahia)}
                  disabled={savedToday || saving}
                  className={accentActionClass(savedToday || saving)}
                >
                  {savedToday ? 'Gaur gordeta' : saving ? 'Gordetzen...' : 'Gogokoetara'}
                </button>
              </div>
              <p className="meaning-copy mt-3">
                {row.esanahia}
              </p>
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
  <div className="space-y-4">
    <section className="surface-card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Eguneko historia</p>
          <h2 className="panel-title mt-2">
            {historyDate}
          </h2>
          <p className="helper-note mt-1">
            {rows.length} hitz gordeta.
          </p>
        </div>
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
      <label className="block">
        <span className="field-label">
          Gogokoetan bilatu
        </span>
        <input
          type="text"
          value={favoriteQuery}
          onChange={(event) => onFavoriteQueryChange(event.target.value)}
          placeholder="Hitzaren arabera iragazi..."
          className="input-shell !py-2.5 !text-sm"
        />
      </label>
    </section>

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
          <article key={entry.id} className="surface-card p-4 md:p-5">
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
                {entry.level ? (
                  <span
                    className={
                      'level-pill inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ' +
                      levelBadgeClass(entry.level)
                    }
                  >
                    Maila {entry.level}
                  </span>
                ) : null}
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
      setMeaningRows([]);
      setMeaningPage(1);
      setMeaningFallbackUrl(null);
      setIsMeaningLoading(false);
      return;
    }

    const normalized = searchTerm.trim();
    if (!isTermReady(normalized)) {
      meaningRequestRef.current += 1;
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

        if (results.length > 0) {
          setMeaningRows(results);
          setMeaningPage(1);
          setMeaningFallbackUrl(null);
        } else {
          setMeaningRows([]);
          setMeaningPage(1);
          setMeaningFallbackUrl(buildMeaningFallbackUrl(normalized));
        }
      } catch {
        if (requestId !== meaningRequestRef.current) return;
        setMeaningRows([]);
        setMeaningPage(1);
        setMeaningFallbackUrl(buildMeaningFallbackUrl(normalized));
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
        />
      }
      topRightControl={
        <button
          onClick={logout}
          className="btn-secondary btn-secondary--compact"
          type="button"
        >
          {username} - Irten
        </button>
      }
      contentClassName="mx-auto w-full max-w-5xl space-y-4"
    >
      <ViewSwitcher
        activeView={activeView}
        onChange={setActiveView}
        notice={notice}
        isAdminUser={isAdminUser}
      />

      {activeView === 'dictionary' ? (
        <div className="space-y-4">
          <DictionarySearchControls
            searchMode={searchMode}
            searchTerm={searchTerm}
            onMode={setSearchMode}
            onTerm={setSearchTerm}
          />

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
            />
          )}
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
