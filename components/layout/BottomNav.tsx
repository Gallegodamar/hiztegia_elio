import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';

type NavView = 'home' | 'search' | 'grammar' | 'progress';

const viewRoutes: Record<NavView, string> = {
  home: '/',
  search: '/bilatu',
  grammar: '/gaurko-gramatika',
  progress: '/favoritos',
};

const viewLabels: Record<NavView, string> = {
  home: 'Hasiera',
  search: 'Bilatu',
  grammar: 'Gramatika',
  progress: 'Gogokoak',
};

export const BottomNav: React.FC<{ isAdminUser: boolean }> = ({ isAdminUser }) => {
  void isAdminUser;
  const navigate = useNavigate();
  const location = useLocation();

  const views: NavView[] = ['home', 'search', 'grammar', 'progress'];

  const activeView: NavView | null =
    location.pathname === '/'
      ? 'home'
      : location.pathname === '/bilatu'
        ? 'search'
      : location.pathname.startsWith('/gaurko-gramatika')
        ? 'grammar'
      : location.pathname === '/favoritos'
        ? 'progress'
        : null;

  return (
    <nav className="bottom-taskbar" aria-label="Nabigazio nagusia">
      <div className="bottom-taskbar__buttons">
        {views.map((view) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => navigate(viewRoutes[view])}
              className={`bottom-taskbar__button ${
                isActive ? 'bottom-taskbar__button--active' : 'bottom-taskbar__button--idle'
              }`}
              aria-label={viewLabels[view]}
              title={viewLabels[view]}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="bottom-taskbar__button-content">
                {view === 'home' ? (
                  <Icon
                    name="home"
                    className="bottom-taskbar__nav-icon bottom-taskbar__nav-icon--home"
                  />
                ) : view === 'search' ? (
                  <Icon
                    name="search"
                    className="bottom-taskbar__nav-icon bottom-taskbar__nav-icon--search"
                  />
                ) : view === 'grammar' ? (
                  <Icon
                    name="grammar"
                    className="bottom-taskbar__nav-icon bottom-taskbar__nav-icon--grammar"
                  />
                ) : (
                  <Icon
                    name="heart"
                    className="bottom-taskbar__nav-icon bottom-taskbar__nav-icon--favorites"
                    filled={isActive}
                  />
                )}
                <span className="bottom-taskbar__label">{viewLabels[view]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
