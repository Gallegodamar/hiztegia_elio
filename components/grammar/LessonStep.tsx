import React from 'react';
import type { GrammarLesson } from '../../lib/grammarService';

type LessonStepProps = {
  lesson: GrammarLesson;
  expanded: boolean;
  onToggleExpanded: () => void;
  onNext: () => void;
};

export const LessonStep: React.FC<LessonStepProps> = ({
  lesson,
  expanded,
  onToggleExpanded,
  onNext,
}) => (
  <div className="grammar-screen__panel">
    <section className="study-session__card">
      <p className="study-session__eyebrow">Azalpena</p>
      <h2 className="grammar-screen__lesson-title">{lesson.title}</h2>
      <p className="study-session__question study-session__question--muted">
        {lesson.shortExplanation}
      </p>
    </section>

    <section className="surface-card surface-card--muted grammar-screen__examples">
      <p className="section-label" style={{ margin: 0 }}>
        Adibideak
      </p>
      <div className="grammar-screen__example-list">
        {lesson.examples.map((example, index) => (
          <div key={`${example.eu}-${index}`} className="grammar-screen__example-item">
            <p className="grammar-screen__example-eu">{example.eu}</p>
            <p className="grammar-screen__example-es">{example.es}</p>
          </div>
        ))}
      </div>

      {lesson.moreInfo ? (
        <div className="grammar-screen__more-block">
          <button
            type="button"
            className="btn-secondary btn-secondary--compact"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
          >
            {expanded ? 'Ikasi gehiago itxi' : 'Ikasi gehiago'}
          </button>
          {expanded ? (
            <div className="grammar-screen__more-copy" role="region" aria-label="Ikasi gehiago">
              {lesson.moreInfo}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>

    <div className="study-session__footer-actions">
      <button type="button" onClick={onNext} className="btn-primary study-session__primary-btn">
        Praktikatu
      </button>
    </div>
  </div>
);

export default LessonStep;

