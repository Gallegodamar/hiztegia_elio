import React, { useEffect, useState } from 'react';
import {
  DailyWord,
  DailyMeaning,
  fetchDailyWord,
  fetchDailyMeaning,
  lookupDictionaryMeaning,
} from '../../lib/supabaseRepo';
import { HeartIcon } from '../layout/Icons';

type DailyWordCardProps = {
  mode: 'meaning' | 'synonyms';
  isSavedToday?: (word: string) => boolean;
  isSavingWord?: (word: string) => boolean;
  onSaveSynonym?: (word: string, synonyms: string[]) => Promise<void> | void;
};

export const DailyWordCard: React.FC<DailyWordCardProps> = ({
  mode,
  isSavedToday,
  isSavingWord,
  onSaveSynonym,
}) => {
  const [synonym, setSynonym] = useState<DailyWord | null>(null);
  const [meaning, setMeaning] = useState<DailyMeaning | null>(null);
  const [synonymMeaning, setSynonymMeaning] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadDailyCard = async () => {
      if (mode === 'synonyms') {
        setMeaning(null);
        setSynonymMeaning(null);
        try {
          const dailySynonym = await fetchDailyWord();
          if (!isActive) return;
          setSynonym(dailySynonym);
          if (!dailySynonym) return;

          try {
            const dictionaryEntry = await lookupDictionaryMeaning(dailySynonym.hitza);
            if (!isActive) return;
            const cleanedMeaning = dictionaryEntry?.esanahia?.trim() ?? '';
            setSynonymMeaning(cleanedMeaning.length > 0 ? cleanedMeaning : null);
          } catch {
            if (isActive) setSynonymMeaning(null);
          }
        } catch {
          if (!isActive) return;
          setSynonym(null);
          setSynonymMeaning(null);
        }
        return;
      }

      setSynonym(null);
      setSynonymMeaning(null);
      try {
        const dailyMeaning = await fetchDailyMeaning();
        if (!isActive) return;
        setMeaning(dailyMeaning);
      } catch {
        if (isActive) setMeaning(null);
      }
    };

    void loadDailyCard();
    return () => {
      isActive = false;
    };
  }, [mode]);

  const hitza = mode === 'synonyms' ? synonym?.hitza : meaning?.hitza;
  const synonymValues = synonym?.sinonimoak ?? [];
  const synonymSubtitle = synonymMeaning ?? 'Antzeko hitzak...';
  const canSaveSynonym = mode === 'synonyms' && !!synonym && !!onSaveSynonym;
  const savedToday =
    canSaveSynonym && synonym ? (isSavedToday?.(synonym.hitza) ?? false) : false;
  const savingToday =
    canSaveSynonym && synonym ? (isSavingWord?.(synonym.hitza) ?? false) : false;

  const handleSaveSynonym = () => {
    if (!synonym || !onSaveSynonym) return;
    void onSaveSynonym(synonym.hitza, synonym.sinonimoak);
  };

  if (!hitza) return null;

  if (mode === 'synonyms') {
    return (
      <div style={{ width: '100%', paddingTop: '0.35rem' }}>
        <article className="daily-feature-card">
          <div className="daily-feature-card__row">
            <div className="daily-feature-card__body">
              <p className="daily-feature-card__kicker">Gaurko sinonimoa</p>
              <p className="daily-feature-card__title font-display">{hitza}</p>
              <p className="daily-feature-card__copy">{synonymSubtitle}</p>

              {synonym && synonymValues.length > 0 ? (
                <div className="daily-feature-card__meta">
                  {synonymValues.map((value) => (
                    <span
                      key={value}
                      className="term-chip term-chip--static daily-feature-card__chip"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {canSaveSynonym ? (
              <button
                type="button"
                onClick={handleSaveSynonym}
                disabled={savedToday || savingToday}
                aria-label={savedToday ? 'Gaur gordeta' : 'Gogokoetara'}
                title={savedToday ? 'Gaur gordeta' : 'Gogokoetara'}
                className={`daily-feature-card__favorite ${savedToday ? 'daily-feature-card__favorite--active' : ''}`}
                style={{ opacity: savingToday ? 0.5 : 1 }}
              >
                <HeartIcon
                  filled={savedToday}
                  className={`bottom-taskbar__icon ${savedToday ? 'bottom-taskbar__icon--favorites' : ''}`}
                />
              </button>
            ) : null}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', paddingTop: '0.8rem' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          margin: '0 auto',
          borderRadius: '1.2rem',
          border: '1.5px solid rgba(78, 205, 224, 0.35)',
          background: 'linear-gradient(155deg, rgba(237, 250, 252, 0.95), rgba(221, 244, 249, 0.94))',
          padding: '1.2rem 1.3rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '0.67rem',
            fontWeight: 800,
            color: '#1d758f',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 0.5rem',
          }}
        >
          Gaurko esanahia
        </p>
        <p
          className="font-display"
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--ink-0)',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}
        >
          {hitza}
        </p>
        {meaning ? (
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--muted-0)',
              margin: '0.5rem 0 0',
              lineHeight: 1.45,
            }}
          >
            {meaning.esanahia}
          </p>
        ) : null}
      </div>
    </div>
  );
};
