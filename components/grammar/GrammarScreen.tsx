import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearGrammarDraft,
  fetchAttemptForAssignment,
  fetchLessonWithQuestions,
  fetchStats,
  flushPendingAttempts,
  getOrCreateUserSettings,
  getTodayAssignment,
  loadGrammarDraft,
  saveAttempt,
  saveGrammarDraft,
  setUserLevel,
  type GrammarAttempt,
  type GrammarAttemptAnswer,
  type GrammarDailyAssignment,
  type GrammarDraft,
  type GrammarLessonBundle,
  type GrammarLevel,
  type GrammarStatsSummary,
  type GrammarUserSettings,
} from '../../lib/grammarService';
import LessonStep from './LessonStep';
import PracticeStep from './PracticeStep';
import ResultStep from './ResultStep';

type WizardStep = 1 | 2 | 3;

const CloseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="study-session__close-icon">
    <path d="M6 6l12 12" />
    <path d="M18 6l-12 12" />
  </svg>
);

const LEVELS: GrammarLevel[] = ['B1', 'B2', 'C1'];

const answersArrayToMap = (
  answers: GrammarAttemptAnswer[]
): Record<string, GrammarAttemptAnswer> => {
  const map: Record<string, GrammarAttemptAnswer> = {};
  answers.forEach((answer) => {
    if (!answer.questionId) return;
    map[answer.questionId] = answer;
  });
  return map;
};

const answersMapToArray = (
  answersMap: Record<string, GrammarAttemptAnswer>,
  orderedQuestionIds: string[]
): GrammarAttemptAnswer[] =>
  orderedQuestionIds
    .map((questionId) => answersMap[questionId])
    .filter((answer): answer is GrammarAttemptAnswer => Boolean(answer));

const computeResult = (
  bundle: GrammarLessonBundle | null,
  answersMap: Record<string, GrammarAttemptAnswer>
): { correctCount: number; wrongCount: number; totalQuestions: number; score: number } => {
  if (!bundle) return { correctCount: 0, wrongCount: 0, totalQuestions: 0, score: 0 };

  const totalQuestions = bundle.questions.length;
  let correctCount = 0;

  bundle.questions.forEach((question) => {
    const answer = answersMap[question.id];
    if (answer?.isCorrect) {
      correctCount += 1;
    }
  });

  const answeredCount = Object.keys(answersMap).length;
  const wrongCount = Math.max(0, answeredCount - correctCount);
  const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return { correctCount, wrongCount, totalQuestions, score };
};

export const GrammarScreen: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const [settings, setSettingsState] = useState<GrammarUserSettings | null>(null);
  const [assignment, setAssignment] = useState<GrammarDailyAssignment | null>(null);
  const [bundle, setBundle] = useState<GrammarLessonBundle | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<GrammarAttempt | null>(null);
  const [stats, setStats] = useState<GrammarStatsSummary | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, GrammarAttemptAnswer>>({});
  const [lessonExpanded, setLessonExpanded] = useState(false);
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString());

  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveQueued, setSaveQueued] = useState(false);

  const result = useMemo(() => computeResult(bundle, answersMap), [answersMap, bundle]);

  const totalSteps = 3;
  const stepProgressRatio = (step / totalSteps) * 100;

  const closeToHome = () => navigate('/', { replace: false });

  const loadGrammarFlow = async (forceLevel?: GrammarLevel) => {
    setScreenError(null);
    setSaveError(null);

    try {
      await flushPendingAttempts().catch(() => 0);

      let nextSettings = await getOrCreateUserSettings();
      if (forceLevel && nextSettings.preferredLevel !== forceLevel) {
        nextSettings = await setUserLevel(forceLevel);
      }

      const nextAssignment = await getTodayAssignment(nextSettings.preferredLevel, nextSettings.timezone);
      const [nextBundle, nextAttempt, nextStats] = await Promise.all([
        fetchLessonWithQuestions(nextAssignment.lessonId),
        fetchAttemptForAssignment(nextAssignment.id),
        fetchStats({ days: 7 }).catch(() => null),
      ]);

      setSettingsState(nextSettings);
      setAssignment(nextAssignment);
      setBundle(nextBundle);
      setExistingAttempt(nextAttempt);
      setStats(nextStats);
      setSaveQueued(false);

      if (nextAttempt?.completed) {
        setAnswersMap(answersArrayToMap(nextAttempt.answers));
        setStep(3);
        setQuestionIndex(Math.max(0, nextBundle.questions.length - 1));
        setStartedAt(nextAttempt.startedAt ?? new Date().toISOString());
        setSaveError(null);
        clearGrammarDraft(nextAssignment.id);
        return;
      }

      const draft = loadGrammarDraft(nextAssignment.id);
      if (draft) {
        setAnswersMap(answersArrayToMap(draft.answers));
        setStep(draft.step);
        setQuestionIndex(Math.max(0, Math.min(draft.questionIndex, Math.max(0, nextBundle.questions.length - 1))));
        setStartedAt(draft.startedAt || new Date().toISOString());
        setLessonExpanded(Boolean(draft.lessonExpanded));
      } else {
        setAnswersMap({});
        setStep(1);
        setQuestionIndex(0);
        setLessonExpanded(false);
        setStartedAt(new Date().toISOString());
      }
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Ezin izan da gramatika saioa prestatu.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      await loadGrammarFlow();
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void run();

    const handleOnline = () => {
      void flushPendingAttempts().catch(() => 0);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!assignment || !bundle || step === 3) return;

    const orderedQuestionIds = bundle.questions.map((question) => question.id);
    const draft: GrammarDraft = {
      assignmentId: assignment.id,
      step,
      questionIndex,
      answers: answersMapToArray(answersMap, orderedQuestionIds),
      startedAt,
      lessonExpanded,
    };
    saveGrammarDraft(draft);
  }, [answersMap, assignment, bundle, lessonExpanded, questionIndex, startedAt, step]);

  const handleChangeLevel = async (level: GrammarLevel) => {
    if (isReloading || isLoading) return;
    setIsReloading(true);
    await loadGrammarFlow(level);
    setIsReloading(false);
  };

  const handleGoPractice = () => {
    setStep(2);
    setSaveError(null);
  };

  const handleSelectAnswer = (questionId: string, selectedIndex: number) => {
    if (!bundle) return;
    const question = bundle.questions.find((entry) => entry.id === questionId);
    if (!question) return;
    if (answersMap[questionId]) return;

    const nextAnswer: GrammarAttemptAnswer = {
      questionId,
      selectedIndex,
      isCorrect: selectedIndex === question.correctIndex,
      answeredAt: new Date().toISOString(),
    };

    setAnswersMap((current) => ({
      ...current,
      [questionId]: nextAnswer,
    }));
    setSaveError(null);
  };

  const persistFinalAttempt = async (): Promise<boolean> => {
    if (!assignment || !bundle) return false;

    const orderedQuestionIds = bundle.questions.map((question) => question.id);
    const orderedAnswers = answersMapToArray(answersMap, orderedQuestionIds);
    const completedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      1,
      Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    );

    setIsSavingAttempt(true);
    setSaveError(null);

    const response = await saveAttempt({
      assignmentId: assignment.id,
      lessonId: assignment.lessonId,
      day: assignment.day,
      answers: orderedAnswers,
      correctCount: result.correctCount,
      wrongCount: Math.max(0, orderedAnswers.length - result.correctCount),
      totalQuestions: bundle.questions.length,
      score: Number(result.score.toFixed(2)),
      durationSeconds,
      completed: true,
      startedAt,
      completedAt,
    });

    setIsSavingAttempt(false);

    if (!response.ok) {
      setSaveError(response.errorMessage ?? 'Ezin izan da emaitza gorde.');
      setSaveQueued(false);
      return false;
    }

    setSaveQueued(response.queued);
    setSaveError(response.queued ? null : response.errorMessage ?? null);
    setExistingAttempt(response.attempt ?? null);
    clearGrammarDraft(assignment.id);
    return true;
  };

  const handlePracticeNext = async () => {
    if (!bundle) return;
    const currentQuestion = bundle.questions[questionIndex];
    if (!currentQuestion) return;
    if (!answersMap[currentQuestion.id]) return;

    const isLast = questionIndex >= bundle.questions.length - 1;
    if (!isLast) {
      setQuestionIndex((current) => Math.min(bundle.questions.length - 1, current + 1));
      return;
    }

    await persistFinalAttempt();
    setStep(3);
  };

  const handleRetrySave = async () => {
    await persistFinalAttempt();
  };

  const handleRestartToLesson = () => {
    setStep(1);
  };

  if (isLoading) {
    return (
      <div className="study-session">
        <div className="study-session__surface">
          <div className="study-session__center study-session__center--final">
            <section className="study-session__card study-session__card--final">
              <p className="study-session__eyebrow">EGUNEKO GRAMATIKA</p>
              <p className="study-session__question study-session__question--muted">Kargatzen...</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (screenError || !settings || !assignment || !bundle) {
    return (
      <div className="study-session">
        <div className="study-session__surface">
          <div className="study-session__header-row">
            <div className="study-session__header-copy">
              <p className="study-session__eyebrow">EGUNEKO GRAMATIKA</p>
              <p className="study-session__progress-copy">Ezin izan da kargatu</p>
            </div>
            <button
              type="button"
              className="study-session__close-btn"
              aria-label="Itxi"
              onClick={closeToHome}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="study-session__center study-session__center--final">
            <section className="study-session__card study-session__card--final">
              <p className="study-session__question study-session__question--muted">
                {screenError ?? 'Ezin izan da gramatika saioa prestatu.'}
              </p>
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button type="button" className="btn-primary study-session__primary-btn" onClick={() => {
                  setIsLoading(true);
                  void loadGrammarFlow().finally(() => setIsLoading(false));
                }}>
                  Berriz saiatu
                </button>
                <button type="button" className="btn-secondary study-session__primary-btn" onClick={closeToHome}>
                  Itzuli
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const orderedQuestionIds = bundle.questions.map((question) => question.id);
  const durationSeconds = Math.max(
    1,
    Math.floor(
      ((existingAttempt?.completedAt ? new Date(existingAttempt.completedAt) : new Date()).getTime() -
        new Date(existingAttempt?.startedAt ?? startedAt).getTime()) /
        1000
    )
  );

  return (
    <div className="study-session grammar-screen">
      <div className="study-session__surface">
        <div className="study-session__header-row">
          <div className="study-session__header-copy">
            <p className="study-session__eyebrow">EGUNEKO GRAMATIKA</p>
            <p className="study-session__progress-copy">
              3–5 minutu · Maila: {settings.preferredLevel}
            </p>
            <div className="study-session__progress-track" aria-hidden="true">
              <div className="study-session__progress-fill" style={{ width: `${Math.max(12, stepProgressRatio)}%` }} />
            </div>
          </div>
          <button
            type="button"
            className="study-session__close-btn"
            aria-label="Itxi"
            onClick={closeToHome}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grammar-screen__toolbar">
          <div className="grammar-screen__step-chips" role="tablist" aria-label="Pausoak">
            {[1, 2, 3].map((item) => (
              <span
                key={`step-${item}`}
                className={`grammar-screen__step-chip ${step === item ? 'grammar-screen__step-chip--active' : ''}`}
                aria-current={step === item ? 'step' : undefined}
              >
                {item}/3
              </span>
            ))}
          </div>

          <div className="grammar-screen__level-switch" aria-label="Maila aukeratu">
            {LEVELS.map((level) => {
              const active = settings.preferredLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  className={`grammar-screen__level-btn ${active ? 'grammar-screen__level-btn--active' : ''}`}
                  onClick={() => void handleChangeLevel(level)}
                  disabled={isReloading || isSavingAttempt}
                >
                  {isReloading && active ? '...' : level}
                </button>
              );
            })}
          </div>
        </div>

        {step === 1 ? (
          <LessonStep
            lesson={bundle.lesson}
            expanded={lessonExpanded}
            onToggleExpanded={() => setLessonExpanded((value) => !value)}
            onNext={handleGoPractice}
          />
        ) : null}

        {step === 2 ? (
          <PracticeStep
            questions={bundle.questions}
            answers={answersMap}
            questionIndex={questionIndex}
            onSelectAnswer={(question, optionIndex) => handleSelectAnswer(question.id, optionIndex)}
            onNext={() => void handlePracticeNext()}
            saveError={saveError}
            isFinishing={isSavingAttempt}
          />
        ) : null}

        {step === 3 ? (
          <ResultStep
            lesson={bundle.lesson}
            questions={bundle.questions}
            answers={answersMap}
            score={result.score}
            correctCount={result.correctCount}
            wrongCount={Math.max(0, answersMapToArray(answersMap, orderedQuestionIds).length - result.correctCount)}
            durationSeconds={existingAttempt?.durationSeconds ?? durationSeconds}
            wasQueued={saveQueued}
            saveError={saveError}
            stats={stats}
            onRetrySave={() => void handleRetrySave()}
            onBackToLesson={handleRestartToLesson}
            onFinish={closeToHome}
          />
        ) : null}

        {step !== 3 ? (
          <div className="grammar-screen__bottom-nav">
            <button type="button" className="btn-secondary study-session__primary-btn" onClick={closeToHome}>
              Itzuli
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GrammarScreen;
