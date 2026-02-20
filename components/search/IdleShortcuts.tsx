import React from 'react';
import { OpenBookIcon, GroupIcon, SearchIcon } from '../layout/Icons';

type ShortcutItem = { label: string; path: string; icon: 'synonyms' | 'meaning' | 'organizers' };

const ICON_MAP: Record<ShortcutItem['icon'], { component: React.FC<{ className?: string }>; className: string }> = {
  synonyms: { component: OpenBookIcon, className: 'bottom-taskbar__icon bottom-taskbar__icon--dictionary' },
  meaning: { component: SearchIcon, className: 'bottom-taskbar__icon bottom-taskbar__icon--dictionary' },
  organizers: { component: GroupIcon, className: 'bottom-taskbar__icon bottom-taskbar__icon--organizers' },
};

type IdleShortcutsProps = {
  items: ShortcutItem[];
  onNavigate: (path: string) => void;
  message?: string;
};

const ShortcutButton: React.FC<{ item: ShortcutItem; onNavigate: (path: string) => void }> = ({ item, onNavigate }) => {
  const { component: Icon, className: iconClass } = ICON_MAP[item.icon];
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className="surface-card"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '1.2rem 0.8rem',
        border: '1px solid var(--border-soft)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'rgba(67, 122, 178, 0.46)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-soft)';
      }}
    >
      <Icon className={iconClass} />
      <span
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: '0.78rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-1)',
        }}
      >
        {item.label}
      </span>
    </button>
  );
};

export const IdleShortcuts: React.FC<IdleShortcutsProps> = ({
  items,
  onNavigate,
  message = 'Idazten hasi bilatzeko.',
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingTop: '2.5rem' }}>
    <p className="status-copy" style={{ marginBottom: '0.5rem' }}>{message}</p>
    <div style={{ display: 'flex', gap: '0.8rem', width: '100%', maxWidth: '360px' }}>
      {items.map((item) => (
        <ShortcutButton key={item.path} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  </div>
);
