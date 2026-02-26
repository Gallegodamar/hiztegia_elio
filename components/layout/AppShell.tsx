import React from 'react';

type AppShellProps = {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  footerClassName?: string;
  topRightControl?: React.ReactNode;
  hideFooterPlaceholder?: boolean;
};

export const AppShell: React.FC<AppShellProps> = ({
  header,
  footer,
  children,
  contentClassName = '',
  footerClassName = '',
  topRightControl,
  hideFooterPlaceholder = false,
}) => {
  const resolvedFooterClassName = `app-shell__footer ${footerClassName}`.trim();

  return (
    <div className="app-shell-frame">
      <div className="app-shell">
        {header ? (
          <header
            className={
              `app-shell__header ${topRightControl ? 'app-shell__header--with-control' : ''}`.trim()
            }
          >
            {header}
            {topRightControl ? (
              <div className="app-shell__header-control">{topRightControl}</div>
            ) : null}
          </header>
        ) : null}
        <main className={`app-shell__content custom-scrollbar ${contentClassName}`.trim()}>
          {children}
        </main>
        {footer ? (
          <footer className={resolvedFooterClassName}>{footer}</footer>
        ) : hideFooterPlaceholder ? null : (
          <footer className="app-shell__footer app-shell__footer--ghost" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};
