import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopicCategory, TopicDetail } from '../../appTypes';
import { useTopic } from '../../hooks/useTopic';
import { useTopics } from '../../hooks/useTopics';
import { getDailyTopic, getTopicVisual } from '../../lib/topicDaily';

type TopicExplorerPanelProps = {
  initialSlug?: string;
};

const CATEGORY_BLUEPRINT: Array<{ id: string; label: string; aliases?: string[] }> = [
  { id: 'izenak', label: 'IZENAK', aliases: ['izena'] },
  { id: 'aditzak', label: 'ADITZAK', aliases: ['aditza'] },
  { id: 'adjektiboak', label: 'ADJEKTIBOAK', aliases: ['adjektiboa'] },
  { id: 'adberbioak', label: 'ADBERBIOAK', aliases: ['adberbioa'] },
  { id: 'lokailuak', label: 'LOKAILUAK', aliases: ['lokailua'] },
  { id: 'esamoldeak', label: 'ESAMOLDEAK', aliases: ['esamoldea'] },
  { id: 'ardatznagusiak', label: 'ARDATZ NAGUSIAK', aliases: ['ardatznagusia'] },
  {
    id: 'egituraakademikoak',
    label: 'EGITURA AKADEMIKOAK',
    aliases: ['egituraakademikoa'],
  },
  { id: 'hitzgakoak', label: 'HITZ GAKOAK', aliases: ['hitzgakoa'] },
];

const HIDDEN_CATEGORY_IDS = new Set(['azalpenarenardatzak', 'egiturak', 'turismomotak']);

type TopicSection = {
  id: string;
  label: string;
  items: string[];
};

const normalizeCategoryId = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const buildTopicSections = (topic: TopicDetail | null): TopicSection[] => {
  const categories = topic?.categories ?? [];
  const byKey = new Map<string, TopicCategory>();

  categories.forEach((category) => {
    const keys = [category.key, category.label]
      .map((entry) => normalizeCategoryId(entry))
      .filter((entry) => entry.length > 0);
    keys.forEach((key) => {
      if (!byKey.has(key)) byKey.set(key, category);
    });
  });

  const usedCategories = new Set<TopicCategory>();
  const ordered = CATEGORY_BLUEPRINT.map((entry) => {
    const searchKeys = [entry.id, ...(entry.aliases ?? [])].map((alias) =>
      normalizeCategoryId(alias)
    );
    const match = searchKeys
      .map((key) => byKey.get(key))
      .find((category): category is TopicCategory => Boolean(category));

    if (match) usedCategories.add(match);

    return {
      id: entry.id,
      label: entry.label,
      items: match?.items ?? [],
    };
  });

  const extras: TopicSection[] = categories
    .filter((category) => !usedCategories.has(category))
    .map((category) => ({
      id: normalizeCategoryId(category.key || category.label),
      label: category.label.toUpperCase(),
      items: category.items ?? [],
    }))
    .filter((section) => section.items.length > 0);

  const visibleSections = [...ordered, ...extras].filter(
    (section) => !HIDDEN_CATEGORY_IDS.has(section.id)
  );
  const hiddenSectionsWithItems = [...ordered, ...extras].filter(
    (section) => HIDDEN_CATEGORY_IDS.has(section.id) && section.items.length > 0
  );

  const hasVisibleContent = visibleSections.some((section) => section.items.length > 0);
  if (hasVisibleContent) return visibleSections;

  if (hiddenSectionsWithItems.length > 0) {
    return [...visibleSections, ...hiddenSectionsWithItems];
  }

  return visibleSections;
};

const buildTileStyle = (slug: string): CSSProperties => {
  const visual = getTopicVisual(slug);
  return {
    ['--topic-tile-hue' as string]: visual.hue,
    ['--topic-tile-soft' as string]: visual.soft,
    ['--topic-tile-tint' as string]: visual.tint,
  };
};

export const TopicExplorerPanel: React.FC<TopicExplorerPanelProps> = ({
  initialSlug = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topics, isLoading: isTopicsLoading } = useTopics();
  const normalizedInitialSlug = initialSlug.trim().toLowerCase();
  const [selectedSlug, setSelectedSlug] = useState(normalizedInitialSlug);
  const { topic, isLoading: isTopicLoading } = useTopic(selectedSlug);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const dailyTopic = useMemo(() => getDailyTopic(topics), [topics]);
  const dailySlug = dailyTopic?.slug ?? '';
  const dailyVisual = useMemo(
    () => (dailyTopic ? getTopicVisual(dailyTopic.slug) : null),
    [dailyTopic]
  );
  const topicOptions = useMemo(() => {
    if (!dailyTopic) return topics;
    return [dailyTopic, ...topics.filter((entry) => entry.slug !== dailyTopic.slug)];
  }, [dailyTopic, topics]);

  useEffect(() => {
    if (normalizedInitialSlug.length === 0) return;
    setSelectedSlug(normalizedInitialSlug);
  }, [normalizedInitialSlug]);

  useEffect(() => {
    if (topics.length === 0) {
      setSelectedSlug('');
      return;
    }

    const hasSelected = topics.some((entry) => entry.slug === selectedSlug);
    if (hasSelected) return;

    if (normalizedInitialSlug.length > 0) {
      const initialMatch = topics.find((entry) => entry.slug === normalizedInitialSlug);
      if (initialMatch) {
        setSelectedSlug(initialMatch.slug);
        return;
      }
    }

    setSelectedSlug(dailySlug || topics[0].slug);
  }, [dailySlug, normalizedInitialSlug, selectedSlug, topics]);

  const selectedSummary = useMemo(
    () => topics.find((entry) => entry.slug === selectedSlug) ?? null,
    [topics, selectedSlug]
  );

  const activeTopic: TopicDetail | null = useMemo(() => {
    if (topic) return topic;
    if (!selectedSummary) return null;
    return {
      slug: selectedSummary.slug,
      title: selectedSummary.title,
      categories: [],
    };
  }, [topic, selectedSummary]);

  const sections = useMemo(() => buildTopicSections(activeTopic), [activeTopic]);

  useEffect(() => {
    if (sections.length === 0) {
      setExpandedSectionId(null);
      return;
    }

    const stillExists = sections.some((section) => section.id === expandedSectionId);
    if (stillExists) return;

    setExpandedSectionId(null);
  }, [expandedSectionId, sections]);

  const handleTopicChange = (slug: string) => {
    setSelectedSlug(slug);
    setExpandedSectionId(null);
    if (location.pathname.startsWith('/gaiak/')) {
      navigate(`/gaiak/${slug}`, { replace: true });
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId((current) => (current === sectionId ? null : sectionId));
  };

  useEffect(() => {
    if (!location.pathname.startsWith('/gaiak/')) return;
    if (!selectedSlug) return;
    const currentRouteSlug = location.pathname.split('/')[2]?.trim().toLowerCase() ?? '';
    if (currentRouteSlug === selectedSlug) return;
    navigate(`/gaiak/${selectedSlug}`, { replace: true });
  }, [location.pathname, navigate, selectedSlug]);

  return (
    <div className="topic-browser">
      {isTopicsLoading ? (
        <p className="status-copy">Gaiak kargatzen...</p>
      ) : topics.length === 0 ? (
        <p className="status-copy">Ez dago gairik oraingoz.</p>
      ) : (
        <>
          {dailyTopic ? (
            <section
              className={`surface-card topic-browser__daily-card ${
                selectedSlug === dailyTopic.slug ? 'topic-browser__daily-card--active' : ''
              }`}
              style={buildTileStyle(dailyTopic.slug)}
            >
              <div className="topic-browser__daily-main">
                <span className="topic-browser__daily-icon" aria-hidden="true">
                  {dailyVisual?.icon ?? 'T'}
                </span>
                <div className="topic-browser__daily-text">
                  <p className="topic-browser__daily-kicker">Gaurko Gaia</p>
                  <h3 className="topic-browser__daily-title">{dailyTopic.title}</h3>
                </div>
              </div>
              <button
                type="button"
                className="topic-browser__daily-action"
                onClick={() => handleTopicChange(dailyTopic.slug)}
              >
                {selectedSlug === dailyTopic.slug ? 'Irekita' : 'Ireki'}
              </button>
            </section>
          ) : null}

          <section className="topic-browser__catalog">
            <select
              id="topic-selector"
              className="input-shell topic-browser__select"
              value={selectedSlug}
              onChange={(event) => handleTopicChange(event.target.value)}
            >
              {topicOptions.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.title}
                </option>
              ))}
            </select>
          </section>

          {activeTopic ? (
            <>
              {isTopicLoading ? (
                <p className="status-copy">Gaia kargatzen...</p>
              ) : sections.length === 0 ? (
                <p className="status-copy">Ez dago kategoriarik gai honetan.</p>
              ) : (
                <div className="topic-browser__accordion">
                  {sections.map((section) => {
                    const isOpen = expandedSectionId === section.id;
                    return (
                      <section key={section.id} className="topic-browser__section">
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          className={`topic-browser__trigger ${
                            isOpen ? 'topic-browser__trigger--open' : ''
                          }`}
                        >
                          <span>{section.label}</span>
                          <span className="topic-browser__trigger-meta">
                            {section.items.length}
                          </span>
                        </button>

                        {isOpen ? (
                          <div className="topic-browser__panel">
                            {section.items.length === 0 ? (
                              <p className="topic-browser__empty">Edukirik ez kategoria honetan.</p>
                            ) : (
                              <ul className="topic-item-list">
                                {section.items.map((item, index) => (
                                  <li key={`${section.id}-${index}`}>
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/?q=${encodeURIComponent(item)}`)}
                                      className="topic-item-list__button"
                                    >
                                      {item}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="status-copy">Gaia ez da aurkitu.</p>
          )}
        </>
      )}
    </div>
  );
};
