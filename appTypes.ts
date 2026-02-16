import { DifficultyLevel, WordData } from './types';

export type SearchResultItem = WordData & { level: DifficultyLevel };

export type DictionaryMeaning = {
  hitza: string;
  esanahia: string;
};
