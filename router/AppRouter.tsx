import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { DailyStoryPlaceholderScreen } from '../components/stories/DailyStoryPlaceholderScreen';
import {
  DailyOrganizerStoryContent,
  DailySynonymStoryContent,
  DailyTopicStoryContent,
} from '../components/stories/DailyStoryContent';

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
const TopicChips = lazy(() =>
  import('../components/search/TopicChips').then((m) => ({ default: m.TopicChips }))
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
const TopicListScreen = lazy(() =>
  import('../components/topics/TopicListScreen').then((m) => ({ default: m.TopicListScreen }))
);
const TopicScreen = lazy(() =>
  import('../components/topics/TopicScreen').then((m) => ({ default: m.TopicScreen }))
);
const StudySession = lazy(() =>
  import('../pages/StudySession').then((m) => ({ default: m.StudySession }))
);
const GrammarScreen = lazy(() =>
  import('../components/grammar/GrammarScreen').then((m) => ({ default: m.GrammarScreen }))
);

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <p className="status-copy">Kargatzen...</p>
  </div>
);

const SimplePlaceholderPanel: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <section className="surface-card" style={{ padding: '1rem' }}>
    <p className="section-label" style={{ margin: 0 }}>
      Laster
    </p>
    <h2
      className="font-display"
      style={{ margin: '0.3rem 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink-0)' }}
    >
      {title}
    </h2>
    <p className="helper-note" style={{ margin: '0.5rem 0 0' }}>
      {description}
    </p>
  </section>
);

const contentClassByPath: Record<string, string> = {
  '/': 'space-y-4',
  '/bilatu': 'app-shell__content--dictionary',
  '/daily': 'app-shell__content--study-session',
  '/daily/summary': 'app-shell__content--study-session',
  '/sinonimoak': 'app-shell__content--dictionary',
  '/favoritos': 'app-shell__content--favorites',
  '/estatistikak': 'space-y-4',
  '/azken-akatsak': 'space-y-4',
  '/hitz-konplexuak': 'space-y-4',
  '/admin': 'space-y-4',
  '/antolatzaileak': 'app-shell__content--organizers',
  '/gaiak': 'app-shell__content--topics',
  '/gaurko-gaia': 'app-shell__content--dictionary',
  '/gaurko-sinonimoak': 'app-shell__content--dictionary',
  '/gaurko-antolatzailea': 'app-shell__content--dictionary',
  '/gaurko-gramatika': 'app-shell__content--study-session',
  '/ikasi/gaurko': 'app-shell__content--study-session',
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
  const isStudySessionRoute =
    location.pathname.startsWith('/daily') ||
    location.pathname === '/ikasi/gaurko' ||
    location.pathname === '/gaurko-gramatika';
  const isAdminUser = username === 'admin';
  const userInitials = useMemo(() => buildUserInitials(username), [username]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const contentClass =
    contentClassByPath[location.pathname] ??
    (location.pathname.startsWith('/gaiak/')
      ? 'app-shell__content--topics'
      : location.pathname.startsWith('/daily/q/')
        ? 'app-shell__content--study-session'
        : 'space-y-4');

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    void logout();
  };

  const headerTitle =
    location.pathname === '/'
      ? ''
      : location.pathname === '/bilatu'
        ? 'Bilatu'
      : location.pathname === '/favoritos'
        ? 'Gogokoak'
          : location.pathname === '/estatistikak'
            ? 'Estatistikak'
            : location.pathname === '/azken-akatsak'
              ? 'Azken akatsak'
              : location.pathname === '/hitz-konplexuak'
                ? 'Hitz konplexuak'
                : location.pathname === '/antolatzaileak'
                  ? 'Antolatzaileak'
                  : location.pathname === '/gaiak'
                    ? 'Gaiak'
                    : '';

  const contentClassName = isStudySessionRoute
    ? 'app-shell__content--study-session'
    : `mx-auto w-full max-w-5xl ${contentClass}`;

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
      header={isStudySessionRoute ? undefined : (
        <ScreenHeader
          title={headerTitle}
        />
      )}
      topRightControl={isStudySessionRoute ? undefined : (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="user-avatar-button"
          type="button"
          title={`${username} - Irten`}
          aria-label={`${username} - Irten`}
        >
          {userInitials}
        </button>
      )}
      footer={isStudySessionRoute ? undefined : <BottomNav isAdminUser={isAdminUser} />}
      footerClassName={isStudySessionRoute ? '' : 'app-shell__footer--menu app-shell__footer--taskbar'}
      contentClassName={contentClassName}
      hideFooterPlaceholder={isStudySessionRoute}
    >
      {!isStudySessionRoute && notice ? <p className="notice notice--info">{notice}</p> : null}

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<TopicChips />} />
          <Route path="/bilatu" element={<SearchPanel />} />
          <Route path="/daily" element={<StudySession />} />
          <Route path="/daily/q/:index" element={<StudySession />} />
          <Route path="/daily/summary" element={<StudySession />} />
          <Route path="/ikasi/gaurko" element={<Navigate to="/daily" replace />} />
          <Route path="/sinonimoak" element={<Navigate to="/bilatu?mode=synonyms" replace />} />
          <Route path="/favoritos" element={<FavoritesPanel />} />
          <Route
            path="/estatistikak"
            element={
              <SimplePlaceholderPanel
                title="Estatistikak"
                description="Hemen ikasketa estatistika sakonak erakutsiko dira (racha, akatsak, aurrerapena)."
              />
            }
          />
          <Route
            path="/azken-akatsak"
            element={
              <SimplePlaceholderPanel
                title="Azken akatsak"
                description="TODO: azken saioetako akatsak eta errepasatzeko gomendioak hemen agertuko dira."
              />
            }
          />
          <Route
            path="/hitz-konplexuak"
            element={
              <SimplePlaceholderPanel
                title="Hitz konplexuak"
                description="TODO: zailtasun handiko hitzak eta adibide gidatuak hemen erakutsiko dira."
              />
            }
          />
          <Route
            path="/admin"
            element={isAdminUser ? <AddSynonymPanel /> : <Navigate to="/" replace />}
          />
          <Route path="/antolatzaileak" element={<OrganizersPanel />} />
          <Route path="/gaiak" element={<TopicListScreen />} />
          <Route path="/gaiak/:slug" element={<TopicScreen />} />
          <Route
            path="/gaurko-gaia"
            element={
              <DailyStoryPlaceholderScreen
                storyId="gaurko-gaia"
                title="Gaia"
                description="Hemen gaurko gaiarekin lotutako eduki laburra agertuko da."
                segments={4}
                activeSegment={1}
                nextRoute="/gaurko-sinonimoak"
              >
                <DailyTopicStoryContent />
              </DailyStoryPlaceholderScreen>
            }
          />
          <Route
            path="/gaurko-sinonimoak"
            element={
              <DailyStoryPlaceholderScreen
                storyId="gaurko-sinonimoak"
                title="Sinonimoa"
                description="Hemen eguneko sinonimoen mini istorioa erakutsiko da."
                segments={4}
                activeSegment={2}
                nextRoute="/gaurko-antolatzailea"
              >
                <DailySynonymStoryContent />
              </DailyStoryPlaceholderScreen>
            }
          />
          <Route
            path="/gaurko-antolatzailea"
            element={
              <DailyStoryPlaceholderScreen
                storyId="gaurko-antolatzailea"
                title="Antolatzailea"
                description="Hemen gaurko antolatzailearen azalpen eta adibideak joango dira."
                segments={4}
                activeSegment={3}
                nextRoute="/gaurko-gramatika"
              >
                <DailyOrganizerStoryContent />
              </DailyStoryPlaceholderScreen>
            }
          />
          <Route
            path="/gaurko-gramatika"
            element={<GrammarScreen />}
          />
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
