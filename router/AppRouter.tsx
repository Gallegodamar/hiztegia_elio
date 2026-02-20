import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { useFavoritesData } from '../hooks/useFavoritesData';
import { todayKey } from '../lib/userFavorites';

const buildUserInitials = (rawUsername: string): string => {
  const normalized = rawUsername.trim();
  if (!normalized) return '?';
  const tokens = normalized.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (tokens.length >= 2) return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
  const fallback = (tokens[0] ?? normalized).replace(/[^a-zA-Z0-9]/g, '');
  return (fallback.slice(0, 2) || normalized.slice(0, 1)).toUpperCase();
};

const SearchPanel = lazy(() =>
  import('../components/search/SearchPanel').then((m) => ({ default: m.SearchPanel }))
);
const FavoritesPanel = lazy(() =>
  import('../components/favorites/FavoritesPanel').then((m) => ({ default: m.FavoritesPanel }))
);
const AddSynonymPanel = lazy(() =>
  import('../components/admin/AddSynonymPanel').then((m) => ({ default: m.AddSynonymPanel }))
);
const OrganizersPanel = lazy(() =>
  import('../components/organizers/OrganizersPanel').then((m) => ({ default: m.OrganizersPanel }))
);
const SynonymPanel = lazy(() =>
  import('../components/search/SynonymPanel').then((m) => ({ default: m.SynonymPanel }))
);
const TopicListScreen = lazy(() =>
  import('../components/topics/TopicListScreen').then((m) => ({ default: m.TopicListScreen }))
);
const TopicScreen = lazy(() =>
  import('../components/topics/TopicScreen').then((m) => ({ default: m.TopicScreen }))
);

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <p className="status-copy">Kargatzen...</p>
  </div>
);

const contentClassByPath: Record<string, string> = {
  '/': 'app-shell__content--dictionary',
  '/sinonimoak': 'app-shell__content--dictionary',
  '/favoritos': 'app-shell__content--favorites',
  '/admin': 'space-y-4',
  '/antolatzaileak': 'app-shell__content--organizers',
  '/gaiak': 'app-shell__content--topics',
};

const LogoutConfirmDialog: React.FC<{ username: string; onConfirm: () => void; onCancel: () => void }> = ({
  username,
  onConfirm,
  onCancel,
}) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 47, 90, 0.38)',
      backdropFilter: 'blur(4px)',
    }}
    onClick={onCancel}
  >
    <div
      className="surface-card"
      style={{ padding: '1.6rem', maxWidth: '340px', width: '90%', textAlign: 'center' }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="font-display" style={{ margin: '0 0 0.3rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink-0)' }}>
        Irten nahi duzu?
      </p>
      <p className="helper-note" style={{ margin: '0 0 1.2rem' }}>
        {username}, saioa itxiko da.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>
          Utzi
        </button>
        <button type="button" onClick={onConfirm} className="btn-primary" style={{ flex: 1 }}>
          Irten
        </button>
      </div>
    </div>
  </div>
);

const AuthenticatedLayout: React.FC = () => {
  const { username, logout, notice } = useAppContext();
  const location = useLocation();
  const isAdminUser = username === 'admin';
  const { favoritesByDate } = useFavoritesData(username);
  const todayFavoritesCount = favoritesByDate[todayKey()]?.length ?? 0;
  const userInitials = useMemo(() => buildUserInitials(username), [username]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isDictionaryRoute = location.pathname === '/' || location.pathname === '/sinonimoak';
  const contentClass =
    contentClassByPath[location.pathname] ??
    (location.pathname.startsWith('/gaiak/') ? 'app-shell__content--topics' : 'space-y-4');

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    void logout();
  };

  return (
    <>
    {showLogoutConfirm && (
      <LogoutConfirmDialog
        username={username}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    )}
    <AppShell
      header={
        <ScreenHeader
          title="Hiztegia"
          subtitle={isDictionaryRoute ? `${todayFavoritesCount} hitz gordeta - Gaur` : undefined}
        />
      }
      topRightControl={
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="user-avatar-button"
          type="button"
          title={`${username} - Irten`}
          aria-label={`${username} - Irten`}
        >
          {userInitials}
        </button>
      }
      footer={<BottomNav isAdminUser={isAdminUser} />}
      footerClassName="app-shell__footer--menu app-shell__footer--taskbar"
      contentClassName={`mx-auto w-full max-w-5xl ${contentClass}`}
    >
      {notice ? <p className="notice notice--info">{notice}</p> : null}

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<SearchPanel />} />
          <Route path="/sinonimoak" element={<SynonymPanel />} />
          <Route path="/favoritos" element={<FavoritesPanel />} />
          <Route
            path="/admin"
            element={isAdminUser ? <AddSynonymPanel /> : <Navigate to="/" replace />}
          />
          <Route path="/antolatzaileak" element={<OrganizersPanel />} />
          <Route path="/gaiak" element={<TopicListScreen />} />
          <Route path="/gaiak/:slug" element={<TopicScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
    </>
  );
};

type AppRouterProps = {
  username: string;
  logout: () => Promise<void>;
};

export const AppRouter: React.FC<AppRouterProps> = ({ username, logout }) => (
  <AppProvider username={username} logout={logout}>
    <AuthenticatedLayout />
  </AppProvider>
);
