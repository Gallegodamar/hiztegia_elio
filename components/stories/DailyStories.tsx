import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DailyStorySeenStatus,
  getDailyStoriesDateKey,
  markDailyStorySeen,
  readSeenDailyStories,
} from '../../lib/dailyStoriesSeen';

export type DailyStoryItem = {
  id: string;
  label: string;
  route: string;
  sectionRoute?: string;
  status?: DailyStorySeenStatus;
  icon?: React.ReactNode;
};

type DailyStoriesProps = {
  items: DailyStoryItem[];
  onOpen?: (item: DailyStoryItem) => void;
};

export const DailyStories: React.FC<DailyStoriesProps> = ({ items, onOpen }) => {
  const navigate = useNavigate();
  const dateKey = getDailyStoriesDateKey();
  const [seenIds, setSeenIds] = useState<Set<string>>(() => readSeenDailyStories(dateKey));

  useEffect(() => {
    setSeenIds(readSeenDailyStories(dateKey));
  }, [dateKey]);

  const openStory = (item: DailyStoryItem) => {
    const nextSeen = markDailyStorySeen(item.id, dateKey);
    setSeenIds(nextSeen);
    onOpen?.(item);
    navigate(item.route);
  };

  const openSection = (item: DailyStoryItem) => {
    navigate(item.sectionRoute ?? item.route);
  };

  return (
    <section className="daily-stories" aria-label="Eguneko egoerak">
      <div className="daily-stories__track" role="list">
        {items.map((item) => {
          const status: DailyStorySeenStatus =
            seenIds.has(item.id) || item.status === 'seen' ? 'seen' : 'pending';
          const statusLabel = status === 'pending' ? 'Berria' : null;

          return (
            <div key={item.id} className="daily-stories__item" role="listitem">
              <button
                type="button"
                className={`daily-stories__button daily-stories__button--${status}`}
                onClick={() => openStory(item)}
                aria-label={`Ireki: ${item.label}`}
                title={item.label}
              >
                <span
                  className={`daily-stories__ring ${
                    status === 'seen'
                      ? 'daily-stories__ring--seen'
                      : 'daily-stories__ring--pending'
                  }`}
                >
                  {status === 'pending' ? (
                    <span
                      className="daily-stories__badge daily-stories__badge--pending"
                      aria-hidden="true"
                    >
                      !
                    </span>
                  ) : null}
                  <span className="daily-stories__avatar" aria-hidden="true">
                    {item.icon ?? '*'}
                  </span>
                </span>
              </button>

              <button
                type="button"
                className={`daily-stories__label-button daily-stories__label-button--${status}`}
                onClick={() => openSection(item)}
                aria-label={`Joan atalera: ${item.label}`}
                title={`Joan atalera: ${item.label}`}
              >
                <span className="daily-stories__label">{item.label}</span>
                {statusLabel ? (
                  <span className="daily-stories__meta" aria-hidden="true">
                    {statusLabel}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
