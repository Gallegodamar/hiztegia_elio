import React, { useEffect, useMemo, useState } from 'react';
import { OrganizerItem } from '../../appTypes';
import {
  addOrganizerFavorite,
  fetchAllOrganizers,
  fetchOrganizerFavoriteIds,
  removeOrganizerFavorite,
} from '../../lib/supabaseRepo';
import { useAppContext } from '../../contexts/AppContext';
import { HeartIcon } from '../layout/Icons';

const normalizeText = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const getText = (item: OrganizerItem, key: string): string | null => {
  const value = item[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type Family = {
  label: string;
  color: string;
  bg: string;
  keys: string[];
};

const FAMILIES: Family[] = [
  {
    label: 'Diskurtsoaren egitura',
    color: '#2563eb',
    bg: '#eff6ff',
    keys: ['hasier', 'jarraipen', 'amaier', 'orden', 'lehent', 'sarrer'],
  },
  {
    label: 'Argumentazioa',
    color: '#c2720d',
    bg: '#fff7ed',
    keys: ['arrazoi', 'baloraz', 'uste', 'iritz', 'egiaztak', 'ziurtas', 'probabilit', 'kontrajar'],
  },
  {
    label: 'Testu-kohesioa',
    color: '#15803d',
    bg: '#f0fdf4',
    keys: ['anafor', 'katafor', 'aipamen', 'erreferent'],
  },
  {
    label: 'Elaborazioa',
    color: '#7c3aed',
    bg: '#faf5ff',
    keys: ['adibid', 'ondorio', 'ideia berr', 'indartzea', 'zehaztapen', 'azalpena'],
  },
  {
    label: 'Testuingurua',
    color: '#0e7490',
    bg: '#ecfeff',
    keys: ['denbora', 'lekua', 'beharrizan', 'baldintz'],
  },
];

const FALLBACK_FAMILY: Family = {
  label: 'Bestelakoak',
  color: '#6b7280',
  bg: '#f9fafb',
  keys: [],
};

const getFamilyIndex = (mota: string): number => {
  const normalized = normalizeText(mota);
  const matchIndex = FAMILIES.findIndex((family) =>
    family.keys.some((key) => normalized.includes(key))
  );
  return matchIndex >= 0 ? matchIndex : FAMILIES.length;
};

const getFamilyForMota = (mota: string): Family =>
  FAMILIES[getFamilyIndex(mota)] ?? FALLBACK_FAMILY;

const getDailyItem = (items: OrganizerItem[]): OrganizerItem | null => {
  if (items.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return items[day % items.length] ?? null;
};

const DailyCard: React.FC<{
  item: OrganizerItem;
  isFavorite: boolean;
  isPending: boolean;
  onToggleFavorite: () => void;
}> = ({ item, isFavorite, isPending, onToggleFavorite }) => {
  const antolatzaileak = getText(item, 'antolatzaileak');
  const esanahia = getText(item, 'esanahia');
  const mota = getText(item, 'mota');
  if (!antolatzaileak) return null;

  return (
    <article className="daily-feature-card">
      <div className="daily-feature-card__row">
        <div className="daily-feature-card__body">
          <p className="daily-feature-card__kicker">Gaurko antolatzailea</p>
          <p className="daily-feature-card__title font-display">{antolatzaileak}</p>
          {esanahia ? (
            <p className="daily-feature-card__copy">{esanahia}</p>
          ) : null}
          {mota ? (
            <div className="daily-feature-card__meta">
              <span className="term-chip term-chip--static daily-feature-card__chip">{mota}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={isPending}
          aria-label={isFavorite ? 'Gogokoetatik kendu' : 'Gogokoa gehitu'}
          className={`daily-feature-card__favorite ${isFavorite ? 'daily-feature-card__favorite--active' : ''}`}
          style={{ opacity: isPending ? 0.55 : 1 }}
        >
          <HeartIcon filled={isFavorite} />
        </button>
      </div>
    </article>
  );
};

const OrganizerCard: React.FC<{
  item: OrganizerItem;
  isFavorite: boolean;
  isPending: boolean;
  onToggleFavorite: () => void;
}> = ({ item, isFavorite, isPending, onToggleFavorite }) => {
  const antolatzaileak = getText(item, 'antolatzaileak');
  const esanahia = getText(item, 'esanahia');
  const mota = getText(item, 'mota');
  if (!antolatzaileak) return null;

  const family = mota ? getFamilyForMota(mota) : FALLBACK_FAMILY;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '0.75rem',
        border: '1.5px solid var(--border-soft)',
        borderLeft: `3px solid ${family.color}`,
        background: 'var(--surface-0)',
        padding: '0.6rem 2.8rem 0.6rem 0.85rem',
      }}
    >
      <button
        type="button"
        onClick={onToggleFavorite}
        disabled={isPending}
        aria-label={isFavorite ? 'Gogokoetatik kendu' : 'Gogokoa gehitu'}
        style={{
          position: 'absolute',
          top: '0.45rem',
          right: '0.5rem',
          background: 'none',
          border: 'none',
          padding: '0.3rem',
          cursor: isPending ? 'default' : 'pointer',
          color: isFavorite ? '#ee88a8' : 'var(--muted-1)',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          opacity: isPending ? 0.55 : 1,
        }}
      >
        <HeartIcon filled={isFavorite} />
      </button>
      <p style={{ fontWeight: 700, color: 'var(--ink-0)', margin: 0, lineHeight: 1.3, fontSize: '0.95rem' }}>
        {antolatzaileak}
      </p>
      {esanahia ? (
        <p style={{ color: 'var(--muted-0)', fontSize: '0.85rem', margin: '0.18rem 0 0', lineHeight: 1.4 }}>
          {esanahia}
        </p>
      ) : null}
    </div>
  );
};

export const OrganizersPanel: React.FC = () => {
  const { username, showNotice } = useAppContext();
  const [allItems, setAllItems] = useState<OrganizerItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [rows, favIds] = await Promise.all([
          fetchAllOrganizers(),
          fetchOrganizerFavoriteIds(username),
        ]);
        if (!active) return;
        setAllItems(rows);
        setFavoriteIds(favIds);
      } catch {
        if (!active) return;
        setLoadError('Ezin izan dira antolatzaileak kargatu.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [username]);

  const familyGroups = useMemo(() => {
    const categories = new Map<string, number>();
    allItems.forEach((item) => {
      const mota = getText(item, 'mota');
      if (!mota || categories.has(mota)) return;
      categories.set(mota, getFamilyIndex(mota));
    });

    const groups: Array<{ family: Family; cats: string[] }> = FAMILIES.map((family) => ({
      family,
      cats: [],
    }));
    const others: string[] = [];

    categories.forEach((index, category) => {
      if (index < FAMILIES.length) groups[index].cats.push(category);
      else others.push(category);
    });

    if (others.length > 0) groups.push({ family: FALLBACK_FAMILY, cats: others });

    return groups
      .filter((group) => group.cats.length > 0)
      .map((group) => ({
        ...group,
        cats: group.cats.sort((a, b) => a.localeCompare(b, 'eu')),
      }));
  }, [allItems]);

  const dailyItem = useMemo(() => getDailyItem(allItems), [allItems]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (showFavoritesOnly) {
      items = items.filter((item) => favoriteIds.has(String(item.id ?? '')));
    }
    if (selectedCategory) {
      items = items.filter((item) => getText(item, 'mota') === selectedCategory);
    }

    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) return items;

    return items.filter((item) =>
      Object.values(item).some(
        (value) => typeof value === 'string' && normalizeText(value).includes(normalizedTerm)
      )
    );
  }, [allItems, favoriteIds, selectedCategory, showFavoritesOnly, term]);

  const isFiltered = selectedCategory !== null || showFavoritesOnly || term.trim().length > 0;

  const toggleFavorite = async (item: OrganizerItem) => {
    const id = String(item.id ?? '');
    if (!id || pendingFavoriteIds.has(id)) return;

    const wasFavorite = favoriteIds.has(id);
    setPendingFavoriteIds((prev) => new Set(prev).add(id));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (wasFavorite) await removeOrganizerFavorite(username, id);
      else await addOrganizerFavorite(username, id);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(id);
        else next.delete(id);
        return next;
      });
      showNotice('Ezin izan da aldaketa gorde. Saiatu berriro.');
    } finally {
      setPendingFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          background: 'var(--surface-0)',
          border: '1.5px solid var(--border-soft)',
          borderRadius: '0.9rem',
          padding: '0.6rem 0.9rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          style={{
            width: '1rem',
            height: '1rem',
            flexShrink: 0,
            color: 'var(--muted-1)',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
          }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4.4-4.4" />
        </svg>
        <input
          type="search"
          placeholder="Idatzi hitza edo aukeratu funtzio bat..."
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--ink-0)',
            fontSize: '0.95rem',
          }}
        />
        {term.trim().length > 0 ? (
          <button
            type="button"
            onClick={() => setTerm('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-1)',
              padding: 0,
              lineHeight: 1,
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            x
          </button>
        ) : null}
      </div>

      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
      >
        {isLoading ? <p className="status-copy">Kargatzen...</p> : null}
        {!isLoading && loadError ? <p className="notice notice--error">{loadError}</p> : null}

        {!isLoading && !loadError ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setShowFavoritesOnly((prev) => !prev)}
                style={{
                  padding: '0.28rem 0.75rem',
                  borderRadius: '999px',
                  border: `1.5px solid ${showFavoritesOnly ? '#d97706' : 'var(--border-soft)'}`,
                  background: showFavoritesOnly ? '#fff7ed' : 'var(--surface-0)',
                  color: showFavoritesOnly ? '#b45309' : 'var(--ink-1)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                }}
              >
                Gogokoak{showFavoritesOnly && favoriteIds.size > 0 ? ` (${favoriteIds.size})` : ''}
              </button>

              {familyGroups.map(({ family, cats }) => {
                const isOpen = expandedFamily === family.label;
                const hasActive = cats.includes(selectedCategory ?? '');

                return (
                  <button
                    key={family.label}
                    type="button"
                    onClick={() =>
                      setExpandedFamily((prev) => (prev === family.label ? null : family.label))
                    }
                    style={{
                      padding: '0.28rem 0.75rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${hasActive || isOpen ? family.color : `${family.color}45`}`,
                      background: hasActive ? family.color : isOpen ? family.bg : 'var(--surface-0)',
                      color: hasActive ? '#fff' : family.color,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {family.label}
                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{isOpen ? '^' : 'v'}</span>
                  </button>
                );
              })}
            </div>

            {expandedFamily ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingLeft: '0.1rem' }}>
                {(familyGroups.find((group) => group.family.label === expandedFamily)?.cats ?? []).map((cat) => {
                  const isActive = selectedCategory === cat;
                  const family = familyGroups.find((group) => group.family.label === expandedFamily)?.family ?? FALLBACK_FAMILY;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory((prev) => (prev === cat ? null : cat))}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        border: `1.5px solid ${isActive ? family.color : `${family.color}55`}`,
                        background: isActive ? family.color : family.bg,
                        color: isActive ? '#fff' : family.color,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.4,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-soft)', margin: '0.1rem 0' }} />

            {!isFiltered ? (
              dailyItem ? (
                <DailyCard
                  item={dailyItem}
                  isFavorite={favoriteIds.has(String(dailyItem.id ?? ''))}
                  isPending={pendingFavoriteIds.has(String(dailyItem.id ?? ''))}
                  onToggleFavorite={() => void toggleFavorite(dailyItem)}
                />
              ) : null
            ) : filteredItems.length === 0 ? (
              <p className="status-copy">Ez da emaitzarik aurkitu.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-0)', fontWeight: 600 }}>
                  {filteredItems.length} emaitza
                </p>
                {filteredItems.map((item, index) => {
                  const id = String(item.id ?? index);
                  return (
                    <OrganizerCard
                      key={id}
                      item={item}
                      isFavorite={favoriteIds.has(id)}
                      isPending={pendingFavoriteIds.has(id)}
                      onToggleFavorite={() => void toggleFavorite(item)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
