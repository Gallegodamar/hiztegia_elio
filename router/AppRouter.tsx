import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { MoreHorizontalIcon } from '../components/layout/Icons';
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

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <p className="status-copy">Kargatzen...</p>
  </div>
);

const contentClassByPath: Record<string, string> = {
  '/': 'app-shell__content--dictionary',
  '/favoritos': 'app-shell__content--favorites',
  '/admin': 'space-y-4',
  '/antolatzaileak': 'app-shell__content--organizers',
};

const AuthenticatedLayout: React.FC = () => {
  const { username, logout, notice } = useAppContext();
  const location = useLocation();
  const isAdminUser = username === 'admin';
  const { favoritesByDate } = useFavoritesData(username);
  const todayFavoritesCount = favoritesByDate[todayKey()]?.length ?? 0;
  const userInitials = useMemo(() => buildUserInitials(username), [username]);

  const isDictionaryRoute = location.pathname === '/';
  const contentClass = contentClassByPath[location.pathname] ?? 'space-y-4';

  return (
    <AppShell
      header={
        <ScreenHeader
          title="Hiztegia"
          subtitle={isDictionaryRoute ? `${todayFavoritesCount} hitz gordeta - Gaur` : undefined}
        />
      }
      topRightControl={
        isDictionaryRoute ? (
          <button
            onClick={() => void logout()}
            className="header-more-button"
            type="button"
            title={`${username} - Irten`}
            aria-label={`${username} - Irten`}
          >
            <MoreHorizontalIcon className="header-more-button__icon" />
          </button>
        ) : (
          <button
            onClick={() => void logout()}
            className="user-avatar-button"
            type="button"
            title={`${username} - Irten`}
            aria-label={`${username} - Irten`}
          >
            {userInitials}
          </button>
        )
      }
      footer={<BottomNav isAdminUser={isAdminUser} />}
      footerClassName="app-shell__footer--menu app-shell__footer--taskbar"
      contentClassName={`mx-auto w-full max-w-5xl ${contentClass}`}
    >
      {notice ? <p className="notice notice--info">{notice}</p> : null}

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<SearchPanel />} />
          <Route path="/favoritos" element={<FavoritesPanel />} />
          <Route
            path="/admin"
            element={isAdminUser ? <AddSynonymPanel /> : <Navigate to="/" replace />}
          />
          <Route path="/antolatzaileak" element={<OrganizersPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
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
