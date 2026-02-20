import React from 'react';
import { SearchResultItem } from '../../appTypes';
import { isTermReady } from '../../hooks/useSearch';
import { DailyWordCard } from './DailyWordCard';
import { HeartIcon } from '../layout/Icons';

const RESULTS_PAGE_SIZE = 10;

type SynonymResultsProps = {
  searchTerm: string;
  isSearching: boolean;
  rows: SearchResultItem[];
  synonymPage: number;
  onSynonymPageChange: (page: number) => void;
  isSavedToday: (word: string) => boolean;
  isSavingWord: (word: string) => boolean;
  onSave: (row: SearchResultItem) => void;
  onSaveDailySynonym: (word: string, synonyms: string[]) => Promise<void> | void;
  onOpenMeaning: (term: string, anchorEl: HTMLElement) => void;
  onSearchWord: (word: string) => void;
};

export const SynonymResults: React.FC<SynonymResultsProps> = ({
  searchTerm,
  isSearching,
  rows,
  synonymPage,
  onSynonymPageChange,
  isSavedToday,
  isSavingWord,
  onSave,
  onSaveDailySynonym,
  onOpenMeaning,
  onSearchWord,
}) => {
  if (!isTermReady(searchTerm)) {
    return (
      <DailyWordCard
        mode="synonyms"
        isSavedToday={isSavedToday}
        isSavingWord={isSavingWord}
        onSaveSynonym={onSaveDailySynonym}
      />
    );
  }
  if (isSearching) {
    return <p className="status-copy">Sinonimoak bilatzen...</p>;
  }
  if (rows.length === 0) {
    return <p className="status-copy">Ez da emaitzarik aurkitu.</p>;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(synonymPage, 1), totalPages);
  const pageStart = (safePage - 1) * RESULTS_PAGE_SIZE;
  const visibleRows = rows.slice(pageStart, pageStart + RESULTS_PAGE_SIZE);

  return (
    <div className="space-y-3">
      {totalPages > 1 ? (
        <section className="surface-card surface-card--muted p-3 results-pagination">
          <div className="results-pagination__controls">
            <button
              type="button"
              onClick={() => onSynonymPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aurrekoa
            </button>
            <p className="section-label results-pagination__meta">
              <span>{rows.length} emaitza</span>
              <span>{safePage}/{totalPages}</span>
            </p>
            <button
              type="button"
              onClick={() => onSynonymPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hurrengoa
            </button>
          </div>
        </section>
      ) : (
        <section className="surface-card surface-card--muted p-3">
          <p className="section-label">{rows.length} emaitza</p>
        </section>
      )}

      <section className="grid gap-3">
        {visibleRows.map((row, index) => {
          const savedToday = isSavedToday(row.hitza);
          const saving = isSavingWord(row.hitza);
          return (
            <article key={`${row.id}-${index}`} className="surface-card word-result-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={(e) => onOpenMeaning(row.hitza, e.currentTarget)}
                    className="word-link"
                    title="Esanahia ikusi"
                  >
                    {row.hitza}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onSave(row)}
                  disabled={savedToday || saving}
                  aria-label={savedToday ? 'Gaur gordeta' : 'Gogokoetara'}
                  title={savedToday ? 'Gaur gordeta' : 'Gogokoetara'}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    padding: '0.3rem',
                    cursor: savedToday || saving ? 'default' : 'pointer',
                    color: savedToday ? '#ee88a8' : 'var(--muted-1)',
                    opacity: saving ? 0.5 : 1,
                    transition: 'color 0.18s ease, transform 0.18s ease',
                  }}
                >
                  <HeartIcon filled={savedToday} className={`bottom-taskbar__icon ${savedToday ? 'bottom-taskbar__icon--favorites' : ''}`} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.sinonimoak.map((synonym, synonymIndex) => (
                  <button
                    key={`${row.id}-${synonym}-${synonymIndex}`}
                    type="button"
                    onClick={() => onSearchWord(synonym)}
                    className="term-chip"
                    title={`"${synonym}" bilatu`}
                  >
                    {synonym}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
