import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FavoriteWord, normalizeFavoriteWordKey } from '../../lib/userFavorites';

type SwipeDirection = 'left' | 'right';

type FavoritesStudyDeckProps = {
  entries: FavoriteWord[];
  username: string;
  onClose: () => void;
};

type DragState = {
  x: number;
  isDragging: boolean;
};

type StudyWordMemory = {
  dueAt: number;
  intervalMs: number;
  factor: number;
  knownCount: number;
  againCount: number;
  lastReviewedAt: number;
};

type StudyMemoryMap = Record<string, StudyWordMemory>;

type SessionStats = {
  known: number;
  again: number;
};

const STORAGE_KEY_PREFIX = 'hiztegia:favorites-study:v1:';
const SWIPE_THRESHOLD_PX = 90;
const TAP_FLIP_THRESHOLD_PX = 14;
const SWIPE_EXIT_DISTANCE_PX = 640;
const SWIPE_ANIMATION_MS = 200;
const BATCH_SIZE = 10;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const toStudyKey = (word: string): string => normalizeFavoriteWordKey(word);

const mergeEntriesByWord = (entries: FavoriteWord[]): FavoriteWord[] => {
  const byKey = new Map<string, FavoriteWord>();

  const sorted = [...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  sorted.forEach((entry) => {
    const key = toStudyKey(entry.word);
    if (!key) return;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...entry,
        synonyms: Array.from(new Set(entry.synonyms.map((value) => value.trim()).filter(Boolean))),
      });
      return;
    }

    const mergedSynonyms = Array.from(
      new Set([...existing.synonyms, ...entry.synonyms].map((value) => value.trim()).filter(Boolean))
    );
    const meaning = existing.meaning?.trim() || entry.meaning?.trim() || null;
    const mode =
      existing.mode === 'meaning' || entry.mode === 'meaning'
        ? meaning
          ? 'meaning'
          : existing.mode
        : existing.mode;

    byKey.set(key, {
      ...existing,
      meaning,
      synonyms: mergedSynonyms,
      mode,
      savedAt: existing.savedAt >= entry.savedAt ? existing.savedAt : entry.savedAt,
    });
  });

  return Array.from(byKey.values());
};

const readStudyMemory = (username: string): StudyMemoryMap => {
  if (typeof window === 'undefined') return {};
  const storageKey = `${STORAGE_KEY_PREFIX}${username.trim().toLowerCase()}`;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<StudyWordMemory>>;
    if (!parsed || typeof parsed !== 'object') return {};

    const next: StudyMemoryMap = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') return;
      const dueAt = Number(value.dueAt);
      const intervalMs = Number(value.intervalMs);
      const factor = Number(value.factor);
      const knownCount = Number(value.knownCount);
      const againCount = Number(value.againCount);
      const lastReviewedAt = Number(value.lastReviewedAt);

      next[key] = {
        dueAt: Number.isFinite(dueAt) ? dueAt : 0,
        intervalMs: Number.isFinite(intervalMs) ? intervalMs : 0,
        factor: Number.isFinite(factor) ? clamp(factor, 1.25, 3.5) : 1.7,
        knownCount: Number.isFinite(knownCount) ? Math.max(0, Math.round(knownCount)) : 0,
        againCount: Number.isFinite(againCount) ? Math.max(0, Math.round(againCount)) : 0,
        lastReviewedAt: Number.isFinite(lastReviewedAt) ? lastReviewedAt : 0,
      };
    });

    return next;
  } catch {
    return {};
  }
};

const writeStudyMemory = (username: string, memory: StudyMemoryMap): void => {
  if (typeof window === 'undefined') return;
  const storageKey = `${STORAGE_KEY_PREFIX}${username.trim().toLowerCase()}`;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(memory));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
};

const getEntryMemory = (memory: StudyMemoryMap, entry: FavoriteWord): StudyWordMemory | null =>
  memory[toStudyKey(entry.word)] ?? null;

const isDue = (memory: StudyMemoryMap, entry: FavoriteWord, now: number): boolean => {
  const row = getEntryMemory(memory, entry);
  if (!row) return true;
  return row.dueAt <= now;
};

const getDueCount = (entries: FavoriteWord[], memory: StudyMemoryMap, now: number): number =>
  entries.reduce((total, entry) => total + (isDue(memory, entry, now) ? 1 : 0), 0);

const getNextDueAt = (entries: FavoriteWord[], memory: StudyMemoryMap, now: number): number | null => {
  let next: number | null = null;
  entries.forEach((entry) => {
    const row = getEntryMemory(memory, entry);
    if (!row) return;
    if (row.dueAt <= now) return;
    next = next === null ? row.dueAt : Math.min(next, row.dueAt);
  });
  return next;
};

const buildDueBatch = (entries: FavoriteWord[], memory: StudyMemoryMap, now: number): FavoriteWord[] => {
  const dueEntries = entries.filter((entry) => isDue(memory, entry, now));
  return shuffle(dueEntries).slice(0, BATCH_SIZE);
};

const applyReview = (
  memory: StudyMemoryMap,
  entry: FavoriteWord,
  direction: SwipeDirection,
  now: number
): StudyMemoryMap => {
  const key = toStudyKey(entry.word);
  if (!key) return memory;

  const current = memory[key] ?? {
    dueAt: 0,
    intervalMs: 0,
    factor: 1.7,
    knownCount: 0,
    againCount: 0,
    lastReviewedAt: 0,
  };

  let next: StudyWordMemory;

  if (direction === 'right') {
    const nextFactor = clamp(current.factor + 0.12, 1.3, 3.4);
    const baseInterval =
      current.intervalMs > 0
        ? current.intervalMs
        : 12 * 60 * 60 * 1000; // 12 ordu lehen aldian
    const nextInterval = clamp(Math.round(baseInterval * nextFactor), 60 * 60 * 1000, 120 * 24 * 60 * 60 * 1000);

    next = {
      dueAt: now + nextInterval,
      intervalMs: nextInterval,
      factor: nextFactor,
      knownCount: current.knownCount + 1,
      againCount: current.againCount,
      lastReviewedAt: now,
    };
  } else {
    const nextFactor = clamp(current.factor - 0.16, 1.25, 3.4);
    next = {
      dueAt: now,
      intervalMs: 0,
      factor: nextFactor,
      knownCount: current.knownCount,
      againCount: current.againCount + 1,
      lastReviewedAt: now,
    };
  }

  return {
    ...memory,
    [key]: next,
  };
};

const modeLabelByKey: Record<FavoriteWord['mode'], string> = {
  meaning: 'Esanahia',
  synonyms: 'Sinonimoak',
};

const buildPrimaryAnswer = (entry: FavoriteWord): string | null => {
  if (entry.mode === 'meaning' && entry.meaning) return entry.meaning;
  if (entry.mode === 'synonyms' && entry.synonyms.length > 0) return entry.synonyms.join(', ');
  if (entry.meaning) return entry.meaning;
  if (entry.synonyms.length > 0) return entry.synonyms.join(', ');
  return null;
};

const formatDelayEu = (ms: number): string => {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  if (minutes <= 1) return 'minutu 1 barru';
  if (minutes < 60) return `${minutes} minutu barru`;

  const hours = Math.ceil(minutes / 60);
  if (hours === 1) return 'ordu 1 barru';
  if (hours < 24) return `${hours} ordu barru`;

  const days = Math.ceil(hours / 24);
  if (days === 1) return 'egun 1 barru';
  return `${days} egun barru`;
};

export const FavoritesStudyDeck: React.FC<FavoritesStudyDeckProps> = ({
  entries,
  username,
  onClose,
}) => {
  const uniqueEntries = useMemo(() => mergeEntriesByWord(entries), [entries]);

  const [memory, setMemory] = useState<StudyMemoryMap>(() => readStudyMemory(username));
  const [batchEntries, setBatchEntries] = useState<FavoriteWord[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchNumber, setBatchNumber] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [drag, setDrag] = useState<DragState>({ x: 0, isDragging: false });
  const [swipeOut, setSwipeOut] = useState<SwipeDirection | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ known: 0, again: 0 });

  const pointerRef = useRef<{ id: number; startX: number } | null>(null);
  const swipeTimeoutRef = useRef<number | null>(null);
  const memoryRef = useRef<StudyMemoryMap>(memory);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const resetBatchUi = () => {
    if (swipeTimeoutRef.current !== null) {
      window.clearTimeout(swipeTimeoutRef.current);
      swipeTimeoutRef.current = null;
    }
    pointerRef.current = null;
    setBatchIndex(0);
    setRevealed(false);
    setDrag({ x: 0, isDragging: false });
    setSwipeOut(null);
  };

  const startBatch = (sourceMemory: StudyMemoryMap, nextBatchNumber: number) => {
    const nextBatch = buildDueBatch(uniqueEntries, sourceMemory, Date.now());
    setBatchEntries(nextBatch);
    setBatchNumber(nextBatchNumber);
    resetBatchUi();
  };

  useEffect(() => {
    const loaded = readStudyMemory(username);
    memoryRef.current = loaded;
    setMemory(loaded);
    setSessionStats({ known: 0, again: 0 });
    startBatch(loaded, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, uniqueEntries]);

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current !== null) {
        window.clearTimeout(swipeTimeoutRef.current);
      }
    };
  }, []);

  const now = Date.now();
  const dueCount = useMemo(() => getDueCount(uniqueEntries, memory, now), [memory, now, uniqueEntries]);
  const nextDueAt = useMemo(() => getNextDueAt(uniqueEntries, memory, now), [memory, now, uniqueEntries]);

  const activeEntry = batchEntries[batchIndex] ?? null;
  const upcomingEntries = batchEntries.slice(batchIndex + 1, batchIndex + 3);
  const batchCompleted = batchEntries.length > 0 && batchIndex >= batchEntries.length;
  const batchProgress = batchEntries.length > 0 ? Math.round((batchIndex / batchEntries.length) * 100) : 0;

  const reviewCounts = useMemo(
    () =>
      uniqueEntries.reduce(
        (acc, entry) => {
          const row = getEntryMemory(memory, entry);
          if (!row) return acc;
          acc.known += row.knownCount;
          acc.again += row.againCount;
          return acc;
        },
        { known: 0, again: 0 }
      ),
    [memory, uniqueEntries]
  );

  const answerText = activeEntry ? buildPrimaryAnswer(activeEntry) : null;

  const finishSwipeAdvance = () => {
    setBatchIndex((prev) => prev + 1);
    setRevealed(false);
    setDrag({ x: 0, isDragging: false });
    setSwipeOut(null);
    pointerRef.current = null;
    swipeTimeoutRef.current = null;
  };

  const commitSwipe = (direction: SwipeDirection) => {
    if (!activeEntry || swipeOut) return;

    const updatedMemory = applyReview(memoryRef.current, activeEntry, direction, Date.now());
    memoryRef.current = updatedMemory;
    setMemory(updatedMemory);
    writeStudyMemory(username, updatedMemory);
    setSessionStats((prev) => ({
      known: prev.known + (direction === 'right' ? 1 : 0),
      again: prev.again + (direction === 'left' ? 1 : 0),
    }));

    setSwipeOut(direction);
    setDrag((prev) => ({ ...prev, isDragging: false }));

    swipeTimeoutRef.current = window.setTimeout(finishSwipeAdvance, SWIPE_ANIMATION_MS);
  };

  const handleCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeEntry || swipeOut) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: 0, isDragging: true });
  };

  const handleCardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId || !drag.isDragging || swipeOut) return;
    setDrag({
      x: event.clientX - pointer.startX,
      isDragging: true,
    });
  };

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current?.id === event.pointerId) {
      pointerRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCardPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.isDragging || swipeOut) {
      releasePointer(event);
      return;
    }

    const offsetX = drag.x;
    releasePointer(event);

    if (Math.abs(offsetX) >= SWIPE_THRESHOLD_PX) {
      commitSwipe(offsetX > 0 ? 'right' : 'left');
      return;
    }

    if (Math.abs(offsetX) <= TAP_FLIP_THRESHOLD_PX) {
      setRevealed((prev) => !prev);
    }

    setDrag({ x: 0, isDragging: false });
  };

  const handleCardPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(event);
    setDrag({ x: 0, isDragging: false });
  };

  const cardTransform = (() => {
    if (swipeOut === 'left') return `translate3d(-${SWIPE_EXIT_DISTANCE_PX}px, 0, 0) rotate(-16deg)`;
    if (swipeOut === 'right') return `translate3d(${SWIPE_EXIT_DISTANCE_PX}px, 0, 0) rotate(16deg)`;
    return `translate3d(${drag.x}px, 0, 0) rotate(${drag.x / 18}deg)`;
  })();

  const helperHint =
    drag.x > 18
      ? 'Eskuinera: badakit'
      : drag.x < -18
        ? 'Ezkerrera: berrikusi'
        : revealed
          ? 'Irristatu baloratzeko edo sakatu berriz'
          : 'Sakatu txartela iraulitzeko';

  const openNextBatch = () => {
    startBatch(memoryRef.current, batchNumber + 1);
  };

  const progressLabel =
    batchEntries.length > 0 && activeEntry
      ? `${batchIndex + 1}/${batchEntries.length}`
      : `${batchEntries.length}/${batchEntries.length}`;

  return (
    <div className="favorites-study-overlay" role="dialog" aria-modal="true" aria-label="Gogokoen ikasketa modua">
      <section className="favorites-study">
        <div className="favorites-study__top">
          <div>
            <p className="section-label favorites-study__kicker">Ikasketa modua</p>
            <h3 className="favorites-study__title">Gogoko guztiak · 10eko ausazko sortak</h3>
            <p className="helper-note !m-0">
              {uniqueEntries.length} hitz guztira · {dueCount} berrikusteko orain
            </p>
          </div>
          <button type="button" onClick={onClose} className="action-pill action-pill--neutral">
            Zerrendara itzuli
          </button>
        </div>

        <div className="favorites-study__meta">
          <div className="favorites-study__meta-row">
            <p className="helper-note !m-0">
              Sorta {batchNumber} · Saio honetan: {sessionStats.known} badakit / {sessionStats.again} berrikusi
            </p>
            <p className="helper-note !m-0">
              Historiala: {reviewCounts.known} badakit / {reviewCounts.again} berrikusi
            </p>
          </div>
          <div className="favorites-study__progress" aria-hidden="true">
            <div className="favorites-study__progress-bar" style={{ width: `${batchProgress}%` }} />
          </div>
        </div>

        {uniqueEntries.length === 0 ? (
          <div className="favorites-study__empty">
            <p className="status-copy">Ez dago gogokorik ikasteko.</p>
          </div>
        ) : batchEntries.length === 0 ? (
          <div className="favorites-study__summary">
            <p className="favorites-study__summary-title">Une honetan ez dago hitz berrikustekorik</p>
            <p className="helper-note !m-0">
              "Badakit" markatutako hitzak denboran zehar gero eta beranduago agertuko dira.
            </p>
            {nextDueAt ? (
              <p className="favorites-study__summary-note">
                Hurrengo berrikuspena: {formatDelayEu(Math.max(nextDueAt - Date.now(), 0))}
              </p>
            ) : null}
            <div className="favorites-study__summary-actions">
              <button
                type="button"
                onClick={openNextBatch}
                className="action-pill action-pill--accent"
              >
                Berriro kalkulatu
              </button>
            </div>
          </div>
        ) : batchCompleted ? (
          <div className="favorites-study__summary">
            <p className="favorites-study__summary-title">
              {batchEntries.length}eko sorta amaituta
            </p>
            <p className="helper-note !m-0">
              {sessionStats.known} "badakit" · {sessionStats.again} "berrikusi"
            </p>
            <div className="favorites-study__summary-actions">
              <button
                type="button"
                onClick={openNextBatch}
                className="action-pill action-pill--accent"
              >
                Hurrengo ausazko sorta
              </button>
            </div>
          </div>
        ) : activeEntry ? (
          <>
            <div className="favorites-study__deck">
              <div className="favorites-study__deck-frame">
                {upcomingEntries
                  .slice()
                  .reverse()
                  .map((entry, reverseIndex) => {
                    const stackIndex = upcomingEntries.length - reverseIndex;
                    return (
                      <div
                        key={`stack-${entry.id}`}
                        className="favorites-study__stack-card"
                        style={{
                          transform: `translateY(${stackIndex * 10}px) scale(${1 - stackIndex * 0.02})`,
                        }}
                        aria-hidden="true"
                      />
                    );
                  })}

                <div
                  className={`favorites-study__card ${
                    drag.isDragging ? 'favorites-study__card--dragging' : ''
                  } ${swipeOut ? `favorites-study__card--swiping-${swipeOut}` : ''}`}
                  style={{ transform: cardTransform }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={revealed}
                  aria-label={
                    revealed
                      ? 'Txartela aurkialdera itzuli'
                      : 'Txartela irauli eta erantzuna erakutsi'
                  }
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setRevealed((prev) => !prev);
                  }}
                  onPointerDown={handleCardPointerDown}
                  onPointerMove={handleCardPointerMove}
                  onPointerUp={handleCardPointerUp}
                  onPointerCancel={handleCardPointerCancel}
                >
                  <div className="favorites-study__badge-row">
                    <span className="term-chip term-chip--static">
                      {modeLabelByKey[activeEntry.mode]}
                    </span>
                    <span className="favorites-study__count">{progressLabel}</span>
                  </div>

                  <div className="favorites-study__card-body">
                    <div className="favorites-study__flip-stage">
                      <div
                        className={`favorites-study__flip ${
                          revealed ? 'favorites-study__flip--revealed' : ''
                        }`}
                        aria-hidden="true"
                      >
                        <div className="favorites-study__face favorites-study__face--front">
                          <div className="favorites-study__face-head">
                            <p className="favorites-study__prompt">
                              Pentsatu hitz honen esanahia edo sinonimoak
                            </p>
                          </div>
                          <div className="favorites-study__face-center">
                            <h4 className="favorites-study__word">{activeEntry.word}</h4>
                            <p className="favorites-study__hidden-answer">
                              Sakatu txartela erantzuna ikusteko
                            </p>
                          </div>
                        </div>

                        <div className="favorites-study__face favorites-study__face--back">
                          <div className="favorites-study__face-head">
                            <p className="favorites-study__prompt">Erantzuna</p>
                          </div>
                          <div className="favorites-study__face-center favorites-study__face-center--answer">
                            <div className="favorites-study__answer">
                              {answerText ? (
                                <p className="favorites-study__answer-main">{answerText}</p>
                              ) : (
                                <p className="favorites-study__answer-main favorites-study__answer-main--muted">
                                  Ez dago erantzunik gordeta hitz honentzat.
                                </p>
                              )}

                              {activeEntry.meaning && activeEntry.mode !== 'meaning' ? (
                                <p className="favorites-study__answer-sub">
                                  <strong>Esanahia:</strong> {activeEntry.meaning}
                                </p>
                              ) : null}

                              {activeEntry.synonyms.length > 0 && activeEntry.mode !== 'synonyms' ? (
                                <p className="favorites-study__answer-sub">
                                  <strong>Sinonimoak:</strong> {activeEntry.synonyms.join(', ')}
                                </p>
                              ) : null}
                            </div>
                            <p className="favorites-study__hidden-answer favorites-study__hidden-answer--soft">
                              Sakatu berriz txartela aurkialdera itzultzeko
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="favorites-study__swipe-hint">
                    <span className="favorites-study__swipe-hint-left">Ezkerrera: berrikusi</span>
                    <span className="favorites-study__swipe-hint-center">{helperHint}</span>
                    <span className="favorites-study__swipe-hint-right">Eskuinera: badakit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="favorites-study__actions">
              <button
                type="button"
                onClick={() => setRevealed((prev) => !prev)}
                className="action-pill action-pill--neutral"
              >
                {revealed ? 'Txartela aurkialdera' : 'Txartela irauli'}
              </button>

              <div className="favorites-study__decision-group">
                <button
                  type="button"
                  onClick={() => commitSwipe('left')}
                  className="favorites-study__decision favorites-study__decision--left"
                >
                  Berrikusi
                </button>
                <button
                  type="button"
                  onClick={() => commitSwipe('right')}
                  className="favorites-study__decision favorites-study__decision--right"
                >
                  Badakit
                </button>
              </div>
            </div>

            <p className="favorites-study__remaining">
              Sorta honetan falta dira: {Math.max(batchEntries.length - (batchIndex + 1), 0)}
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
};
