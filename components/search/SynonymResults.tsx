import React from 'react';
import { SearchResultItem } from '../../appTypes';
import { isTermReady } from '../../hooks/useSearch';

const RESULTS_PAGE_SIZE = 10;

const accentActionClass = (isDisabled: boolean): string =>
  `action-pill ${isDisabled ? 'action-pill--disabled' : 'action-pill--accent'}`;

type SynonymResultsProps = {
  searchTerm: string;
  isSearching: boolean;
  rows: SearchResultItem[];
  synonymPage: number;
  onSynonymPageChange: (page: number) => void;
  isSavedToday: (word: string) => boolean;
  isSavingWord: (word: string) => boolean;
  onSave: (row: SearchResultItem) => void;
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
  onOpenMeaning,
  onSearchWord,
}) => {
  if (!isTermReady(searchTerm)) {
    return <p className="status-copy">Idazten hasi bilatzeko.</p>;
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
                  className={accentActionClass(savedToday || saving)}
                >
                  {savedToday ? 'Gaur gordeta' : saving ? 'Gordetzen...' : 'Gogokoetara'}
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
