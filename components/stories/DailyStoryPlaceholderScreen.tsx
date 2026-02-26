import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { markDailyStorySeen } from '../../lib/dailyStoriesSeen';

type DailyStoryPlaceholderScreenProps = {
  storyId: string;
  title: string;
  description?: string;
  segments?: number;
  activeSegment?: number;
  nextRoute?: string | null;
  children?: React.ReactNode;
};

export const DailyStoryPlaceholderScreen: React.FC<DailyStoryPlaceholderScreenProps> = ({
  storyId,
  title,
  description = 'Placeholder pantaila. Hemen eguneroko edukia erakutsiko da.',
  segments = 4,
  activeSegment = 1,
  nextRoute = null,
  children,
}) => {
  const navigate = useNavigate();
  const hasRichContent = Boolean(children);

  useEffect(() => {
    markDailyStorySeen(storyId);
  }, [storyId]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/', { replace: true });
  };

  const handleAdvance = () => {
    if (!nextRoute) return;
    navigate(nextRoute);
  };

  return (
    <section className="story-placeholder" aria-label={title}>
      <div
        className={`story-placeholder__surface ${
          nextRoute ? 'story-placeholder__surface--tap-next' : ''
        } ${hasRichContent ? 'story-placeholder__surface--rich' : ''}`}
        onClick={handleAdvance}
        role={nextRoute ? 'button' : undefined}
        tabIndex={nextRoute ? 0 : undefined}
        aria-label={nextRoute ? `${title} - hurrengora joan` : undefined}
        onKeyDown={(event) => {
          if (!nextRoute) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          handleAdvance();
        }}
      >
        <div className="story-placeholder__progress" aria-hidden="true">
          {Array.from({ length: Math.min(Math.max(segments, 3), 5) }, (_, index) => {
            const isActive = index === Math.max(0, activeSegment - 1);
            const isCompleted = index < Math.max(0, activeSegment - 1);
            return (
              <span
                key={`${title}-segment-${index}`}
                className={`story-placeholder__segment ${
                  isActive
                    ? 'story-placeholder__segment--active'
                    : isCompleted
                      ? 'story-placeholder__segment--done'
                      : ''
                }`}
              />
            );
          })}
        </div>

        <div className={`story-placeholder__body ${hasRichContent ? 'story-placeholder__body--rich' : ''}`}>
          <p className="story-placeholder__kicker">Eguneko egoera</p>
          <h2 className="story-placeholder__title font-display">{title}</h2>
          {children ? (
            <div className="story-placeholder__content" aria-live="polite">
              {children}
            </div>
          ) : (
            <p className="story-placeholder__copy">{description}</p>
          )}

          <button
            type="button"
            className="btn-secondary story-placeholder__back"
            onClick={(event) => {
              event.stopPropagation();
              handleBack();
            }}
          >
            Itzuli
          </button>
        </div>
      </div>
    </section>
  );
};
