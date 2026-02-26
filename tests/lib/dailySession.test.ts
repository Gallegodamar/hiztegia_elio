import { beforeEach, describe, expect, it } from 'vitest';
import {
  applySessionCompletion,
  answerCurrentQuestion,
  advanceDailySession,
  computeStreakUpdate,
  createDailySession,
  getDailySessionStorageKey,
  getOrCreateDailySession,
  selectDailyWords,
  type StudyHistory,
  type StudyWord,
} from '../../lib/dailySession';
import { getJSON, setJSON, type StorageLike } from '../../lib/storage';

const makeStorage = (): StorageLike => {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
};

const baseWords: StudyWord[] = [
  { id: 'n1', word: 'berri1', meaning: 'Esanahia 1' },
  { id: 'n2', word: 'berri2', meaning: 'Esanahia 2' },
  { id: 'r1', word: 'errepaso1', meaning: 'Esanahia 3' },
  { id: 'r2', word: 'errepaso2', meaning: 'Esanahia 4' },
  { id: 'c1', word: 'prentsa1', meaning: 'Esanahia 5', tags: ['Prentsa'] },
  { id: 'x1', word: 'beste1', meaning: 'Esanahia 6' },
  { id: 'x2', word: 'beste2', meaning: 'Esanahia 7' },
];

const todayKey = '2026-02-25';

const historyForBuckets: StudyHistory = {
  r1: { lastSeen: '2026-02-20', correct: 1, wrong: 3, nextReview: '2026-02-24' },
  r2: { lastSeen: '2026-02-21', correct: 0, wrong: 2, nextReview: '2026-02-25' },
  c1: { lastSeen: '2026-02-24', correct: 3, wrong: 0, nextReview: '2026-02-28' },
  x1: { lastSeen: '2026-02-24', correct: 2, wrong: 0, nextReview: '2026-03-05' },
  x2: { lastSeen: '2026-02-24', correct: 2, wrong: 0, nextReview: '2026-03-05' },
};

describe('dailySession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a session with 5 unique ids', () => {
    const session = createDailySession(baseWords, historyForBuckets, todayKey, {
      rng: () => 0.37,
    });

    expect(session.ids).toHaveLength(5);
    expect(new Set(session.ids).size).toBe(5);
    expect(session.questions).toHaveLength(5);
    session.questions.forEach((question) => {
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options).size).toBe(3);
    });
  });

  it('prioritizes due review -> learning/reinforcing -> new for the daily set', () => {
    const historyForPriority: StudyHistory = {
      r1: { status: 'reinforcing', correctStreak: 3, nextReview: '2026-02-24' },
      r2: { status: 'learning', correctStreak: 0, nextReview: '2026-02-25' },
      c1: { status: 'reinforcing', correctStreak: 3, nextReview: '2026-03-04' },
      x1: { status: 'learning', correctStreak: 1, nextReview: '2026-03-01' },
      x2: { status: 'mastered', correctStreak: 4, nextReview: '2026-03-10' },
    };

    const selected = selectDailyWords(baseWords, historyForPriority, todayKey, {
      rng: () => 0.21,
    });
    const selectedIds = new Set(selected.map((item) => String(item.id)));

    expect(selected).toHaveLength(5);
    expect(selectedIds.has('r1')).toBe(true);
    expect(selectedIds.has('r2')).toBe(true);
    expect(selectedIds.has('c1')).toBe(true);
    expect(selectedIds.has('x1')).toBe(true);
    expect(selectedIds.has('n1') || selectedIds.has('n2')).toBe(true);
    expect(selectedIds.has('x2')).toBe(false);
  });

  it('creates and then recovers the same daily session from storage', () => {
    const storage = makeStorage();
    const first = getOrCreateDailySession(baseWords, historyForBuckets, todayKey, storage, {
      rng: () => 0.15,
    });

    const answered = answerCurrentQuestion(first, first.questions[0].correctMeaning, '2026-02-25T10:00:00Z');
    const progressed = advanceDailySession(answered);
    setJSON(getDailySessionStorageKey(todayKey), progressed, storage);

    const recovered = getOrCreateDailySession(baseWords, historyForBuckets, todayKey, storage, {
      rng: () => 0.99,
    });

    expect(recovered.currentIndex).toBe(1);
    expect(Object.keys(recovered.answers)).toHaveLength(1);
    expect(recovered.questions[0].wordId).toBe(first.questions[0].wordId);

    const raw = getJSON(getDailySessionStorageKey(todayKey), null, storage);
    expect(raw).not.toBeNull();
  });

  it('applies MVP spaced repetition rules on completion', () => {
    const session = createDailySession(baseWords, historyForBuckets, todayKey, {
      rng: () => 0.11,
    });
    const [firstQuestion, secondQuestion] = session.questions;

    const completedSession = {
      ...session,
      completed: true,
      currentIndex: session.questions.length - 1,
      resultApplied: false,
      answers: {
        [firstQuestion.id]: {
          selectedOption: firstQuestion.correctMeaning,
          isCorrect: true,
          answeredAt: '2026-02-25T10:00:00Z',
        },
        [secondQuestion.id]: {
          selectedOption: secondQuestion.options.find(
            (option) => option !== secondQuestion.correctMeaning
          )!,
          isCorrect: false,
          answeredAt: '2026-02-25T10:01:00Z',
        },
      },
    };

    const result = applySessionCompletion(
      completedSession,
      {
        [firstQuestion.wordId]: { status: 'learning', correctStreak: 2, nextReview: '2026-02-25' },
        [secondQuestion.wordId]: { status: 'reinforcing', correctStreak: 3, wrongCount: 1, nextReview: '2026-02-26' },
      },
      { current: 0, lastCompletedDate: null },
      todayKey
    );

    expect(result.history[firstQuestion.wordId]?.status).toBe('reinforcing');
    expect(result.history[firstQuestion.wordId]?.correctStreak).toBe(3);
    expect(result.history[firstQuestion.wordId]?.nextReview).toBe('2026-03-04');

    expect(result.history[secondQuestion.wordId]?.status).toBe('learning');
    expect(result.history[secondQuestion.wordId]?.correctStreak).toBe(0);
    expect(result.history[secondQuestion.wordId]?.nextReview).toBe('2026-02-26');
    expect(result.history[secondQuestion.wordId]?.wrongCount).toBeGreaterThanOrEqual(2);
  });

  describe('streak', () => {
    it('increments when the last completed date was yesterday', () => {
      const result = computeStreakUpdate(
        { current: 4, lastCompletedDate: '2026-02-24' },
        '2026-02-25'
      );

      expect(result.changed).toBe(true);
      expect(result.next.current).toBe(5);
      expect(result.next.lastCompletedDate).toBe('2026-02-25');
    });

    it('resets when there is no continuity', () => {
      const result = computeStreakUpdate(
        { current: 4, lastCompletedDate: '2026-02-20' },
        '2026-02-25'
      );

      expect(result.changed).toBe(true);
      expect(result.next.current).toBe(1);
      expect(result.next.lastCompletedDate).toBe('2026-02-25');
    });

    it('does not change when the same day is already completed', () => {
      const current = { current: 2, lastCompletedDate: '2026-02-25' as const };
      const result = computeStreakUpdate(current, '2026-02-25');

      expect(result.changed).toBe(false);
      expect(result.next).toEqual(current);
    });
  });
});
