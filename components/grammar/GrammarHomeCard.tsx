import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayGrammarCardState, type GrammarCardState } from '../../lib/grammarService';

export const GrammarHomeCard: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<GrammarCardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCard = async () => {
      try {
        const next = await getTodayGrammarCardState();
        if (cancelled) return;
        setState(next);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Ezin izan da gramatika kargatu.');
        setState(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCard();

    return () => {
      cancelled = true;
    };
  }, []);

  const title = state?.lesson.title ?? 'Eguneko gramatika';
  const level = state?.settings.preferredLevel ?? 'B1';
  const duration = state?.lesson.estimatedMinutes ?? 4;

  return (
    <section className="home-hub__grammar-card surface-card" aria-label="Eguneko gramatika">
      <div className="home-hub__grammar-card-head">
        <div>
          <p className="section-label" style={{ margin: 0 }}>
            Eguneko gramatika
          </p>
          <h3 className="home-hub__grammar-card-title">{title}</h3>
          <p className="helper-note home-hub__grammar-card-meta">
            {duration} minutu · Maila: {level}
          </p>
        </div>
        {state?.completed ? (
          <span className="home-hub__grammar-badge home-hub__grammar-badge--done">
            Eginda {state.score != null ? `${Math.round(state.score)}%` : '✅'}
          </span>
        ) : (
          <span className="home-hub__grammar-badge">Gaur</span>
        )}
      </div>

      {error && !state ? (
        <p className="helper-note" style={{ marginTop: '0.35rem' }}>
          {error}
        </p>
      ) : null}

      <div className="home-hub__grammar-card-actions">
        <button
          type="button"
          className="btn-secondary btn-secondary--compact"
          onClick={() => navigate('/gaurko-gramatika')}
          disabled={isLoading}
        >
          {state?.completed ? 'Ikusi emaitzak' : 'Ireki'}
        </button>
      </div>
    </section>
  );
};

export default GrammarHomeCard;

