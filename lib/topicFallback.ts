import { TopicDetail, TopicSummary } from '../appTypes';

const FALLBACK_TOPIC_DETAILS: TopicDetail[] = [
  {
    slug: 'adopzioa',
    title: 'Adopzioa',
    categories: [
      {
        key: 'izenak',
        label: 'Izenak',
        items: [
          'adoptatzea',
          'harrera-familia',
          'familia biologikoa',
          'familia adoptiboa',
          'seme-alaba adoptatua',
        ],
      },
      {
        key: 'aditzak',
        label: 'Aditzak',
        items: ['azpimarratu', 'nabarmendu', 'argudiatu', 'zaindu', 'babestu'],
      },
      {
        key: 'adjektiboak',
        label: 'Adjektiboak',
        items: ['biologikoa', 'afektiboa', 'egonkorra', 'arduratsua', 'babeslea'],
      },
    ],
  },
  {
    slug: 'janaria',
    title: 'Janaria',
    categories: [
      {
        key: 'izenak',
        label: 'Izenak',
        items: ['barazkiak', 'fruta', 'ogia', 'arraina', 'haragia'],
      },
      {
        key: 'aditzak',
        label: 'Aditzak',
        items: ['prestatu', 'jan', 'zerbitzatu', 'nahastu', 'frijitu'],
      },
      {
        key: 'adjektiboak',
        label: 'Adjektiboak',
        items: ['gozoa', 'gazia', 'freskoa', 'beroa', 'osasuntsua'],
      },
    ],
  },
  {
    slug: 'etxea',
    title: 'Etxea',
    categories: [
      {
        key: 'izenak',
        label: 'Izenak',
        items: ['egongela', 'logela', 'sukaldea', 'komuna', 'atea'],
      },
      {
        key: 'aditzak',
        label: 'Aditzak',
        items: ['garbitu', 'antolatu', 'konpondu', 'ireki', 'itxi'],
      },
      {
        key: 'adjektiboak',
        label: 'Adjektiboak',
        items: ['zabala', 'txikia', 'argitsua', 'erosoa', 'epela'],
      },
    ],
  },
  {
    slug: 'pertsonak',
    title: 'Pertsonak',
    categories: [
      {
        key: 'izenak',
        label: 'Izenak',
        items: ['laguna', 'familia', 'irakaslea', 'ikaslea', 'bizilaguna'],
      },
      {
        key: 'aditzak',
        label: 'Aditzak',
        items: ['hitz egin', 'entzun', 'lagundu', 'ikasi', 'adierazi'],
      },
      {
        key: 'adjektiboak',
        label: 'Adjektiboak',
        items: ['atsegina', 'langilea', 'zintzoa', 'adeitsua', 'sortzailea'],
      },
    ],
  },
  {
    slug: 'eguraldia',
    title: 'Eguraldia',
    categories: [
      {
        key: 'izenak',
        label: 'Izenak',
        items: ['euria', 'haizea', 'elurra', 'ekaitza', 'lainoa'],
      },
      {
        key: 'aditzak',
        label: 'Aditzak',
        items: ['euria egin', 'hoztu', 'berotu', 'argitu', 'ilundu'],
      },
      {
        key: 'adjektiboak',
        label: 'Adjektiboak',
        items: ['hezea', 'hotza', 'epela', 'eguzkitsua', 'lainotsua'],
      },
    ],
  },
];

const normalizeSlug = (value: string): string => value.trim().toLowerCase();

export const getFallbackTopics = (): TopicSummary[] =>
  FALLBACK_TOPIC_DETAILS.map((topic, index) => ({
    id: index + 1,
    slug: topic.slug,
    title: topic.title,
  }));

export const getFallbackTopicBySlug = (slug: string): TopicDetail | null => {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return (
    FALLBACK_TOPIC_DETAILS.find((topic) => normalizeSlug(topic.slug) === normalized) ?? null
  );
};

