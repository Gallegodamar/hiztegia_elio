import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProgressSummary as getSupabaseProgressSummary } from '../../lib/dailyService';
import { getTodayGrammarCardState, type GrammarCardState } from '../../lib/grammarService';
import {
  countPendingReviewWords,
  getAnsweredQuestionCount,
  getFailedWordIdsFromSession,
  getTodayKey as getDailyStudyKey,
  loadDailySession,
  loadStreak,
  loadStudyHistory,
} from '../../lib/dailySession';
import { OpenBookIcon, StarIcon } from '../layout/Icons';

const StudyBulbIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path d="M12 3.5a6.5 6.5 0 0 0-4.4 11.3c.8.7 1.3 1.7 1.4 2.7h6c.1-1 .6-2 1.4-2.7A6.5 6.5 0 0 0 12 3.5Z" />
    <path d="M9.5 19.1h5" />
    <path d="M10.3 21h3.4" />
    <path d="M12 1.9v1.4" />
    <path d="M4.7 5.2l1 1" />
    <path d="M19.3 5.2l-1 1" />
  </svg>
);

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
  icon: React.ReactNode;
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
  const [grammarPreview, setGrammarPreview] = useState<
    Pick<GrammarCardState, 'lesson' | 'settings' | 'completed' | 'score'> | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        const summary = await getSupabaseProgressSummary();
        if (!summary || cancelled) return;
        setRemoteProgress({
          answeredCount: summary.answeredCount,
          totalQuestions: summary.totalQuestions,
          completedToday: summary.completedToday,
          dueReviewCount: summary.dueReviewCount,
          learnedCount: summary.learnedCount,
        });
      } catch {
        if (!cancelled) setRemoteProgress(null);
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
  const userLevel = grammarPreview?.settings.preferredLevel ?? '--';

  const discoverCards: DiscoverCard[] = [
    {
      title: 'Sinonimoak',
      subtitle: 'Bilatu eta lotu hitzak',
      path: '/bilatu?mode=synonyms',
      tone: 'blue',
      icon: <OpenBookIcon className="home-hasiera__discover-icon-svg" />,
    },
    {
      title: 'Hitz konplexuak',
      subtitle: 'Zailtasun handiagoko hitzak',
      path: '/hitz-konplexuak',
      tone: 'indigo',
      icon: <StarIcon className="home-hasiera__discover-icon-svg" />,
    },
  ];

  return (
    <div className="home-hasiera">
      <section className="home-hasiera__hero home-hub__study-hero" aria-label="Gaurko 5 hitzak">
        <span className="home-hub__study-hero-icon" aria-hidden="true">
          <StudyBulbIcon className="home-hub__study-hero-icon-svg" />
        </span>

        <span className="home-hub__study-hero-copy">
          <span className="home-hub__study-hero-title-row">
            <span className="home-hub__study-hero-title">Gaurko 5 hitzak</span>
            <span className="home-hub__study-hero-pill">
              {studyProgressCount}/{effectiveStudyTotal}
            </span>
          </span>

          <span className="home-hasiera__hero-subtitle">
            {isDailyCompleted
              ? 'Gaurko erronka eginda \u2705'
              : 'Prest al zaude gaurko erronkarako?'}
          </span>

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
          Errepasatzeko {reviewQuickCount} hitz
        </button>
        <button
          type="button"
          onClick={() => navigate('/azken-akatsak')}
          className="btn-secondary btn-secondary--compact home-hasiera__quick-btn"
        >
          Azken akatsak{recentMistakesCount > 0 ? ` (${recentMistakesCount})` : ''}
        </button>
      </div>

      <section className="home-hasiera__card surface-card" aria-label="Nire estatistikak">
        <div className="home-hasiera__section-head">
          <h2 className="home-hasiera__section-title">Nire estatistikak</h2>
        </div>

        <div className="home-hasiera__stats-grid">
          <article className="home-hasiera__mini-stat home-hasiera__mini-stat--accent">
            <p className="home-hasiera__mini-stat-label">RACHA</p>
            <p className="home-hasiera__mini-stat-value">{streakDays}</p>
          </article>
          <article className="home-hasiera__mini-stat">
            <p className="home-hasiera__mini-stat-label">HITZ IKASIAK</p>
            <p className="home-hasiera__mini-stat-value">{learnedWordsCount}</p>
          </article>
          <article className="home-hasiera__mini-stat home-hasiera__mini-stat--soft">
            <p className="home-hasiera__mini-stat-label">MAILA</p>
            <p className="home-hasiera__mini-stat-value">{userLevel}</p>
          </article>
        </div>

        <button
          type="button"
          onClick={() => navigate('/estatistikak')}
          className="home-hasiera__inline-link"
        >
          Estatistikak ikusi <span aria-hidden="true">{'>'}</span>
        </button>
      </section>

      <section className="home-hasiera__card home-hasiera__grammar surface-card" aria-label="Eguneko gramatika">
        <div className="home-hasiera__grammar-main">
          <p className="home-hasiera__grammar-label">EGUNEKO GRAMATIKA</p>
          <h3 className="home-hasiera__grammar-title">
            {grammarPreview?.lesson.title ?? fallbackGrammarPreview.lesson.title}
          </h3>
          <p className="home-hasiera__grammar-meta">
            {(grammarPreview?.lesson.estimatedMinutes ?? fallbackGrammarPreview.lesson.estimatedMinutes)} minutu
            {' \u00b7 '}Maila: {grammarPreview?.lesson.level ?? fallbackGrammarPreview.lesson.level}
          </p>
          <button
            type="button"
            onClick={() => navigate('/gaurko-gramatika')}
            className="btn-secondary btn-secondary--compact home-hasiera__grammar-btn"
          >
            Ireki
          </button>
        </div>
        <div className="home-hasiera__grammar-side">
          <span
            className={`home-hasiera__chip ${grammarPreview?.completed ? 'home-hasiera__chip--done' : ''}`}
          >
            {grammarPreview?.completed ? 'Eginda' : 'Gaur'}
          </span>
          {typeof grammarPreview?.score === 'number' ? (
            <span className="home-hasiera__score-pill">{Math.round(grammarPreview.score)}%</span>
          ) : null}
        </div>
      </section>

      <section className="home-hasiera__discover" aria-label="Deskubritu">
        <div className="home-hasiera__section-head">
          <h2 className="home-hasiera__section-title">Deskubritu</h2>
        </div>
        <div className="home-hasiera__discover-grid">
          {discoverCards.map((card) => (
            <button
              key={card.path}
              type="button"
              onClick={() => navigate(card.path)}
              className={`home-hasiera__discover-card home-hasiera__discover-card--${card.tone}`}
            >
              <span className="home-hasiera__discover-icon" aria-hidden="true">
                {card.icon}
              </span>
              <span className="home-hasiera__discover-title">{card.title}</span>
              <span className="home-hasiera__discover-subtitle">{card.subtitle}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TopicChips;



