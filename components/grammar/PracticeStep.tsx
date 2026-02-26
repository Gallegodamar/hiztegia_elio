import React, { useMemo } from 'react';
import type { GrammarAttemptAnswer, GrammarQuestion } from '../../lib/grammarService';

type PracticeStepProps = {
  questions: GrammarQuestion[];
  answers: Record<string, GrammarAttemptAnswer>;
  questionIndex: number;
  onSelectAnswer: (question: GrammarQuestion, optionIndex: number) => void;
  onNext: () => void;
  saveError: string | null;
  isFinishing: boolean;
};

export const PracticeStep: React.FC<PracticeStepProps> = ({
  questions,
  answers,
  questionIndex,
  onSelectAnswer,
  onNext,
  saveError,
  isFinishing,
}) => {
  const question = questions[questionIndex] ?? null;
  const currentAnswer = question ? answers[question.id] ?? null : null;
  const totalQuestions = questions.length;
  const progressRatio =
    totalQuestions > 0 ? ((Math.min(questionIndex + 1, totalQuestions) / totalQuestions) * 100) : 0;

  const selectedLabel = useMemo(() => {
    if (!question || !currentAnswer) return null;
    return question.options[currentAnswer.selectedIndex] ?? null;
  }, [currentAnswer, question]);

  if (!question) {
    return (
      <div className="grammar-screen__panel">
        <section className="study-session__card">
          <p className="study-session__question study-session__question--muted">
            Ez dago galderarik praktikarako.
          </p>
        </section>
      </div>
    );
  }

  const isLast = questionIndex >= totalQuestions - 1;

  return (
    <div className="grammar-screen__panel">
      <section className="study-session__card">
        <p className="study-session__eyebrow">Praktika</p>
        <div className="grammar-screen__question-progress-row">
          <span className="study-session__progress-copy">
            {questionIndex + 1}/{totalQuestions}
          </span>
          <span className="helper-note">Galderak</span>
        </div>
        <div className="study-session__progress-track" aria-hidden="true">
          <div className="study-session__progress-fill" style={{ width: `${Math.max(8, progressRatio)}%` }} />
        </div>
        <h2 className="grammar-screen__question-title">{question.prompt}</h2>
      </section>

      <div className="grammar-screen__options" role="list" aria-label="Gramatika erantzun aukerak">
        {question.options.map((option, index) => {
          const isSelected = currentAnswer?.selectedIndex === index;
          const isCorrect = index === question.correctIndex;
          const tone = !currentAnswer
            ? 'idle'
            : isCorrect
              ? 'correct'
              : isSelected
                ? 'wrong'
                : 'muted';

          return (
            <button
              key={`${question.id}-${index}`}
              type="button"
              role="listitem"
              className={`grammar-screen__option grammar-screen__option--${tone}`}
              disabled={Boolean(currentAnswer) || isFinishing}
              onClick={() => onSelectAnswer(question, index)}
            >
              <span className="grammar-screen__option-prefix">{String.fromCharCode(65 + index)}</span>
              <span className="grammar-screen__option-label">{option}</span>
            </button>
          );
        })}
      </div>

      {currentAnswer ? (
        <div
          className={`study-session__feedback ${
            currentAnswer.isCorrect ? 'study-session__feedback--correct' : 'study-session__feedback--wrong'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="study-session__feedback-title">
            {currentAnswer.isCorrect ? 'Zuzena!' : 'Ez da zuzena'}
          </p>
          {selectedLabel ? (
            <p className="study-session__feedback-copy">Zuk aukeratua: {selectedLabel}</p>
          ) : null}
          <p className="study-session__feedback-copy">
            Erantzun zuzena: {question.options[question.correctIndex] ?? ''}
          </p>
          {question.explanation ? (
            <p className="study-session__feedback-copy" style={{ marginTop: '0.12rem' }}>
              {question.explanation}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="study-session__feedback study-session__feedback--placeholder" aria-hidden="true" />
      )}

      {saveError ? (
        <div className="study-session__feedback study-session__feedback--wrong" role="alert">
          <p className="study-session__feedback-title">Ezin izan da gorde</p>
          <p className="study-session__feedback-copy">{saveError}</p>
          <p className="study-session__feedback-copy" style={{ marginTop: '0.12rem' }}>
            Amaierako botoia berriro sakatu dezakezu.
          </p>
        </div>
      ) : null}

      <div className="study-session__footer-actions">
        <button
          type="button"
          onClick={onNext}
          disabled={!currentAnswer || isFinishing}
          className="btn-primary study-session__primary-btn"
        >
          {isFinishing ? 'Gordetzen...' : isLast ? 'Ikusi emaitzak' : 'Hurrengoa'}
        </button>
      </div>
    </div>
  );
};

export default PracticeStep;

