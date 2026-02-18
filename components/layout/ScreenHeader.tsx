import React from 'react';

const APP_ICON_SRC = '/icon-192x192.png';

export const ScreenHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = ({ title, subtitle }) => (
  <div className="elio-brand-header">
    <div className="elio-brand-header__main">
      <div className="elio-brand-icon-shell" aria-hidden="true">
        <img src={APP_ICON_SRC} alt="" className="elio-brand-icon" />
      </div>
      <div className="min-w-0">
        <h1 className="display-title">{title}</h1>
        {subtitle ? <p className="elio-brand-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  </div>
);
