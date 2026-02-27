import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWords } from '../../hooks/useWords';
import {
  getProgressSummary as getSupabaseProgressSummary,
  getCurrentUserId,
  getDailyAnswers as getSupabaseDailyAnswers,
  getOrCreateDailySet as getSupabaseDailySet,
  getQuestionsForSet as getSupabaseQuestionsForSet,
  isDailySupabaseUnavailableError,
  submitAnswer as submitSupabaseAnswer,
  type ProgressSummary as SupabaseProgressSummary,
  type QuestionRow as SupabaseQuestionRow,
} from '../../lib/dailyService';
import { trackReviewEvent } from '../../lib/homeStatsService';
import {
  answerCurrentQuestion,
  advanceDailySession,
  applySessionCompletion,
  clearReviewSession,
  countPendingReviewWords,
  createReviewSession,
  getAnsweredQuestionCount,
  getFailedWordIdsFromSession,
  getOrCreateDailySession,
  getOrCreateReviewSession,
  getQuestionAnswer,
  getTodayKey,
  loadDailySession,
  loadStreak,
  loadStudyHistory,
  saveReviewSession,
  saveStreak,
  saveStudyHistory,
  saveStudySessionByMode,
  type DailySession,
  type StreakState,
  type StudyHistory,
  type StudySessionMode,
} from '../../lib/dailySession';
import { Icon } from '../ui/Icon';

type ScreenRoute = 'intro' | 'question' | 'summary';
type FeedbackTone = 'correct' | 'wrong';
type SessionSource = 'local' | 'supabase';

type SupabaseQuestionMeta = Pick<SupabaseQuestionRow, 'id' | 'type'>;

const AnswerOption: React.FC<{
  label: string;
  disabled: boolean;
  tone: 'idle' | 'correct' | 'wrong' | 'muted';
  onClick: () => void;
}> = ({ label, disabled, tone, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`study-session__option study-session__option--${tone}`}
  >
    <span className="study-session__option-text">{label}</span>
  </button>
);

const FeedbackBox: React.FC<{
  tone: FeedbackTone;
  explanation: string;
  correctAnswer: string;
  example?: string | null;
}> = ({ tone, explanation, correctAnswer, example }) => (
  <div
    className={`study-session__feedback ${
      tone === 'correct' ? 'study-session__feedback--correct' : 'study-session__feedback--wrong'
    }`}
    role="status"
    aria-live="polite"
  >
    <p className="study-session__feedback-title">
      {tone === 'correct' ? 'Zuzena!' : 'Ez da zuzena'}
    </p>
    <p className="study-session__feedback-copy">Erantzun zuzena: {correctAnswer}</p>
    {example ? (
      <p className="study-session__feedback-copy" style={{ marginTop: '0.12rem' }}>
        Adibidea: {example}
      </p>
    ) : explanation ? (
      <p className="study-session__feedback-copy" style={{ marginTop: '0.12rem' }}>
        {explanation}
      </p>
    ) : null}
  </div>
);

const StudyLoadingSkeleton: React.FC = () => (
  <div className="study-session">
    <div className="study-session__surface">
      <div className="study-session__header-row">
        <div className="study-session__header-copy">
          <div className="study-session__skeleton study-session__skeleton--line" />
          <div className="study-session__skeleton study-session__skeleton--bar" />
        </div>
        <div className="study-session__skeleton study-session__skeleton--icon" />
      </div>
      <div className="study-session__center">
        <div className="study-session__card">
          <div className="study-session__skeleton study-session__skeleton--word" />
          <div className="study-session__skeleton study-session__skeleton--line" />
          <div className="study-session__skeleton study-session__skeleton--line short" />
        </div>
        <div className="study-session__answers">
          <div className="study-session__skeleton study-session__skeleton--answer" />
          <div className="study-session__skeleton study-session__skeleton--answer" />
          <div className="study-session__skeleton study-session__skeleton--answer" />
        </div>
      </div>
    </div>
  </div>
);

const StudyErrorState: React.FC<{ message: string; onBack: () => void }> = ({
  message,
  onBack,
}) => (
  <div className="study-session">
    <div className="study-session__surface">
      <div className="study-session__center study-session__center--final">
        <section className="study-session__card study-session__card--final">
          <p className="study-session__eyebrow">Gaurko 5 hitzak</p>
          <h2 className="study-session__word">Ezin izan da saioa prestatu</h2>
          <p className="study-session__question study-session__question--muted">{message}</p>
          <button type="button" onClick={onBack} className="btn-secondary study-session__primary-btn">
            Hasierara itzuli
          </button>
        </section>
      </div>
    </div>
  </div>
);

const buildChallengePath = (
  screen: ScreenRoute,
  mode: StudySessionMode,
  questionIndex?: number
): string => {
  const base =
    screen === 'intro'
      ? '/daily'
      : screen === 'summary'
        ? '/daily/summary'
        : `/daily/q/${Math.max(1, questionIndex ?? 1)}`;
  return mode === 'review' ? `${base}?mode=review` : base;
};

const getScreenRoute = (pathname: string): ScreenRoute => {
  if (pathname.startsWith('/daily/q/')) return 'question';
  if (pathname === '/daily/summary') return 'summary';
  return 'intro';
};

const parseQuestionIndex = (rawIndex: string | undefined): number | null => {
  if (!rawIndex) return null;
  const n = Number(rawIndex);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.floor(n);
  if (rounded < 1) return null;
  return rounded;
};

const mapSupabaseQuestionsToSessionQuestions = (
  questions: SupabaseQuestionRow[]
): DailySession['questions'] =>
  questions.map((question) => {
    const options = question.choices;
    const correctMeaning = options[question.answer_index] ?? '';
    const wordId = question.word_ids?.[0] ?? question.id;

    return {
      id: question.id,
      wordId,
      word: question.prompt,
      correctMeaning,
      distractors: options.filter((_, index) => index !== question.answer_index).slice(0, 2),
      options,
      explanation: question.explanation ?? '',
      example: null,
    };
  });

const buildSupabaseBackedSession = ({
  dateKey,
  questions,
  answersByQuestionId,
  completed,
}: {
  dateKey: string;
  questions: SupabaseQuestionRow[];
  answersByQuestionId: Record<string, { selectedIndex: number; isCorrect: boolean; answeredAt: string }>;
  completed: boolean;
}): DailySession => {
  const mappedQuestions = mapSupabaseQuestionsToSessionQuestions(questions);
  const answers: DailySession['answers'] = {};

  mappedQuestions.forEach((question) => {
    const answer = answersByQuestionId[question.id];
    if (!answer) return;
    const selectedOption = question.options[answer.selectedIndex] ?? '';
    answers[question.id] = {
      selectedOption,
      isCorrect: answer.isCorrect,
      answeredAt: answer.answeredAt,
    };
  });

  const answeredCount = mappedQuestions.reduce(
    (total, question) => total + (answers[question.id] ? 1 : 0),
    0
  );
  const currentIndex =
    mappedQuestions.length === 0 ? 0 : Math.min(Math.max(answeredCount, 0), mappedQuestions.length - 1);

  const session: DailySession = {
    dateKey,
    mode: 'daily',
    ids: mappedQuestions.map((question) => question.id),
    currentIndex,
    completed: completed || answeredCount >= mappedQuestions.length,
    answers,
    questions: mappedQuestions,
    score: 0,
    completedAt: completed || answeredCount >= mappedQuestions.length ? new Date().toISOString() : null,
    resultApplied: true,
    streakAfter: null,
    sourceWordIds: mappedQuestions.map((question) => question.wordId),
  };

  return {
    ...session,
    score: session.questions.reduce((total, question) => {
      const answer = answers[question.id];
      return total + (answer?.isCorrect ? 1 : 0);
    }, 0),
  };
};

const SessionHeader: React.FC<{
  title: string;
  progressLabel?: string;
  progressRatio?: number;
  onClose: () => void;
}> = ({ title, progressLabel, progressRatio, onClose }) => (
  <div className="study-session__header-row">
    <div className="study-session__header-copy">
      <p className="study-session__eyebrow">{title}</p>
      {progressLabel ? <p className="study-session__progress-copy">{progressLabel}</p> : null}
      {typeof progressRatio === 'number' ? (
        <div className="study-session__progress-track" aria-hidden="true">
          <div
            className="study-session__progress-fill"
            style={{ width: `${Math.max(8, Math.min(100, progressRatio))}%` }}
          />
        </div>
      ) : null}
    </div>
    <button
      type="button"
      className="study-session__close-btn"
      onClick={onClose}
      aria-label="Itxi eta hasierara itzuli"
      title="Itxi"
    >
      <Icon name="x" className="study-session__close-icon" />
    </button>
  </div>
);

export const DailyChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ index?: string }>();
  const [searchParams] = useSearchParams();
  const { words, isLoading: isWordsLoading, error: wordsError } = useWords();

  const mode: StudySessionMode = searchParams.get('mode') === 'review' ? 'review' : 'daily';
  const todayKey = getTodayKey();
  const screenRoute = useMemo(() => getScreenRoute(location.pathname), [location.pathname]);
  const requestedQuestionIndex = useMemo(
    () => parseQuestionIndex(params.index),
    [params.index]
  );

  const [history, setHistory] = useState<StudyHistory>(() => loadStudyHistory());
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const [session, setSession] = useState<DailySession | null>(null);
  const [sessionSource, setSessionSource] = useState<SessionSource>('local');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [supabaseInitState, setSupabaseInitState] = useState<'idle' | 'loading' | 'ready' | 'skip'>(
    'idle'
  );
  const [supabaseQuestionMeta, setSupabaseQuestionMeta] = useState<Record<string, SupabaseQuestionMeta>>(
    {}
  );
  const [supabaseProgressSummary, setSupabaseProgressSummary] = useState<SupabaseProgressSummary | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const persistSession = (nextSession: DailySession, source: SessionSource = sessionSource) => {
    setSession(nextSession);
    setSessionSource(source);
    if (source === 'local') {
      saveStudySessionByMode(nextSession);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    if (mode !== 'daily') {
      setSupabaseInitState('skip');
      setSupabaseQuestionMeta({});
      setSupabaseProgressSummary(null);
      setSubmitError(null);
      setIsSubmittingAnswer(false);
      return () => {
        isCancelled = true;
      };
    }

    setSupabaseInitState('loading');
    setSubmitError(null);
    setIsSubmittingAnswer(false);

    const loadSupabaseDaily = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (!isCancelled) {
            setSupabaseInitState('skip');
          }
          return;
        }

        const dailySet = await getSupabaseDailySet(todayKey);
        const [questions, answers] = await Promise.all([
          getSupabaseQuestionsForSet(dailySet.question_ids),
          getSupabaseDailyAnswers(todayKey),
        ]);

        if (questions.length !== dailySet.question_ids.length) {
          throw new Error('Gaurko sortako galdera batzuk ezin izan dira kargatu.');
        }

        const answersByQuestionId: Record<
          string,
          { selectedIndex: number; isCorrect: boolean; answeredAt: string }
        > = {};
        answers.forEach((answer) => {
          answersByQuestionId[answer.question_id] = {
            selectedIndex: answer.selected_index,
            isCorrect: answer.is_correct,
            answeredAt: answer.answered_at,
          };
        });

        const nextSession = buildSupabaseBackedSession({
          dateKey: todayKey,
          questions,
          answersByQuestionId,
          completed: dailySet.completed,
        });

        if (isCancelled) return;

        const nextMeta: Record<string, SupabaseQuestionMeta> = {};
        questions.forEach((question) => {
          nextMeta[question.id] = { id: question.id, type: question.type };
        });

        setSupabaseQuestionMeta(nextMeta);
        setSession(nextSession);
        setSessionSource('supabase');
        setSessionError(null);
        setSupabaseInitState('ready');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Ezin izan da Supabaseko saioa prestatu.';

        if (isCancelled) return;

        if (isDailySupabaseUnavailableError(message)) {
          setSupabaseInitState('skip');
          setSupabaseQuestionMeta({});
          return;
        }

        // Fall back to local challenge instead of blocking the user completely.
        console.warn('[daily] supabase fallback -> local session', error);
        setSupabaseInitState('skip');
        setSupabaseQuestionMeta({});
      }
    };

    void loadSupabaseDaily();

    return () => {
      isCancelled = true;
    };
  }, [mode, todayKey]);

  useEffect(() => {
    if (mode === 'daily' && (supabaseInitState === 'loading' || supabaseInitState === 'ready')) {
      return;
    }
    if (isWordsLoading) return;

    if (words.length === 0) {
      setSession(null);
      setSessionError(wordsError ?? 'Ez dago nahikoa hitz gaurko saioa sortzeko.');
      return;
    }

    try {
      if (mode === 'daily') {
        const nextSession = getOrCreateDailySession(words, history, todayKey);
        setSessionSource('local');
        setSession(nextSession);
      } else {
        const dailySession = loadDailySession(todayKey);
        const preferredWordIds = dailySession ? getFailedWordIdsFromSession(dailySession) : [];
        const nextSession = getOrCreateReviewSession(
          words,
          history,
          todayKey,
          preferredWordIds
        );
        setSessionSource('local');
        setSession(nextSession);
      }
      setSessionError(null);
    } catch (error) {
      setSession(null);
      setSessionError(
        error instanceof Error ? error.message : 'Ezin izan da saioa prestatu.'
      );
    }
  }, [history, isWordsLoading, mode, supabaseInitState, todayKey, words, wordsError]);

  useEffect(() => {
    if (sessionSource !== 'local') return;
    if (!session || !session.completed || session.resultApplied) return;
    const completion = applySessionCompletion(session, history, streak, todayKey);
    setHistory(completion.history);
    setStreak(completion.streak);
    saveStudyHistory(completion.history);
    saveStreak(completion.streak);
    persistSession(completion.session);
  }, [history, session, sessionSource, streak, todayKey]);

  useEffect(() => {
    if (sessionSource !== 'supabase' || mode !== 'daily') return;

    let isCancelled = false;
    const loadProgress = async () => {
      try {
        const summary = await getSupabaseProgressSummary(todayKey);
        if (!isCancelled) {
          setSupabaseProgressSummary(summary);
        }
      } catch (error) {
        if (!isCancelled) {
          console.warn('[daily] progress summary unavailable', error);
        }
      }
    };

    void loadProgress();

    return () => {
      isCancelled = true;
    };
  }, [mode, session?.completed, sessionSource, todayKey]);

  useEffect(() => {
    if (!session) return;

    if (screenRoute === 'question') {
      if (session.completed) {
        navigate(buildChallengePath('summary', mode), { replace: true });
        return;
      }

      const expected = session.currentIndex + 1;
      if (requestedQuestionIndex !== expected) {
        navigate(buildChallengePath('question', mode, expected), { replace: true });
      }
      return;
    }

    if (screenRoute === 'summary' && !session.completed) {
      navigate(buildChallengePath('question', mode, session.currentIndex + 1), { replace: true });
    }
  }, [mode, navigate, requestedQuestionIndex, screenRoute, session]);

  const currentQuestion = useMemo(() => {
    if (!session || session.completed) return null;
    return session.questions[session.currentIndex] ?? null;
  }, [session]);

  const currentAnswer = useMemo(
    () => (session && currentQuestion ? getQuestionAnswer(session, currentQuestion) : null),
    [currentQuestion, session]
  );
  const currentQuestionType =
    currentQuestion && sessionSource === 'supabase'
      ? (supabaseQuestionMeta[currentQuestion.id]?.type ?? 'WORD_TO_DEF')
      : 'WORD_TO_DEF';

  const answeredCount = session ? getAnsweredQuestionCount(session) : 0;
  const totalQuestions = session?.questions.length ?? 5;
  const progressIndex = session
    ? session.completed
      ? totalQuestions
      : session.currentIndex + 1
    : 1;
  const progressRatio =
    totalQuestions > 0 ? (Math.min(progressIndex, totalQuestions) / totalQuestions) * 100 : 0;
  const isGenericQuestionMode = currentQuestionType !== 'WORD_TO_DEF';

  const handleBackHome = () => {
    navigate('/', { replace: false });
  };

  const startDailyChallenge = () => {
    if (!session) return;
    if (session.completed) {
      navigate(buildChallengePath('summary', mode), { replace: false });
      return;
    }
    navigate(buildChallengePath('question', mode, session.currentIndex + 1), { replace: false });
  };

  const restartReviewSession = (preferredWordIds: string[] = []) => {
    if (words.length === 0) return;
    clearReviewSession(todayKey);
    const nextReview = createReviewSession(words, history, todayKey, preferredWordIds);
    saveReviewSession(nextReview);
    navigate(buildChallengePath('question', 'review', 1), { replace: false });
  };

  const handleSelectOption = async (option: string, optionIndex: number) => {
    if (!session || !currentQuestion || currentAnswer) return;
    if (sessionSource === 'supabase' && mode === 'daily') {
      if (isSubmittingAnswer) return;

      setSubmitError(null);
      setIsSubmittingAnswer(true);

      try {
        const result = await submitSupabaseAnswer(todayKey, currentQuestion.id, optionIndex);
        const nextAnswers = {
          ...session.answers,
          [currentQuestion.id]: {
            selectedOption: option,
            isCorrect: result.is_correct,
            answeredAt: new Date().toISOString(),
          },
        };

        const nextSession = {
          ...session,
          answers: nextAnswers,
          score: session.questions.reduce((total, question) => {
            const answer = nextAnswers[question.id];
            return total + (answer?.isCorrect ? 1 : 0);
          }, 0),
        };

        persistSession(nextSession, 'supabase');
        void trackReviewEvent({
          word: currentQuestion.word,
          wordIdHint: currentQuestion.wordId,
          source: mode === 'review' ? 'review' : 'daily',
          isCorrect: result.is_correct,
        }).catch((error) => {
          console.warn('[home-stats] review event tracking unavailable', error);
        });
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : 'Ezin izan da erantzuna gorde. Saiatu berriro.'
        );
      } finally {
        setIsSubmittingAnswer(false);
      }
      return;
    }

    const nextSession = answerCurrentQuestion(session, option);
    persistSession(nextSession, 'local');
    const recordedAnswer = nextSession.answers[currentQuestion.id];
    if (recordedAnswer) {
      void trackReviewEvent({
        word: currentQuestion.word,
        wordIdHint: currentQuestion.wordId,
        source: mode === 'review' ? 'review' : 'daily',
        isCorrect: recordedAnswer.isCorrect,
      }).catch((error) => {
        console.warn('[home-stats] review event tracking unavailable', error);
      });
    }
  };

  const handleNext = () => {
    if (!session) return;
    if (!currentAnswer) return;

    const advancedSession = advanceDailySession(session);

    if (!advancedSession.completed) {
      persistSession(advancedSession, sessionSource);
      navigate(buildChallengePath('question', mode, advancedSession.currentIndex + 1), {
        replace: false,
      });
      return;
    }

    if (sessionSource === 'supabase') {
      persistSession({ ...advancedSession, resultApplied: true }, 'supabase');
      navigate(buildChallengePath('summary', mode), { replace: false });
      return;
    }

    const completion = applySessionCompletion(advancedSession, history, streak, todayKey);
    setHistory(completion.history);
    setStreak(completion.streak);
    saveStudyHistory(completion.history);
    saveStreak(completion.streak);
    persistSession(completion.session, 'local');
    navigate(buildChallengePath('summary', mode), { replace: false });
  };

  if ((mode === 'daily' && supabaseInitState === 'loading' && !session) || ((isWordsLoading && !session) || (!session && !sessionError && !wordsError))) {
    return <StudyLoadingSkeleton />;
  }

  const blockingError =
    sessionSource === 'supabase' ? sessionError : (wordsError ?? sessionError);

  if (blockingError || !session) {
    return (
      <StudyErrorState
        message={blockingError ?? 'Ezin izan da saioa prestatu.'}
        onBack={handleBackHome}
      />
    );
  }

  if (screenRoute === 'intro') {
    const isCompleted = session.completed;
    const title = mode === 'review' ? 'Errepaso saioa' : 'Gaurko erronka';
    const description =
      mode === 'review'
        ? '5 galdera, aurretik ikasitako hitzak berritzeko'
        : '5 galdera, 3 minutu';
    const primaryLabel =
      mode === 'review'
        ? 'Hasi'
        : isCompleted
          ? 'Ikusi emaitzak'
          : answeredCount > 0
            ? 'Jarraitu'
            : 'Hasi';

    return (
      <div className="study-session">
        <div className="study-session__surface">
          <SessionHeader
            title={mode === 'review' ? 'Errepasoa' : 'Gaurko 5 hitzak'}
            progressLabel={isCompleted ? 'Eginda' : `${answeredCount}/${totalQuestions}`}
            progressRatio={(Math.min(answeredCount, totalQuestions) / totalQuestions) * 100}
            onClose={handleBackHome}
          />

          <div className="study-session__center study-session__center--final">
            <section className="study-session__card study-session__card--final">
              <p className="study-session__eyebrow">{mode === 'review' ? 'Prest' : 'Prestaketa'}</p>
              <h1 className="study-session__word" style={{ fontSize: 'clamp(1.3rem, 5.6vw, 1.9rem)' }}>
                {title}
              </h1>
              <p className="study-session__question study-session__question--muted">
                {description}
              </p>

              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <span
                  className="study-session__summary-pill"
                  style={{ borderRadius: '999px', padding: '0.35rem 0.55rem' }}
                >
                  <span className="study-session__summary-label">Gaur</span>
                  <span className="study-session__summary-value" style={{ fontSize: '0.84rem' }}>
                    {todayKey}
                  </span>
                </span>
                {answeredCount > 0 && !isCompleted ? (
                  <span
                    className="study-session__summary-pill"
                    style={{ borderRadius: '999px', padding: '0.35rem 0.55rem' }}
                  >
                    <span className="study-session__summary-label">Progresioa</span>
                    <span className="study-session__summary-value" style={{ fontSize: '0.84rem' }}>
                      {answeredCount}/{totalQuestions}
                    </span>
                  </span>
                ) : null}
              </div>

              <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={
                    mode === 'review' && session.completed
                      ? () => restartReviewSession(getFailedWordIdsFromSession(loadDailySession(todayKey) ?? session))
                      : startDailyChallenge
                  }
                  className="btn-primary study-session__primary-btn"
                >
                  {primaryLabel}
                </button>
                <button
                  type="button"
                  onClick={handleBackHome}
                  className="btn-secondary study-session__primary-btn"
                >
                  Itzuli
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (screenRoute === 'summary') {
    if (!session.completed) {
      return <StudyLoadingSkeleton />;
    }

    const score = session.score;
    const rows = session.questions.map((question, index) => {
      const answer = getQuestionAnswer(session, question);
      return {
        key: question.id || `${question.wordId}-${index}`,
        word: question.word,
        wordId: question.wordId,
        isCorrect: Boolean(answer?.isCorrect),
        selectedOption: answer?.selectedOption ?? null,
      };
    });
    const failedWordIds = rows.filter((row) => !row.isCorrect).map((row) => row.wordId);
    const points = score * 20;
    const learnedCount = rows.filter((row) => row.isCorrect).length;
    const pendingCount =
      sessionSource === 'supabase'
        ? (supabaseProgressSummary?.dueReviewCount ?? 0)
        : countPendingReviewWords(history, todayKey);

    return (
      <div className="study-session">
        <div className="study-session__surface">
          <SessionHeader
            title={mode === 'review' ? 'Errepasoa' : 'Gaurko 5 hitzak'}
            progressLabel={`${rows.length}/${rows.length} osatuta`}
            progressRatio={100}
            onClose={handleBackHome}
          />

          <div className="study-session__center" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
            <section className="study-session__card study-session__card--final">
              <p className="study-session__eyebrow">Emaitzak</p>
              <h2 className="study-session__word">
                {score}/{rows.length}
              </h2>
              <p className="study-session__question study-session__question--muted">
                {mode === 'review'
                  ? 'Errepaso saioa amaitu duzu.'
                  : 'Gaurko erronka amaitu duzu. Jarraitu errepasoarekin edo praktikarekin.'}
              </p>

              <div className="study-session__summary-grid" style={{ marginTop: '0.85rem' }}>
                <div className="study-session__summary-pill">
                  <span className="study-session__summary-label">Puntuak</span>
                  <span className="study-session__summary-value">+{points}</span>
                </div>
                <div className="study-session__summary-pill">
                  <span className="study-session__summary-label">Ikasitako hitzak</span>
                  <span className="study-session__summary-value">+{learnedCount}</span>
                </div>
                <div className="study-session__summary-pill">
                  <span className="study-session__summary-label">Errepasatzeko</span>
                  <span className="study-session__summary-value">{pendingCount}</span>
                </div>
                <div className="study-session__summary-pill">
                  <span className="study-session__summary-label">Segida</span>
                  <span className="study-session__summary-value">
                    {session.mode === 'review' ? streak.current : (session.streakAfter ?? streak.current)}
                  </span>
                </div>
              </div>
            </section>

            <section className="surface-card surface-card--muted" style={{ padding: '0.7rem' }}>
              <p className="section-label" style={{ margin: 0 }}>
                5 hitzak
              </p>
              <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.55rem' }}>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className="surface-card"
                    style={{
                      padding: '0.55rem 0.65rem',
                      borderRadius: '0.9rem',
                      borderColor: 'rgba(191, 204, 223, 0.36)',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1fr) auto auto',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--ink-0)',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.word}
                    </span>
                    <span
                      aria-label={row.isCorrect ? 'Zuzena' : 'Okerra'}
                      title={row.isCorrect ? 'Zuzena' : 'Okerra'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: row.isCorrect ? '#047857' : '#b91c1c',
                      }}
                    >
                      <Icon
                        name={row.isCorrect ? 'check' : 'x'}
                        size={16}
                        strokeWidth={2}
                        label={row.isCorrect ? 'Zuzena' : 'Okerra'}
                      />
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--compact"
                      onClick={() =>
                        navigate(`/bilatu?q=${encodeURIComponent(row.word)}`, { replace: false })
                      }
                    >
                      Ikusi
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="study-session__footer-actions" style={{ display: 'grid', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => restartReviewSession(failedWordIds)}
              className="btn-primary study-session__primary-btn"
            >
              Errepasoa egin
            </button>
            <button
              type="button"
              onClick={handleBackHome}
              className="btn-secondary study-session__primary-btn"
            >
              Hasierara
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <StudyErrorState message="Ez da galderarik aurkitu saioan." onBack={handleBackHome} />;
  }

  const isLastQuestion = session.currentIndex >= session.questions.length - 1;
  const questionNumber = session.currentIndex + 1;

  return (
    <div className="study-session">
      <div className="study-session__surface">
        <SessionHeader
          title={mode === 'review' ? 'Errepasoa' : 'Gaurko erronka'}
          progressLabel={`${questionNumber}/${totalQuestions}`}
          progressRatio={progressRatio}
          onClose={handleBackHome}
        />

        <div className="study-session__center">
          <section className="study-session__card">
            <p className="study-session__eyebrow">{isGenericQuestionMode ? 'Galdera' : 'Hitz'}</p>
            <h1 className="study-session__word">{currentQuestion.word}</h1>
            <p className="study-session__question">
              {isGenericQuestionMode
                ? 'Aukeratu erantzun zuzena'
                : 'Aukeratu esanahi zuzena (gaztelaniaz)'}
            </p>
          </section>

          <div className="study-session__answers" role="list" aria-label="Erantzun aukerak">
            {currentQuestion.options.map((option, optionIndex) => {
              const isSelected = currentAnswer?.selectedOption === option;
              const isCorrect = option === currentQuestion.correctMeaning;
              const tone = !currentAnswer
                ? 'idle'
                : isCorrect
                  ? 'correct'
                  : isSelected
                    ? 'wrong'
                    : 'muted';

              return (
                <div key={`${currentQuestion.id}-${option}-${optionIndex}`} role="listitem">
                  <AnswerOption
                    label={`${String.fromCharCode(65 + optionIndex)}. ${option}`}
                    disabled={Boolean(currentAnswer) || isSubmittingAnswer}
                    tone={tone}
                    onClick={() => {
                      void handleSelectOption(option, optionIndex);
                    }}
                  />
                </div>
              );
            })}
          </div>

          {!currentAnswer && isSubmittingAnswer ? (
            <div className="study-session__feedback study-session__feedback--placeholder" role="status" aria-live="polite">
              <p className="study-session__feedback-copy">Erantzuna gordetzen...</p>
            </div>
          ) : null}

          {!currentAnswer && submitError ? (
            <div className="study-session__feedback study-session__feedback--wrong" role="alert">
              <p className="study-session__feedback-title">Ezin izan da gorde</p>
              <p className="study-session__feedback-copy">{submitError}</p>
              <p className="study-session__feedback-copy" style={{ marginTop: '0.12rem' }}>
                Saiatu berriro aukera bera edo beste bat sakatuz.
              </p>
            </div>
          ) : null}

          {currentAnswer ? (
            <FeedbackBox
              tone={currentAnswer.isCorrect ? 'correct' : 'wrong'}
              correctAnswer={currentQuestion.correctMeaning}
              explanation={currentQuestion.explanation}
              example={currentQuestion.example}
            />
          ) : !isSubmittingAnswer && !submitError ? (
            <div
              className="study-session__feedback study-session__feedback--placeholder"
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div className="study-session__footer-actions">
          <button
            type="button"
            onClick={handleNext}
            disabled={!currentAnswer || isSubmittingAnswer}
            className="btn-primary study-session__primary-btn"
          >
            {isLastQuestion ? 'Amaitu' : 'Hurrengoa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengePage;
