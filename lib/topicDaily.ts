import { TopicSummary } from '../appTypes';

type TopicVisual = {
  icon: string;
  hue: string;
  soft: string;
  tint: string;
};

const TOPIC_ICONS = [
  '📘',
  '🍎',
  '🏠',
  '👥',
  '💬',
  '🌍',
  '🧠',
  '💼',
  '🩺',
  '⚖️',
  '📱',
  '🚀',
  '🎓',
  '🛡️',
  '🌱',
  '🎯',
];

const TOPIC_COLORS: Array<{ hue: string; soft: string; tint: string }> = [
  { hue: '#2f80d8', soft: '#d7e8ff', tint: '#eef5ff' },
  { hue: '#21a67a', soft: '#d7f3ea', tint: '#ecfaf5' },
  { hue: '#cf5f8a', soft: '#f9dfeb', tint: '#fff1f7' },
  { hue: '#9459d6', soft: '#eadfff', tint: '#f5efff' },
  { hue: '#d07d2e', soft: '#fce8d7', tint: '#fff5ec' },
  { hue: '#2b9db0', soft: '#d8f0f4', tint: '#edf8fa' },
  { hue: '#5f79d7', soft: '#dfe6ff', tint: '#f1f4ff' },
  { hue: '#c1556d', soft: '#f9dde4', tint: '#fff0f4' },
];

const hashText = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((today.getTime() - start.getTime()) / millisecondsPerDay) + 1;
};

export const getDailyTopic = (
  topics: TopicSummary[],
  date: Date = new Date()
): TopicSummary | null => {
  if (topics.length === 0) return null;
  const index = (getDayOfYear(date) - 1) % topics.length;
  return topics[index] ?? topics[0] ?? null;
};

export const getTopicVisual = (slug: string): TopicVisual => {
  const token = slug.trim().toLowerCase() || 'topic';
  const hash = hashText(token);
  const icon = TOPIC_ICONS[hash % TOPIC_ICONS.length] ?? '📘';
  const color = TOPIC_COLORS[hash % TOPIC_COLORS.length] ?? TOPIC_COLORS[0];
  return {
    icon,
    hue: color.hue,
    soft: color.soft,
    tint: color.tint,
  };
};

