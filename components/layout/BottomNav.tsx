import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OpenBookIcon, HeartIcon, PlusIcon, GroupIcon } from './Icons';

type NavView = 'dictionary' | 'favorites' | 'organizers' | 'addSynonym';

const viewRoutes: Record<NavView, string> = {
  dictionary: '/',
  favorites: '/favoritos',
  organizers: '/antolatzaileak',
  addSynonym: '/admin',
};

const viewLabels: Record<NavView, string> = {
  dictionary: 'Hiztegia',
  favorites: 'Gogokoak',
  organizers: 'Antolatzaileak',
  addSynonym: 'Sinonimoa gehitu',
};

export const BottomNav: React.FC<{ isAdminUser: boolean }> = ({ isAdminUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const views: NavView[] = isAdminUser
    ? ['dictionary', 'favorites', 'organizers', 'addSynonym']
    : ['dictionary', 'favorites', 'organizers'];

  const activeView: NavView =
    location.pathname === '/favoritos'
      ? 'favorites'
      : location.pathname === '/antolatzaileak'
        ? 'organizers'
        : location.pathname === '/admin'
          ? 'addSynonym'
          : 'dictionary';

  return (
    <nav className="bottom-taskbar" aria-label="Nabigazio nagusia">
      <div className="bottom-taskbar__buttons">
        {views.map((view, index) => {
          const isActive = activeView === view;
          return (
            <React.Fragment key={view}>
              {index > 0 ? <span className="bottom-taskbar__separator" aria-hidden="true" /> : null}
              <button
                type="button"
                onClick={() => navigate(viewRoutes[view])}
                className={`bottom-taskbar__button ${
                  isActive ? 'bottom-taskbar__button--active' : 'bottom-taskbar__button--idle'
                }`}
                aria-label={viewLabels[view]}
                title={viewLabels[view]}
              >
                {view === 'dictionary' ? (
                  <OpenBookIcon className="bottom-taskbar__icon bottom-taskbar__icon--dictionary" />
                ) : view === 'favorites' ? (
                  <HeartIcon className="bottom-taskbar__icon bottom-taskbar__icon--favorites" />
                ) : view === 'organizers' ? (
                  <GroupIcon className="bottom-taskbar__icon bottom-taskbar__icon--organizers" />
                ) : (
                  <PlusIcon className="bottom-taskbar__icon bottom-taskbar__icon--add" />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
