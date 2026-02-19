import React, { useEffect, useMemo, useState } from 'react';
import { OrganizerItem } from '../../appTypes';
import {
  addOrganizerFavorite,
  fetchAllOrganizers,
  fetchOrganizerFavoriteIds,
  removeOrganizerFavorite,
} from '../../lib/supabaseRepo';
import { useAppContext } from '../../contexts/AppContext';
import { StarIcon } from '../layout/Icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeText = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const getText = (item: OrganizerItem, key: string): string | null => {
  const value = item[key];
  if (typeof value === 'string') return value.trim() || null;
  return null;
};

// ─── Families ─────────────────────────────────────────────────────────────────

type Family = { label: string; color: string; bg: string; keys: string[] };

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
  const n = normalizeText(mota);
  const idx = FAMILIES.findIndex((f) => f.keys.some((k) => n.includes(k)));
  return idx >= 0 ? idx : FAMILIES.length;
};

const getFamilyForMota = (mota: string): Family =>
  FAMILIES[getFamilyIndex(mota)] ?? FALLBACK_FAMILY;

// ─── Daily item ───────────────────────────────────────────────────────────────

const getDailyItem = (items: OrganizerItem[]): OrganizerItem | null => {
  if (!items.length) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return items[day % items.length] ?? null;
};

// ─── DailyCard ────────────────────────────────────────────────────────────────

const DailyCard: React.FC<{
  item: OrganizerItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}> = ({ item, isFavorite, onToggleFavorite }) => {
  const antolatzaileak = getText(item, 'antolatzaileak');
  const esanahia = getText(item, 'esanahia');
  const mota = getText(item, 'mota');
  if (!antolatzaileak) return null;

  const family = mota ? getFamilyForMota(mota) : FALLBACK_FAMILY;

  return (
    <div
      style={{
        borderRadius: '1rem',
        border: `1.5px solid ${family.color}40`,
        background: family.bg,
        padding: '0.85rem 0.9rem',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.67rem',
              fontWeight: 800,
              color: family.color,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 0.4rem',
            }}
          >
            ✦ Gaurko antolatzailea
          </p>
          <p
            style={{
              fontWeight: 700,
              color: 'var(--ink-0)',
              margin: 0,
              lineHeight: 1.35,
              fontSize: '0.97rem',
            }}
          >
            {antolatzaileak}
          </p>
          {esanahia && (
            <p
              style={{
                color: 'var(--muted-0)',
                fontSize: '0.85rem',
                margin: '0.28rem 0 0',
                lineHeight: 1.4,
              }}
            >
              {esanahia}
            </p>
          )}
          {mota && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.13rem 0.5rem',
                borderRadius: '999px',
                background: `${family.color}1a`,
                color: family.color,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {mota}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Gogokoetatik kendu' : 'Gogokoa gehitu'}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: '0.2rem',
            cursor: 'pointer',
            color: isFavorite ? '#f5a623' : `${family.color}70`,
            lineHeight: 1,
          }}
        >
          <StarIcon filled={isFavorite} />
        </button>
      </div>
    </div>
  );
};

// ─── OrganizerCard ────────────────────────────────────────────────────────────

const OrganizerCard: React.FC<{
  item: OrganizerItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  accentColor?: string;
}> = ({ item, isFavorite, onToggleFavorite, accentColor }) => {
  const antolatzaileak = getText(item, 'antolatzaileak');
  const esanahia = getText(item, 'esanahia');
  if (!antolatzaileak) return null;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '0.75rem',
        border: '1.5px solid var(--border-soft)',
        borderLeft: accentColor
          ? `3px solid ${accentColor}`
          : '1.5px solid var(--border-soft)',
        background: 'var(--surface-0)',
        padding: '0.6rem 2.8rem 0.6rem 0.85rem',
      }}
    >
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? 'Gogokoetatik kendu' : 'Gogokoa gehitu'}
        style={{
          position: 'absolute',
          top: '0.45rem',
          right: '0.5rem',
          background: 'none',
          border: 'none',
          padding: '0.3rem',
          cursor: 'pointer',
          color: isFavorite ? '#f5a623' : 'var(--muted-1)',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <StarIcon filled={isFavorite} />
      </button>
      <p
        style={{
          fontWeight: 700,
          color: 'var(--ink-0)',
          margin: 0,
          lineHeight: 1.3,
          fontSize: '0.95rem',
        }}
      >
        {antolatzaileak}
      </p>
      {esanahia && (
        <p
          style={{
            color: 'var(--muted-0)',
            fontSize: '0.85rem',
            margin: '0.18rem 0 0',
            lineHeight: 1.4,
          }}
        >
          {esanahia}
        </p>
      )}
    </div>
  );
};

// ─── FamilySection ────────────────────────────────────────────────────────────

const FamilySection: React.FC<{
  family: Family;
  cats: string[];
  isOpen: boolean;
  selectedCategory: string | null;
  onToggleOpen: () => void;
  onSelect: (cat: string) => void;
}> = ({ family, cats, isOpen, selectedCategory, onToggleOpen, onSelect }) => {
  if (!cats.length) return null;
  const hasActive = cats.some((c) => c === selectedCategory);
  return (
    <div>
      <button
        type="button"
        onClick={onToggleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: hasActive ? `${family.color}12` : 'transparent',
          border: `1.5px solid ${hasActive ? family.color + '55' : family.color + '30'}`,
          borderRadius: '0.6rem',
          padding: '0.38rem 0.65rem',
          cursor: 'pointer',
          gap: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: family.color,
            letterSpacing: '0.02em',
            textAlign: 'left',
          }}
        >
          {family.label}
          {hasActive && (
            <span
              style={{
                marginLeft: '0.45rem',
                display: 'inline-block',
                width: '0.45rem',
                height: '0.45rem',
                borderRadius: '50%',
                background: family.color,
                verticalAlign: 'middle',
              }}
            />
          )}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: family.color,
            transition: 'transform 0.15s',
            display: 'inline-block',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.3rem',
            marginTop: '0.4rem',
            paddingLeft: '0.2rem',
          }}
        >
          {cats.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelect(cat)}
                style={{
                  padding: '0.28rem 0.7rem',
                  borderRadius: '999px',
                  border: `1.5px solid ${isActive ? family.color : family.color + '55'}`,
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
      )}
    </div>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────────

export const OrganizersPanel: React.FC = () => {
  const { username } = useAppContext();
  const [allItems, setAllItems] = useState<OrganizerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAllOrganizers(), fetchOrganizerFavoriteIds(username)])
      .then(([rows, favIds]) => {
        setAllItems(rows);
        setFavoriteIds(favIds);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [username]);

  // Group categories by semantic family
  const familyGroups = useMemo(() => {
    const catMap = new Map<string, number>();
    allItems.forEach((item) => {
      const mota = getText(item, 'mota');
      if (mota && !catMap.has(mota)) catMap.set(mota, getFamilyIndex(mota));
    });

    const groups: Array<{ family: Family; cats: string[] }> = FAMILIES.map((f) => ({
      family: f,
      cats: [],
    }));
    const others: string[] = [];

    catMap.forEach((idx, cat) => {
      if (idx < FAMILIES.length) {
        groups[idx].cats.push(cat);
      } else {
        others.push(cat);
      }
    });

    if (others.length) groups.push({ family: FALLBACK_FAMILY, cats: others });

    return groups
      .filter((g) => g.cats.length > 0)
      .map((g) => ({ ...g, cats: g.cats.sort((a, b) => a.localeCompare(b, 'eu')) }));
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
    const n = normalizeText(term.trim());
    if (n) {
      items = items.filter((item) =>
        Object.values(item).some(
          (v) => typeof v === 'string' && normalizeText(v).includes(n)
        )
      );
    }
    return items;
  }, [allItems, selectedCategory, showFavoritesOnly, term, favoriteIds]);

  const isFiltered =
    selectedCategory !== null || term.trim() !== '' || showFavoritesOnly;

  const toggleFavorite = (item: OrganizerItem) => {
    const id = String(item.id ?? '');
    if (!id) return;
    const was = favoriteIds.has(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      was ? next.delete(id) : next.add(id);
      return next;
    });
    void (was
      ? removeOrganizerFavorite(username, id)
      : addOrganizerFavorite(username, id));
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%' }}>

      {/* Search */}
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
          onChange={(e) => setTerm(e.target.value)}
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
        {term && (
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
            ×
          </button>
        )}
      </div>

      {/* Scrollable area */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {isLoading ? (
          <p className="status-copy">Kargatzen...</p>
        ) : (
          <>
            {/* ★ Gogokoak + family pills in one row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setShowFavoritesOnly((p) => !p)}
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
                ★ Gogokoak
                {showFavoritesOnly && favoriteIds.size > 0 ? ` (${favoriteIds.size})` : ''}
              </button>

              {familyGroups.map(({ family, cats }) => {
                const isOpen = expandedFamily === family.label;
                const hasActive = cats.some((c) => c === selectedCategory);
                return (
                  <button
                    key={family.label}
                    type="button"
                    onClick={() =>
                      setExpandedFamily((prev) =>
                        prev === family.label ? null : family.label
                      )
                    }
                    style={{
                      padding: '0.28rem 0.75rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${hasActive || isOpen ? family.color : family.color + '45'}`,
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
                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                      {isOpen ? '▴' : '▾'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Expanded sub-categories */}
            {expandedFamily && (() => {
              const group = familyGroups.find((g) => g.family.label === expandedFamily);
              if (!group) return null;
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingLeft: '0.1rem' }}>
                  {group.cats.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          border: `1.5px solid ${isActive ? group.family.color : group.family.color + '55'}`,
                          background: isActive ? group.family.color : group.family.bg,
                          color: isActive ? '#fff' : group.family.color,
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
              );
            })()}

            {/* Divider */}
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--border-soft)',
                margin: '0.1rem 0',
              }}
            />

            {/* Content: daily card or results */}
            {!isFiltered ? (
              dailyItem ? (
                <DailyCard
                  item={dailyItem}
                  isFavorite={favoriteIds.has(String(dailyItem.id ?? ''))}
                  onToggleFavorite={() => toggleFavorite(dailyItem)}
                />
              ) : null
            ) : filteredItems.length === 0 ? (
              <p className="status-copy">Ez da emaitzarik aurkitu.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: 'var(--muted-0)',
                    fontWeight: 600,
                  }}
                >
                  {filteredItems.length} emaitza
                </p>
                {filteredItems.map((item, i) => {
                  const mota = getText(item, 'mota');
                  const family = mota ? getFamilyForMota(mota) : FALLBACK_FAMILY;
                  return (
                    <OrganizerCard
                      key={String(item.id ?? i)}
                      item={item}
                      isFavorite={favoriteIds.has(String(item.id ?? ''))}
                      onToggleFavorite={() => toggleFavorite(item)}
                      accentColor={family.color}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
