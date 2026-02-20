import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { ScreenHeader } from '../layout/ScreenHeader';
import { readActiveUser } from '../../lib/userFavorites';

type AuthViewProps = {
  isLoggingIn: boolean;
  error: string | null;
  onLogin: (username: string, key: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<boolean>;
  onClearError: () => void;
};

export const AuthView: React.FC<AuthViewProps> = ({ isLoggingIn, error, onLogin, onRegister, onClearError }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState(() => readActiveUser() ?? '');
  const [keyInput, setKeyInput] = useState('');
  const [confirmKeyInput, setConfirmKeyInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setKeyInput('');
    setConfirmKeyInput('');
    setLocalError(null);
    onClearError();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (mode === 'register') {
      if (keyInput !== confirmKeyInput) {
        setLocalError('Pasahitzak ez datoz bat.');
        return;
      }
      const registered = await onRegister(usernameInput, keyInput);
      if (registered) {
        navigate('/', { replace: true });
      }
    } else {
      void onLogin(usernameInput, keyInput);
    }
  };

  const displayError = localError ?? error;
  const isRegister = mode === 'register';

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
              onChange={(e) => { setUsernameInput(e.target.value); onClearError(); setLocalError(null); }}
              placeholder={isRegister ? 'Aukeratu erabiltzaile-izen bat' : 'adib. s_01 edo user@email.com'}
              className="input-shell"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">{isRegister ? 'Pasahitza' : 'Gakoa'}</span>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); onClearError(); setLocalError(null); }}
              placeholder={isRegister ? 'Gutxienez 6 karaktere' : 'Zure gakoa'}
              className="input-shell"
              required
            />
          </label>

          {isRegister && (
            <label className="block">
              <span className="field-label">Pasahitza berretsi</span>
              <input
                type="password"
                value={confirmKeyInput}
                onChange={(e) => { setConfirmKeyInput(e.target.value); setLocalError(null); }}
                placeholder="Pasahitza berriz idatzi"
                className="input-shell"
                required
              />
            </label>
          )}

          {displayError ? <p className="notice notice--error">{displayError}</p> : null}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn-primary w-full py-3 text-sm"
          >
            {isLoggingIn
              ? (isRegister ? 'Erregistratzen...' : 'Egiaztatzen...')
              : (isRegister ? 'Erregistratu' : 'Sartu')}
          </button>

          <p className="helper-note" style={{ textAlign: 'center', marginTop: '0.6rem' }}>
            {isRegister ? 'Dagoeneko kontua duzu?' : 'Ez duzu konturik?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-display"
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                color: 'var(--ink-0)',
                fontWeight: 800,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              {isRegister ? 'Sartu' : 'Erregistratu'}
            </button>
          </p>
        </form>
      </section>
    </AppShell>
  );
};
