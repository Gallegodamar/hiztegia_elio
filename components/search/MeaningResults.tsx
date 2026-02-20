import React from 'react';
import { DictionaryMeaning } from '../../appTypes';
import { isTermReady } from '../../hooks/useSearch';
import { TopicChips } from './TopicChips';
import { HeartIcon } from '../layout/Icons';

const RESULTS_PAGE_SIZE = 10;

type MeaningResultsProps = {
  searchTerm: string;
  isMeaningLoading: boolean;
  meaningRows: DictionaryMeaning[];
  fallbackUrl: string | null;
  meaningPage: number;
  onMeaningPageChange: (page: number) => void;
  isSavedToday: (word: string) => boolean;
  isSavingWord: (word: string) => boolean;
  onSave: (word: string, meaning: string) => void;
  onSearchWord: (word: string) => void;
};

export const MeaningResults: React.FC<MeaningResultsProps> = ({
  searchTerm,
  isMeaningLoading,
  meaningRows,
  fallbackUrl,
  meaningPage,
  onMeaningPageChange,
  isSavedToday,
  isSavingWord,
  onSave,
  onSearchWord,
}) => {
  if (!isTermReady(searchTerm)) {
    return <TopicChips />;
  }
  if (isMeaningLoading) {
    return <p className="status-copy">Esanahiak bilatzen...</p>;
  }
  if (meaningRows.length === 0) {
    return (
      <article className="surface-card surface-card--muted p-4 md:p-5">
        <p className="status-copy">Ez da tokiko hiztegian esanahirik aurkitu.</p>
        {fallbackUrl ? (
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="dictionary-flyout__link mt-3">
            Ireki Elhuyar-en
          </a>
        ) : null}
      </article>
    );
  }

  const totalPages = Math.max(1, Math.ceil(meaningRows.length / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(meaningPage, 1), totalPages);
  const pageStart = (safePage - 1) * RESULTS_PAGE_SIZE;
  const visibleRows = meaningRows.slice(pageStart, pageStart + RESULTS_PAGE_SIZE);

  return (
    <div className="space-y-3">
      {totalPages > 1 ? (
        <section className="surface-card surface-card--muted p-3 results-pagination">
          <div className="results-pagination__controls">
            <button
              type="button"
              onClick={() => onMeaningPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aurrekoa
            </button>
            <p className="section-label results-pagination__meta">
              <span>{meaningRows.length} emaitza</span>
              <span>{safePage}/{totalPages}</span>
            </p>
            <button
              type="button"
              onClick={() => onMeaningPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="btn-secondary !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hurrengoa
            </button>
          </div>
        </section>
      ) : (
        <section className="surface-card surface-card--muted p-3">
          <p className="section-label">{meaningRows.length} emaitza</p>
        </section>
      )}

      <section className="grid gap-3">
        {visibleRows.map((row, index) => {
          const savedToday = isSavedToday(row.hitza);
          const saving = isSavingWord(row.hitza);
          const definitionParagraphs =
            row.definizioak.length > 0
              ? row.definizioak
              : row.esanahia.trim()
                ? [row.esanahia.trim()]
                : [];
          return (
            <article key={`${row.hitza}-${index}`} className="surface-card word-result-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="word-title">{row.hitza}</h3>
                  {row.sinonimoak.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.sinonimoak.map((synonym, synonymIndex) => (
                        <button
                          key={`${row.hitza}-${synonym}-${synonymIndex}`}
                          type="button"
                          onClick={() => onSearchWord(synonym)}
                          className="term-chip"
                          title={`"${synonym}" bilatu`}
                        >
                          {synonym}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSave(
                      row.hitza,
                      definitionParagraphs.length > 0
                        ? definitionParagraphs.join('\n\n')
                        : row.esanahia
                    )
                  }
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
              {definitionParagraphs.map((definition, definitionIndex) => (
                <p
                  key={`${row.hitza}-definition-${definitionIndex}`}
                  className={`meaning-copy ${definitionIndex === 0 ? 'mt-3' : 'mt-2'}`}
                >
                  {definition}
                </p>
              ))}
            </article>
          );
        })}
      </section>
    </div>
  );
};
