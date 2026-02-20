import { DifficultyLevel, WordData } from './types';

export type SearchResultItem = WordData & { level: DifficultyLevel };

export type DictionaryMeaning = {
  hitza: string;
  esanahia: string;
  sinonimoak: string[];
  definizioak: string[];
};

export type OrganizerItem = Record<string, unknown>;

export type TopicSummary = {
  id: number;
  slug: string;
  title: string;
};

export type TopicCategory = {
  key: string;
  label: string;
  items: string[];
};

export type TopicDetail = {
  slug: string;
  title: string;
  categories: TopicCategory[];
};
