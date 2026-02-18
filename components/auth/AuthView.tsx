import React, { useState } from 'react';
import { AppShell } from '../layout/AppShell';
import { ScreenHeader } from '../layout/ScreenHeader';
import { readActiveUser } from '../../lib/userFavorites';

type AuthViewProps = {
  isLoggingIn: boolean;
  error: string | null;
  onLogin: (username: string, key: string) => Promise<void>;
  onClearError: () => void;
};

export const AuthView: React.FC<AuthViewProps> = ({ isLoggingIn, error, onLogin, onClearError }) => {
  const [usernameInput, setUsernameInput] = useState(() => readActiveUser() ?? '');
  const [keyInput, setKeyInput] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onLogin(usernameInput, keyInput);
  };

  return (
    <AppShell
      header={<ScreenHeader title="Hiztegia" />}
      contentClassName="mx-auto flex w-full max-w-5xl items-center justify-center"
    >
      <section className="surface-card surface-card--muted auth-card w-full max-w-lg p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="field-label">Erabiltzailea</span>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => { setUsernameInput(e.target.value); onClearError(); }}
              placeholder="adib. s_01 edo user@email.com"
              className="input-shell"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">Gakoa</span>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); onClearError(); }}
              placeholder="Zure gakoa"
              className="input-shell"
              required
            />
          </label>

          {error ? <p className="notice notice--error">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn-primary w-full py-3 text-sm"
          >
            {isLoggingIn ? 'Egiaztatzen...' : 'Sartu'}
          </button>
        </form>
      </section>
    </AppShell>
  );
};
