import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWords } from '../../hooks/useWords';
import {
  answerCurrentQuestion,
  advanceDailySession,
  applySessionCompletion,
  getOrCreateDailySession,
  getTodayKey,
  isCurrentQuestionAnswered,
  loadStreak,
  loadStudyHistory,
  saveDailySession,
  saveStreak,
  saveStudyHistory,
  type DailySession,
  type StreakState,
  type StudyHistory,
} from '../../lib/dailySession';
import { Icon } from '../ui/Icon';

type FeedbackTone = 'correct' | 'wrong';

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

const FeedbackBox: React.FC<{ tone: FeedbackTone; explanation: string }> = ({
  tone,
  explanation,
}) => (
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
    <p className="study-session__feedback-copy">{explanation}</p>
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

export const StudySessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { words, isLoading: isWordsLoading, error: wordsError } = useWords();
  const todayKey = getTodayKey();
  const [history, setHistory] = useState<StudyHistory>(() => loadStudyHistory());
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const [session, setSession] = useState<DailySession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (isWordsLoading) return;
    if (words.length === 0) {
      setSession(null);
      if (!wordsError) {
        setSessionError('Ez dago nahikoa hitz gaurko saioa sortzeko.');
      }
      return;
    }

    try {
      const nextSession = getOrCreateDailySession(words, history, todayKey);
      setSession(nextSession);
      setSessionError(null);
    } catch (error) {
      setSession(null);
      setSessionError(
        error instanceof Error ? error.message : 'Ezin izan da gaurko saioa sortu.'
      );
    }
  }, [history, isWordsLoading, todayKey, words, wordsError]);

  const currentQuestion = useMemo(() => {
    if (!session || session.completed) return null;
    return session.questions[session.currentIndex] ?? null;
  }, [session]);

  const currentAnswer = currentQuestion ? session?.answers[currentQuestion.wordId] ?? null : null;
  const answered = session ? isCurrentQuestionAnswered(session) : false;

  const totalQuestions = session?.questions.length ?? 5;
  const progressIndex = session ? Math.min(session.currentIndex + 1, totalQuestions) : 1;
  const progressRatio =
    totalQuestions > 0 ? ((session?.completed ? totalQuestions : progressIndex) / totalQuestions) * 100 : 0;

  const handleExit = () => {
    navigate('/', { replace: false });
  };

  const persistSession = (nextSession: DailySession) => {
    setSession(nextSession);
    saveDailySession(nextSession);
  };

  const handleSelectOption = (option: string) => {
    if (!session || !currentQuestion || currentAnswer) return;
    const nextSession = answerCurrentQuestion(session, option);
    persistSession(nextSession);
  };

  const handleNext = () => {
    if (!session || !answered) return;

    const advancedSession = advanceDailySession(session);

    if (!advancedSession.completed) {
      persistSession(advancedSession);
      return;
    }

    const completion = applySessionCompletion(advancedSession, history, streak, todayKey);
    setHistory(completion.history);
    setStreak(completion.streak);
    saveStudyHistory(completion.history);
    saveStreak(completion.streak);
    persistSession(completion.session);
  };

  if (isWordsLoading && !session) {
    return <StudyLoadingSkeleton />;
  }

  if (wordsError || sessionError || !session) {
    return (
      <StudyErrorState
        message={wordsError ?? sessionError ?? 'Ezin izan da saioa prestatu.'}
        onBack={handleExit}
      />
    );
  }

  if (session.completed) {
    const score = session.score;
    const streakValue = session.streakAfter ?? streak.current;
    const wrongCount = session.questions.length - score;

    return (
      <div className="study-session">
        <div className="study-session__surface">
          <div className="study-session__header-row">
            <div className="study-session__header-copy">
              <p className="study-session__eyebrow">Gaurko 5 hitzak</p>
              <p className="study-session__progress-copy">5 / 5 osatuta</p>
              <div className="study-session__progress-track" aria-hidden="true">
                <div className="study-session__progress-fill" style={{ width: '100%' }} />
              </div>
            </div>
            <button
              type="button"
              className="study-session__close-btn"
              onClick={handleExit}
              aria-label="Itxi eta hasierara itzuli"
              title="Itxi"
            >
              <Icon name="x" className="study-session__close-icon" />
            </button>
          </div>

          <div className="study-session__center study-session__center--final">
            <section className="study-session__card study-session__card--final">
              <p className="study-session__eyebrow">Saioa amaituta</p>
              <h2 className="study-session__word">
                {score}/{session.questions.length}
              </h2>
              <p className="study-session__question study-session__question--muted">
                {wrongCount === 0
                  ? 'Primeran! Gaurko 5 hitzak denak asmatu dituzu.'
                  : `${wrongCount} galdera huts egin dituzu. Bihar berriro saiatu.`}
              </p>

              <div className="study-session__summary-grid">
                <div className="study-session__summary-pill">
                  <span className="study-session__summary-label">Segida</span>
                  <span className="study-session__summary-value">{streakValue}</span>
                </div>
                <div className="study-session__summary-pill">
                  <span className="study-session__summary-label">Data</span>
                  <span className="study-session__summary-value">{todayKey}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExit}
                className="btn-primary study-session__primary-btn"
              >
                Hasierara
              </button>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <StudyErrorState message="Ez da galderarik aurkitu saioan." onBack={handleExit} />;
  }

  const isLastQuestion = session.currentIndex >= session.questions.length - 1;

  return (
    <div className="study-session">
      <div className="study-session__surface">
        <div className="study-session__header-row">
          <div className="study-session__header-copy">
            <p className="study-session__eyebrow">Gaurko 5 hitzak</p>
            <p className="study-session__progress-copy">
              {progressIndex} / {totalQuestions}
            </p>
            <div className="study-session__progress-track" aria-hidden="true">
              <div
                className="study-session__progress-fill"
                style={{ width: `${Math.max(8, progressRatio)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            className="study-session__close-btn"
            onClick={handleExit}
            aria-label="Itxi eta hasierara itzuli"
            title="Itxi"
          >
            <Icon name="x" className="study-session__close-icon" />
          </button>
        </div>

        <div className="study-session__center">
          <section className="study-session__card">
            <p className="study-session__eyebrow">Hitz</p>
            <h1 className="study-session__word">{currentQuestion.word}</h1>
            <p className="study-session__question">Zer esan nahi du?</p>
          </section>

          <div className="study-session__answers" role="list" aria-label="Erantzun aukerak">
            {currentQuestion.options.map((option) => {
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
                <div key={option} role="listitem">
                  <AnswerOption
                    label={option}
                    disabled={Boolean(currentAnswer)}
                    tone={tone}
                    onClick={() => handleSelectOption(option)}
                  />
                </div>
              );
            })}
          </div>

          {currentAnswer ? (
            <FeedbackBox
              tone={currentAnswer.isCorrect ? 'correct' : 'wrong'}
              explanation={currentQuestion.explanation}
            />
          ) : (
            <div className="study-session__feedback study-session__feedback--placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="study-session__footer-actions">
          <button
            type="button"
            onClick={handleNext}
            disabled={!answered}
            className="btn-primary study-session__primary-btn"
          >
            {isLastQuestion ? 'Amaitu' : 'Hurrengoa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudySessionPage;
