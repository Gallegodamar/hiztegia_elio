import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { loadStreak } from '../../lib/dailySession';
import { useFavoritesData } from '../../hooks/useFavoritesData';
import { formatLocalDate } from '../../lib/dateUtils';
import { readFavoritesStudyStatsMemory } from '../../lib/favoritesStudyStats';
import { normalizeFavoriteWordKey, todayKey } from '../../lib/userFavorites';

type StatCardProps = {
  label: string;
  value: number | string;
  tone?: 'default' | 'accent' | 'soft';
  note?: string;
};

type HomeUserStatsPanelProps = {
  onOpenDetails?: () => void;
  footerLabel?: string;
  compactHome?: boolean;
  showTodayPill?: boolean;
};

const StatCard: React.FC<StatCardProps> = ({ label, value, tone = 'default', note }) => (
  <article className={`home-user-stats__card home-user-stats__card--${tone}`}>
    <p className="home-user-stats__label">{label}</p>
    <p className="home-user-stats__value">{value}</p>
    {note ? <p className="home-user-stats__note">{note}</p> : null}
  </article>
);

const getYesterdayKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
};

export const HomeUserStatsPanel: React.FC<HomeUserStatsPanelProps> = ({
  onOpenDetails,
  footerLabel = 'Estatistikak ikusi',
  compactHome = false,
  showTodayPill = true,
}) => {
  const { username } = useAppContext();
  const favorites = useFavoritesData(username);
  const streak = loadStreak();

  const stats = useMemo(() => {
    const favoritesByDate = favorites.favoritesByDate;
    const today = todayKey();
    const yesterday = getYesterdayKey();
    const totalSavedWords = Object.values(favoritesByDate).reduce(
      (total, rows) => total + rows.length,
      0
    );

    const allSavedWords = new Set<string>();
    Object.values(favoritesByDate).forEach((rows) => {
      rows.forEach((row) => {
        const key = normalizeFavoriteWordKey(row.word);
        if (key) allSavedWords.add(key);
      });
    });

    const studyMemory = readFavoritesStudyStatsMemory(username);
    const reviewedRows = Object.entries(studyMemory).filter(
      ([wordKey, row]) =>
        allSavedWords.has(wordKey) &&
        (row.lastReviewedAt > 0 || row.knownCount > 0 || row.againCount > 0)
    );

    const studiedSavedWords = reviewedRows.length;
    const reviewViews = reviewedRows.reduce(
      (total, [, row]) => total + row.knownCount + row.againCount,
      0
    );
    const knownMarks = reviewedRows.reduce((total, [, row]) => total + row.knownCount, 0);

    return {
      totalSavedWords,
      savedToday: favoritesByDate[today]?.length ?? 0,
      savedYesterday: favoritesByDate[yesterday]?.length ?? 0,
      studiedSavedWords,
      reviewViews,
      knownMarks,
    };
  }, [favorites.favoritesByDate, username]);

  const streakDisplay =
    streak.current > 0 && streak.lastCompletedDate ? String(streak.current) : '-';

  const cards = compactHome
    ? [
        { label: 'Segida', value: streakDisplay, tone: 'accent' as const },
        { label: 'Hitz ikasiak', value: stats.studiedSavedWords, tone: 'soft' as const },
        { label: 'Maila', value: '-' },
      ]
    : [
        { label: 'Guztira gordeta', value: stats.totalSavedWords, tone: 'accent' as const },
        { label: 'Atzo gordeta', value: stats.savedYesterday, tone: 'soft' as const },
        { label: 'Ikasitako hitzak', value: stats.studiedSavedWords },
        {
          label: 'Badakit markak',
          value: stats.knownMarks,
          note: `Ikusita: ${stats.reviewViews}`,
        },
      ];

  return (
    <section
      className={`home-user-stats ${compactHome ? 'home-user-stats--compact' : ''}`.trim()}
      aria-label="Erabiltzailearen estatistikak"
    >
      <div className="home-user-stats__header">
        <p className="home-user-stats__title">Nire Estatistikak</p>
        {favorites.isLoading ? (
          <span className="home-user-stats__loading">Kargatzen...</span>
        ) : favorites.error ? (
          <span className="home-user-stats__loading">Datuak ez daude prest</span>
        ) : showTodayPill ? (
          <span className="home-user-stats__today-pill">Gaur: {stats.savedToday}</span>
        ) : null}
      </div>

      <div
        className={`home-user-stats__grid ${
          compactHome ? 'home-user-stats__grid--compact' : ''
        }`.trim()}
      >
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
            note={card.note}
          />
        ))}
      </div>

      {onOpenDetails ? (
        <div className="home-user-stats__footer">
          <button
            type="button"
            onClick={onOpenDetails}
            className="home-user-stats__footer-btn"
          >
            {footerLabel}
            <span aria-hidden="true">{'>'}</span>
          </button>
        </div>
      ) : null}
    </section>
  );
};


