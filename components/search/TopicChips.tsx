import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopics } from '../../hooks/useTopics';
import { getDailyTopic, getTopicVisual } from '../../lib/topicDaily';

export const TopicChips: React.FC = () => {
  const navigate = useNavigate();
  const { topics, isLoading } = useTopics();
  const dailyTopic = useMemo(() => getDailyTopic(topics), [topics]);
  const dailyVisual = useMemo(
    () => (dailyTopic ? getTopicVisual(dailyTopic.slug) : null),
    [dailyTopic]
  );

  return (
    <article className="surface-card topic-entry-card">
      <div className="topic-entry-card__header">
        <p className="topic-entry-card__kicker">Gaurko Gaia</p>
        {dailyVisual ? (
          <span
            className="topic-entry-card__icon"
            style={{
              color: dailyVisual.hue,
              background: dailyVisual.soft,
            }}
            aria-hidden="true"
          >
            {dailyVisual.icon}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="status-copy">Gaiak kargatzen...</p>
      ) : dailyTopic ? (
        <>
          <h3 className="topic-entry-card__title">{dailyTopic.title}</h3>
          <p className="topic-entry-card__copy">
            Sakatu gaurko gaia lehenengo ikusteko eta gainontzeko guztiak aztertzeko.
          </p>
        </>
      ) : (
        <p className="status-copy">Ez dago gairik oraingoz.</p>
      )}

      <div className="topic-entry-card__actions">
        <button type="button" className="btn-secondary" onClick={() => navigate('/gaiak')}>
          Ikusi Gaiak
        </button>
      </div>
    </article>
  );
};
