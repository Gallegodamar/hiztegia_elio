import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProgressSummary as getSupabaseProgressSummary } from '../../lib/dailyService';
import { getTodayGrammarCardState, type GrammarCardState } from '../../lib/grammarService';
import { getHomeStats, type HomeStats, type HomeStatsPoint } from '../../lib/homeStatsService';
import {
  countPendingReviewWords,
  getAnsweredQuestionCount,
  getFailedWordIdsFromSession,
  getTodayKey as getDailyStudyKey,
  loadDailySession,
  loadStreak,
  loadStudyHistory,
} from '../../lib/dailySession';
import { Icon, type AppIconName } from '../ui/Icon';

type HomeRemoteProgress = {
  answeredCount: number;
  totalQuestions: number;
  completedToday: boolean;
  dueReviewCount: number;
  learnedCount: number;
} | null;

type DiscoverCard = {
  title: string;
  subtitle: string;
  path: string;
  tone: 'blue' | 'indigo';
  icon: AppIconName;
};

const HomeStatsChart: React.FC<{ series: HomeStatsPoint[] }> = ({ series }) => {
  const safeSeries = series.length > 0 ? series.slice(-7) : [];
  const maxValue = Math.max(1, ...safeSeries.map((point) => Math.max(point.reviews, point.favorites)));
  const hasActivity = safeSeries.some((point) => point.reviews > 0 || point.favorites > 0);

  if (!hasActivity) {
    return (
      <div className="home-hasiera__stats-chart-empty">
        Oraindik ez dago jarduerarik
      </div>
    );
  }

  const chartHeight = 54;
  const chartWidth = 210;
  const slotWidth = chartWidth / Math.max(1, safeSeries.length);
  const barWidth = Math.max(8, slotWidth - 8);

  return (
    <div className="home-hasiera__stats-chart">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="home-hasiera__stats-chart-svg"
        aria-label="Azken 7 egunetako jarduera"
      >
        <defs>
          <linearGradient id="homeReviewsBarNeutral" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--home-chart-reviews-neutral-start)" />
            <stop offset="100%" stopColor="var(--home-chart-reviews-neutral-end)" />
          </linearGradient>
          <linearGradient id="homeReviewsBarActive" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--home-chart-reviews-active-start)" />
            <stop offset="100%" stopColor="var(--home-chart-reviews-active-end)" />
          </linearGradient>
        </defs>
        {safeSeries.map((point, index) => {
          const isActiveDay = index === safeSeries.length - 1;
          const x = index * slotWidth + (slotWidth - barWidth) / 2;
          const barHeight = Math.max(
            point.reviews > 0 ? 4 : 0,
            (point.reviews / maxValue) * (chartHeight - 10)
          );
          const y = chartHeight - barHeight;
          const dotY = chartHeight - (point.favorites / maxValue) * (chartHeight - 10);

          return (
            <g key={point.day}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={isActiveDay ? 'url(#homeReviewsBarActive)' : 'url(#homeReviewsBarNeutral)'}
                opacity={isActiveDay ? 0.98 : 0.84}
              />
              <circle
                cx={x + barWidth / 2}
                cy={Math.max(4, Math.min(chartHeight - 2, dotY))}
                r={point.favorites > 0 ? 3 : 1.75}
                fill={
                  point.favorites > 0
                    ? 'var(--home-chart-favorites-dot)'
                    : 'var(--home-chart-favorites-dot-idle)'
                }
                opacity={point.favorites > 0 ? 0.95 : 0.65}
              />
            </g>
          );
        })}
      </svg>
      <div className="home-hasiera__stats-chart-labels">
        {safeSeries.map((point) => (
          <span key={`${point.day}-label`} className="truncate text-center">
            {point.day.slice(8)}
          </span>
        ))}
      </div>
    </div>
  );
};

const fallbackGrammarPreview: Pick<GrammarCardState, 'lesson' | 'settings' | 'completed' | 'score'> = {
  lesson: {
    id: 'mock-grammar-lesson',
    title: '-ra vs -n (norantz vs kokapena)',
    estimatedMinutes: 4,
    level: 'B1',
  },
  settings: {
    userId: '',
    preferredLevel: 'B1',
    timezone: 'Europe/Madrid',
  },
  completed: false,
  score: null,
};

export const TopicChips: React.FC = () => {
  const navigate = useNavigate();
  const todayKey = getDailyStudyKey();
  const todayStudySession = loadDailySession(todayKey);
  const studyTotal = 5;

  const [remoteProgress, setRemoteProgress] = useState<HomeRemoteProgress>(null);
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [grammarPreview, setGrammarPreview] = useState<
    Pick<GrammarCardState, 'lesson' | 'settings' | 'completed' | 'score'> | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        const [summary, stats] = await Promise.all([
          getSupabaseProgressSummary(),
          getHomeStats().catch(() => null),
        ]);
        if (cancelled) return;
        if (summary) {
          setRemoteProgress({
            answeredCount: summary.answeredCount,
            totalQuestions: summary.totalQuestions,
            completedToday: summary.completedToday,
            dueReviewCount: summary.dueReviewCount,
            learnedCount: summary.learnedCount,
          });
        } else {
          setRemoteProgress(null);
        }
        setHomeStats(stats);
      } catch {
        if (!cancelled) {
          setRemoteProgress(null);
          setHomeStats(null);
        }
      }
    };

    const loadGrammar = async () => {
      try {
        const cardState = await getTodayGrammarCardState();
        if (cancelled) return;
        setGrammarPreview({
          lesson: cardState.lesson,
          settings: cardState.settings,
          completed: cardState.completed,
          score: cardState.score,
        });
      } catch {
        if (!cancelled) setGrammarPreview(fallbackGrammarPreview);
      }
    };

    void loadHomeData();
    void loadGrammar();

    return () => {
      cancelled = true;
    };
  }, []);

  const localAnsweredToday = todayStudySession
    ? Math.min(getAnsweredQuestionCount(todayStudySession), studyTotal)
    : 0;
  const localStudyProgressCount = todayStudySession?.completed ? studyTotal : localAnsweredToday;
  const studyProgressCount = remoteProgress
    ? Math.min(
        remoteProgress.completedToday
          ? remoteProgress.totalQuestions
          : remoteProgress.answeredCount,
        remoteProgress.totalQuestions || studyTotal
      )
    : localStudyProgressCount;
  const effectiveStudyTotal = remoteProgress?.totalQuestions || studyTotal;
  const isDailyCompleted = remoteProgress?.completedToday ?? Boolean(todayStudySession?.completed);

  const history = useMemo(() => loadStudyHistory(), []);
  const streak = useMemo(() => loadStreak(), []);

  const localLearnedWords = useMemo(
    () =>
      Object.values(history).filter((entry) => {
        const status = entry?.status ?? null;
        const correct = Number(entry?.correct ?? 0);
        return status === 'learning' || status === 'reinforcing' || status === 'mastered' || correct > 0;
      }).length,
    [history]
  );

  const pendingReviewCount = useMemo(
    () => remoteProgress?.dueReviewCount ?? countPendingReviewWords(history, todayKey),
    [history, remoteProgress, todayKey]
  );

  const reviewQuickCount = pendingReviewCount > 0 ? Math.min(3, pendingReviewCount) : 3;
  const recentMistakesCount = todayStudySession ? getFailedWordIdsFromSession(todayStudySession).length : 0;
  const streakDays = streak.current > 0 ? `${streak.current} egun` : '0 egun';
  const learnedWordsCount = remoteProgress?.learnedCount ?? localLearnedWords;
  const favoritesCount = homeStats?.favoritesCount ?? 0;
  const reviewedWords7d = homeStats?.reviewedWordsCount7d ?? 0;
  const reviewEvents7d = homeStats?.reviewEventsCount7d ?? 0;
  const activitySeries = homeStats?.series7d ?? [];
  const userLevel = grammarPreview?.settings.preferredLevel ?? '--';
  const isCompactCompletedHero = isDailyCompleted;

  const discoverCards: DiscoverCard[] = [
    {
      title: 'Txartelak',
      subtitle: 'Gordetako hitzekin ikasi',
      path: '/favoritos?study=1',
      tone: 'blue',
      icon: 'bookText',
    },
    {
      title: 'Gaiak',
      subtitle: 'Arloz ikasi hitzak',
      path: '/gaiak',
      tone: 'blue',
      icon: 'topics',
    },
    {
      title: 'Hitz konplexuak',
      subtitle: 'Zailtasun handiagoko hitzak',
      path: '/hitz-konplexuak',
      tone: 'indigo',
      icon: 'star',
    },
  ];

  return (
    <div className="home-hasiera">
      <section
        className={`home-hasiera__hero home-hub__study-hero ${
          isCompactCompletedHero ? 'home-hasiera__hero--done' : ''
        }`.trim()}
        aria-label="Gaurko 5 hitzak"
      >
        <span className="home-hub__study-hero-icon" aria-hidden="true">
          <Icon name="lightbulb" className="home-hub__study-hero-icon-svg" />
        </span>

        <span className="home-hub__study-hero-copy">
          <span className="home-hub__study-hero-title-row">
            <span className="home-hub__study-hero-title">
              Gaurko 5 hitzak
            </span>
            <span className="home-hub__study-hero-pill">
              {studyProgressCount}/{effectiveStudyTotal}
            </span>
          </span>

          <span className="home-hasiera__hero-subtitle">
            {isDailyCompleted
              ? 'Gaurko erronka eginda'
              : 'Prest al zaude gaurko erronkarako?'}
          </span>

          {!isCompactCompletedHero ? (
            <span
              className="home-hub__study-hero-progress"
              aria-label={`Gaurko 5 hitzen progresioa: ${studyProgressCount}/${effectiveStudyTotal}`}
            >
              <span className="home-hub__study-hero-dots" aria-hidden="true">
                {Array.from({ length: effectiveStudyTotal }, (_, index) => (
                  <span
                    key={`study-dot-${index}`}
                    className={`home-hub__study-hero-dot ${
                      index < studyProgressCount ? 'home-hub__study-hero-dot--filled' : ''
                    }`}
                  />
                ))}
              </span>
              <span className="home-hub__study-hero-progress-value">
                {studyProgressCount}/{effectiveStudyTotal}
              </span>
            </span>
          ) : null}
        </span>

        <button
          type="button"
          onClick={() => navigate('/daily')}
          className="btn-primary home-hub__study-hero-action"
          aria-label={isDailyCompleted ? 'Ikusi gaurko emaitzak' : 'Hasi gaurko 5 hitzak'}
        >
          {isDailyCompleted ? 'Ikusi emaitzak' : 'Hasi orain'}
        </button>
      </section>

      <div className="home-hasiera__quick-actions" aria-label="Ekintza azkarrak">
        <button
          type="button"
          onClick={() => navigate('/daily?mode=review')}
          className="btn-secondary btn-secondary--compact home-hasiera__quick-btn"
        >
          <Icon
            name="refresh"
            className="home-hasiera__quick-btn-icon home-hasiera__quick-btn-icon--review"
            size={18}
          />
          Errepasatzeko {reviewQuickCount} hitz
        </button>
        <button
          type="button"
          onClick={() => navigate('/azken-akatsak')}
          className="btn-secondary btn-secondary--compact home-hasiera__quick-btn"
        >
          <Icon
            name="alert"
            className="home-hasiera__quick-btn-icon home-hasiera__quick-btn-icon--warning"
            size={18}
          />
          Azken akatsak{recentMistakesCount > 0 ? ` (${recentMistakesCount})` : ''}
        </button>
      </div>

      <section className="home-hasiera__card surface-card" aria-label="Nire estatistikak">
        <div className="home-hasiera__section-head">
          <h2 className="home-hasiera__section-title">Nire estatistikak</h2>
          <button
            type="button"
            onClick={() => navigate('/estatistikak')}
            className="home-hasiera__inline-link"
          >
            Ikusi <span aria-hidden="true">{'>'}</span>
          </button>
        </div>

        <div className="home-hasiera__stats-grid">
          <article className="home-hasiera__mini-stat home-hasiera__mini-stat--success">
            <p className="home-hasiera__mini-stat-label">SEGIDA</p>
            <p className="home-hasiera__mini-stat-value">{streakDays}</p>
          </article>
          <article className="home-hasiera__mini-stat home-hasiera__mini-stat--brand">
            <p className="home-hasiera__mini-stat-label">HITZ IKASIAK</p>
            <p className="home-hasiera__mini-stat-value">{learnedWordsCount}</p>
          </article>
          <article className="home-hasiera__mini-stat home-hasiera__mini-stat--level">
            <p className="home-hasiera__mini-stat-label">MAILA</p>
            <p className="home-hasiera__mini-stat-value">{userLevel}</p>
          </article>
          <article className="home-hasiera__mini-stat home-hasiera__mini-stat--favorite">
            <p className="home-hasiera__mini-stat-label">GOGOKOAK</p>
            <p className="home-hasiera__mini-stat-value">{favoritesCount}</p>
          </article>
        </div>

        <div className="home-hasiera__stats-chart-shell">
          <div className="home-hasiera__stats-chart-head">
            <p className="home-hasiera__stats-chart-title">Azken 7 egun</p>
            <p className="home-hasiera__stats-chart-meta">
              {reviewedWords7d} hitz · {reviewEvents7d} errepaso
            </p>
          </div>
          <HomeStatsChart series={activitySeries} />
        </div>
      </section>

      <section
        className="home-hasiera__card home-hasiera__grammar surface-card cursor-pointer"
        aria-label="Eguneko gramatika"
        role="button"
        tabIndex={0}
        onClick={() => navigate('/gaurko-gramatika')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate('/gaurko-gramatika');
          }
        }}
      >
        <div className="home-hasiera__grammar-main">
          <p className="home-hasiera__grammar-label">EGUNEKO GRAMATIKA</p>
          <h3 className="home-hasiera__grammar-title">
            {grammarPreview?.lesson.title ?? fallbackGrammarPreview.lesson.title}
          </h3>
          <p className="home-hasiera__grammar-meta">
            {(grammarPreview?.lesson.estimatedMinutes ?? fallbackGrammarPreview.lesson.estimatedMinutes)} minutu
            {' \u00b7 '}Maila: {grammarPreview?.lesson.level ?? fallbackGrammarPreview.lesson.level}
          </p>
        </div>
        <div className="home-hasiera__grammar-side">
          <span
            className={`home-hasiera__chip ${
              grammarPreview?.completed ? 'home-hasiera__chip--done' : ''
            }`}
          >
            {grammarPreview?.completed ? 'Eginda' : 'Gaur'}
          </span>
          {typeof grammarPreview?.score === 'number' ? (
            <span className="home-hasiera__score-pill">
              {Math.round(grammarPreview.score)}%
            </span>
          ) : null}
        </div>
      </section>

      <section className="home-hasiera__discover" aria-label="Deskubritu">
        <div className="home-hasiera__discover-grid">
          {discoverCards.map((card) => (
            <button
              key={card.path}
              type="button"
              onClick={() => navigate(card.path)}
              className={`home-hasiera__discover-card home-hasiera__discover-card--${card.tone}`}
            >
              <span className="home-hasiera__discover-icon" aria-hidden="true">
                <Icon name={card.icon} className="home-hasiera__discover-icon-svg" />
              </span>
              <span className="home-hasiera__discover-title">{card.title}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TopicChips;



