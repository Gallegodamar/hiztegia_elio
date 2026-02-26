import React from 'react';
import type { GrammarAttemptAnswer, GrammarLesson, GrammarQuestion, GrammarStatsSummary } from '../../lib/grammarService';

type ResultStepProps = {
  lesson: GrammarLesson;
  questions: GrammarQuestion[];
  answers: Record<string, GrammarAttemptAnswer>;
  score: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  wasQueued: boolean;
  saveError: string | null;
  stats: GrammarStatsSummary | null;
  onFinish: () => void;
  onRetrySave?: () => void;
  onBackToLesson?: () => void;
};

const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const ResultStep: React.FC<ResultStepProps> = ({
  lesson,
  questions,
  answers,
  score,
  correctCount,
  wrongCount,
  durationSeconds,
  wasQueued,
  saveError,
  stats,
  onFinish,
  onRetrySave,
  onBackToLesson,
}) => (
  <div className="grammar-screen__panel">
    <section className="study-session__card study-session__card--final">
      <p className="study-session__eyebrow">Emaitzak</p>
      <h2 className="study-session__word">{Math.round(score)}%</h2>
      <p className="study-session__question study-session__question--muted">
        {lesson.title}
      </p>

      <div className="study-session__summary-grid" style={{ marginTop: '0.85rem' }}>
        <div className="study-session__summary-pill">
          <span className="study-session__summary-label">Zuzena</span>
          <span className="study-session__summary-value">{correctCount}</span>
        </div>
        <div className="study-session__summary-pill">
          <span className="study-session__summary-label">Okerra</span>
          <span className="study-session__summary-value">{wrongCount}</span>
        </div>
        <div className="study-session__summary-pill">
          <span className="study-session__summary-label">Denbora</span>
          <span className="study-session__summary-value">{formatDuration(durationSeconds)}</span>
        </div>
        <div className="study-session__summary-pill">
          <span className="study-session__summary-label">Maila</span>
          <span className="study-session__summary-value">{lesson.level}</span>
        </div>
      </div>

      {wasQueued ? (
        <div className="grammar-screen__status-banner grammar-screen__status-banner--warn">
          Offline edo sare arazoa: emaitza lokalki gorde da eta gero sinkronizatuko da.
        </div>
      ) : null}

      {saveError ? (
        <div className="grammar-screen__status-banner grammar-screen__status-banner--error">
          {saveError}
        </div>
      ) : null}
    </section>

    <section className="surface-card surface-card--muted grammar-screen__results-list">
      <p className="section-label" style={{ margin: 0 }}>
        Galderak
      </p>
      <div className="grammar-screen__result-rows">
        {questions.map((question, index) => {
          const answer = answers[question.id];
          const correctOption = question.options[question.correctIndex] ?? '';
          const selectedOption =
            answer && answer.selectedIndex >= 0 ? question.options[answer.selectedIndex] ?? '' : '';

          return (
            <div key={question.id} className="grammar-screen__result-row">
              <div className="grammar-screen__result-row-main">
                <span className="grammar-screen__result-row-index">{index + 1}</span>
                <div>
                  <p className="grammar-screen__result-prompt">{question.prompt}</p>
                  <p className="grammar-screen__result-meta">
                    {answer?.isCorrect ? '✅ Zuzena' : '❌ Okerra'} · {selectedOption || '-'}
                  </p>
                  {!answer?.isCorrect ? (
                    <p className="grammar-screen__result-meta grammar-screen__result-meta--correct">
                      Zuzena: {correctOption}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>

    {stats ? (
      <section className="surface-card grammar-screen__stats-card">
        <p className="section-label" style={{ margin: 0 }}>
          Azken egunak
        </p>
        <p className="helper-note" style={{ margin: '0.35rem 0 0' }}>
          {stats.completedCount} saio · batez besteko nota {Math.round(stats.avgScore)}%
        </p>
      </section>
    ) : null}

    <div className="study-session__footer-actions" style={{ display: 'grid', gap: '0.5rem' }}>
      {saveError && onRetrySave ? (
        <button type="button" className="btn-secondary study-session__primary-btn" onClick={onRetrySave}>
          Berriro gorde
        </button>
      ) : null}
      {onBackToLesson ? (
        <button type="button" className="btn-secondary study-session__primary-btn" onClick={onBackToLesson}>
          Azalpena berrikusi
        </button>
      ) : null}
      <button type="button" className="btn-primary study-session__primary-btn" onClick={onFinish}>
        Amaitu
      </button>
    </div>
  </div>
);

export default ResultStep;

