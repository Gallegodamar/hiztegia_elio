import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useFavoritesData } from '../../hooks/useFavoritesData';
import { normalizeFavoriteWordKey, todayKey, FavoriteWord, SearchMode } from '../../lib/userFavorites';

const dangerActionClass = (isDisabled: boolean): string =>
  `action-pill ${isDisabled ? 'action-pill--disabled' : 'action-pill--danger'}`;

export const FavoritesPanel: React.FC = () => {
  const { username, showNotice } = useAppContext();
  const navigate = useNavigate();
  const favorites = useFavoritesData(username);

  const currentDay = todayKey();
  const [historyDate, setHistoryDate] = useState(() => currentDay);
  const [favoriteQuery, setFavoriteQuery] = useState('');

  const allDays = useMemo(
    () =>
      Object.keys(favorites.favoritesByDate)
        .sort((a, b) => b.localeCompare(a))
        .map((date) => ({ date, total: favorites.favoritesByDate[date]?.length ?? 0 })),
    [favorites.favoritesByDate]
  );

  const historyRows = useMemo(() => {
    const rows = [...(favorites.favoritesByDate[historyDate] ?? [])].sort((a, b) =>
      b.savedAt.localeCompare(a.savedAt)
    );
    const query = normalizeFavoriteWordKey(favoriteQuery);
    if (!query) return rows;
    return rows.filter((entry) => normalizeFavoriteWordKey(entry.word).includes(query));
  }, [favoriteQuery, favorites.favoritesByDate, historyDate]);

  // Snap to nearest valid date if selected date disappears
  React.useEffect(() => {
    if (allDays.length === 0) return;
    const exists = allDays.some((day) => day.date === historyDate);
    if (!exists) setHistoryDate(allDays[0].date);
  }, [allDays, historyDate]);

  const onStudyWord = (word: string, mode: SearchMode) => {
    const query = `?q=${encodeURIComponent(word.trim())}`;
    const targetRoute = mode === 'synonyms' ? '/sinonimoak' : '/';
    navigate(`${targetRoute}${query}`);
  };

  const onDeleteFavorite = async (favorite: FavoriteWord) => {
    const notice = await favorites.deleteFavorite(favorite);
    if (notice) showNotice(notice);
  };

  return (
    <div className="favorites-view">
      <div className="favorites-view__controls">
        <section className="surface-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="helper-note !m-0">{historyRows.length} hitz gordeta.</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={historyDate}
                max={currentDay}
                onChange={(e) => setHistoryDate(e.target.value)}
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
              onChange={(e) => setFavoriteQuery(e.target.value)}
              placeholder="Hitzaren arabera iragazi..."
              className="input-shell input-shell--with-clear !py-2.5 !text-sm"
              aria-label="Gogokoetan bilatu"
            />
            {favoriteQuery.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setFavoriteQuery('')}
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
        {favorites.isLoading ? (
          <section className="surface-card surface-card--muted p-4 md:p-5">
            <p className="status-copy">Gogokoak Supabasetik kargatzen...</p>
          </section>
        ) : favorites.error ? (
          <section className="surface-card surface-card--muted p-4 md:p-5">
            <p className="notice notice--error">{favorites.error}</p>
          </section>
        ) : historyRows.length === 0 ? (
          <section className="surface-card surface-card--muted p-4 md:p-5">
            <p className="status-copy">Ez dago data honetarako hitz gordeturik.</p>
          </section>
        ) : (
          <section className="grid gap-3">
            {historyRows.map((entry) => (
              <article key={entry.id} className="surface-card word-result-card p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="word-title">{entry.word}</h3>
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
                      disabled={favorites.isDeletingFavorite(entry.id)}
                      className={dangerActionClass(favorites.isDeletingFavorite(entry.id))}
                    >
                      {favorites.isDeletingFavorite(entry.id) ? 'Ezabatzen...' : 'Ezabatu'}
                    </button>
                  </div>
                </div>

                {entry.meaning ? (
                  <p className="meaning-copy mt-3 !text-sm md:!text-base">{entry.meaning}</p>
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
};
