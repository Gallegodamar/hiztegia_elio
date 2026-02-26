import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OrganizerItem, TopicCategory } from '../../appTypes';
import { useTopic } from '../../hooks/useTopic';
import { useTopics } from '../../hooks/useTopics';
import { getDailyTopic } from '../../lib/topicDaily';
import { fetchAllOrganizers, fetchDailyWord } from '../../lib/supabaseRepo';

type StoryContentStateProps = {
  loading?: boolean;
  empty?: string;
  children?: React.ReactNode;
};

const StoryContentState: React.FC<StoryContentStateProps> = ({
  loading = false,
  empty,
  children,
}) => {
  if (loading) {
    return (
      <div className="story-rich-card story-rich-card--muted">
        <p className="story-rich-card__muted">Kargatzen...</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="story-rich-card story-rich-card--muted">
        <p className="story-rich-card__muted">{empty}</p>
      </div>
    );
  }

  return <>{children}</>;
};

const firstCategoryItem = (category: TopicCategory): string | null => {
  const match = (category.items ?? []).find((item) => item.trim().length > 0);
  return match?.trim() ?? null;
};

export const DailyTopicStoryContent: React.FC = () => {
  const { topics, isLoading: isTopicsLoading } = useTopics();
  const dailyTopic = useMemo(() => getDailyTopic(topics), [topics]);
  const { topic, isLoading: isTopicLoading } = useTopic(dailyTopic?.slug ?? '');

  const previewRows = useMemo(() => {
    const categories = topic?.categories ?? [];
    return categories
      .map((category) => ({
        label: (category.label || category.key || 'Atala').trim(),
        item: firstCategoryItem(category),
      }))
      .filter(
        (row): row is { label: string; item: string } =>
          row.label.length > 0 && typeof row.item === 'string' && row.item.length > 0
      );
  }, [topic]);

  const isLoading = isTopicsLoading || (!!dailyTopic && isTopicLoading);
  const topicTitle = topic?.title ?? dailyTopic?.title ?? null;

  return (
    <StoryContentState loading={isLoading} empty={!topicTitle ? 'Ez dago gaurko gairik.' : undefined}>
      {topicTitle ? (
        <div className="story-rich-stack">
          <div className="story-rich-card">
            <p className="story-rich-card__eyebrow">Gaurko gaia</p>
            <h3 className="story-rich-card__title">{topicTitle}</h3>
            <p className="story-rich-card__meta">
              {previewRows.length > 0
                ? `${previewRows.length} motatako adibide`
                : 'Edukia prestatzen ari da'}
            </p>
          </div>

          {previewRows.length > 0 ? (
            <div className="story-rich-card story-rich-card--list">
              <ul className="story-rich-list" aria-label="Gaiaren atalen aurrebista">
                {previewRows.map((row) => (
                  <li key={`${row.label}-${row.item}`} className="story-rich-list__item">
                    <span className="story-rich-list__label">{row.label}</span>
                    <span className="story-rich-list__value">{row.item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="story-rich-card story-rich-card--muted">
              <p className="story-rich-card__muted">Oraindik ez dago itemik gai honentzat.</p>
            </div>
          )}
        </div>
      ) : null}
    </StoryContentState>
  );
};

export const DailySynonymStoryContent: React.FC = () => {
  const query = useQuery({
    queryKey: ['daily-story', 'synonym'],
    queryFn: fetchDailyWord,
    staleTime: 5 * 60 * 1000,
  });

  const row = query.data ?? null;

  return (
    <StoryContentState
      loading={query.isLoading}
      empty={!query.isLoading && !row ? 'Ez dago gaurko sinonimorik.' : undefined}
    >
      {row ? (
        <div className="story-rich-stack">
          <div className="story-rich-card">
            <p className="story-rich-card__eyebrow">Gaurko sinonimoa</p>
            <h3 className="story-rich-card__title">{row.hitza}</h3>
            <p className="story-rich-card__meta">
              {row.sinonimoak.length > 0 ? `${row.sinonimoak.length} sinonimo` : 'Sinonimo barik'}
            </p>
          </div>

          {row.sinonimoak.length > 0 ? (
            <div className="story-rich-card story-rich-card--chips">
              <div className="story-rich-chip-list">
                {row.sinonimoak.map((synonym) => (
                  <span key={`${row.hitza}-${synonym}`} className="story-rich-chip">
                    {synonym}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </StoryContentState>
  );
};

const getOrganizerText = (item: OrganizerItem, key: string): string | null => {
  const value = item[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getDailyOrganizer = (items: OrganizerItem[]): OrganizerItem | null => {
  if (items.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return items[day % items.length] ?? null;
};

export const DailyOrganizerStoryContent: React.FC = () => {
  const query = useQuery({
    queryKey: ['daily-story', 'organizer'],
    queryFn: fetchAllOrganizers,
    staleTime: 5 * 60 * 1000,
  });

  const item = useMemo(() => getDailyOrganizer(query.data ?? []), [query.data]);
  const title = item ? getOrganizerText(item, 'antolatzaileak') : null;
  const meaning = item ? getOrganizerText(item, 'esanahia') : null;
  const type = item ? getOrganizerText(item, 'mota') : null;

  return (
    <StoryContentState
      loading={query.isLoading}
      empty={!query.isLoading && !title ? 'Ez dago gaurko antolatzailearik.' : undefined}
    >
      {title ? (
        <div className="story-rich-stack">
          <div className="story-rich-card">
            <p className="story-rich-card__eyebrow">Gaurko antolatzailea</p>
            <h3 className="story-rich-card__title">{title}</h3>
            {meaning ? <p className="story-rich-card__body-copy">{meaning}</p> : null}
          </div>

          {type ? (
            <div className="story-rich-card story-rich-card--muted">
              <p className="story-rich-card__muted-label">Mota</p>
              <p className="story-rich-card__muted-value">{type}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </StoryContentState>
  );
};

type GrammarTip = {
  title: string;
  rule: string;
  example: string;
};

const GRAMMAR_TIPS: GrammarTip[] = [
  {
    title: 'Aditza Amaieran',
    rule: 'Esaldi askotan, aditza amaieran joatea naturala da euskaraz.',
    example: 'Gaur liburutegira joan naiz.',
  },
  {
    title: 'Postposizioak',
    rule: 'Euskaran harremanak askotan hitzaren atzean markatzen dira.',
    example: 'Etxean, lagunarekin, mendira.',
  },
  {
    title: 'Mugagabea vs Mugatua',
    rule: 'Artikuluak (a / ak) esanahia zehaztu dezake.',
    example: 'liburu bat / liburua / liburuak',
  },
  {
    title: 'Ezezkoa',
    rule: 'Ezezko esaldietan askotan “ez” erabiltzen da aditzaren aurrean.',
    example: 'Ez dut ulertu.',
  },
];

const getDailyGrammarTip = (): GrammarTip => {
  const day = Math.floor(Date.now() / 86_400_000);
  return GRAMMAR_TIPS[day % GRAMMAR_TIPS.length] ?? GRAMMAR_TIPS[0];
};

export const DailyGrammarStoryContent: React.FC = () => {
  const tip = getDailyGrammarTip();

  return (
    <div className="story-rich-stack">
      <div className="story-rich-card">
        <p className="story-rich-card__eyebrow">Gaurko gramatika</p>
        <h3 className="story-rich-card__title">{tip.title}</h3>
        <p className="story-rich-card__body-copy">{tip.rule}</p>
      </div>

      <div className="story-rich-card story-rich-card--example">
        <p className="story-rich-card__muted-label">Adibidea</p>
        <p className="story-rich-card__example">{tip.example}</p>
      </div>
    </div>
  );
};
