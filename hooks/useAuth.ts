import { useReducer, useCallback } from 'react';
import { queryClient } from '../providers/QueryProvider';
import {
  signInWithRegisteredUser,
  signOutRegisteredUser,
  validateUserAccessKey,
} from '../lib/supabaseRepo';
import {
  clearActiveUser,
  readActiveUser,
  writeActiveUser,
} from '../lib/userFavorites';

type AuthState = {
  username: string | null;
  isLoggingIn: boolean;
  error: string | null;
};

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; username: string }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  username: null,
  isLoggingIn: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoggingIn: true, error: null };
    case 'LOGIN_SUCCESS':
      return { username: action.username, isLoggingIn: false, error: null };
    case 'LOGIN_ERROR':
      return { ...state, isLoggingIn: false, error: action.error };
    case 'LOGOUT':
      return initialState;
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export type AuthHook = {
  username: string | null;
  isLoggingIn: boolean;
  error: string | null;
  login: (usernameInput: string, keyInput: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuth = (): AuthHook => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback(async (usernameInput: string, keyInput: string) => {
    const normalized = usernameInput.trim().toLowerCase();
    if (normalized.length < 2) {
      dispatch({ type: 'LOGIN_ERROR', error: 'Erabiltzaileak gutxienez 2 karaktere izan behar ditu.' });
      return;
    }
    const key = keyInput.trim();
    if (key.length < 3) {
      dispatch({ type: 'LOGIN_ERROR', error: 'Gakoak gutxienez 3 karaktere izan behar ditu.' });
      return;
    }

    dispatch({ type: 'LOGIN_START' });

    const authLogin = await signInWithRegisteredUser(normalized, key);
    if (authLogin.ok) {
      const resolvedUsername = authLogin.normalizedUsername ?? normalized;
      writeActiveUser(resolvedUsername);
      dispatch({ type: 'LOGIN_SUCCESS', username: resolvedUsername });
      return;
    }

    const validation = await validateUserAccessKey(normalized, key);
    if (validation.ok) {
      writeActiveUser(normalized);
      dispatch({ type: 'LOGIN_SUCCESS', username: normalized });
      return;
    }

    if (authLogin.errorMessage) {
      dispatch({ type: 'LOGIN_ERROR', error: `Auth errorea: ${authLogin.errorMessage}` });
      return;
    }

    dispatch({ type: 'LOGIN_ERROR', error: 'Erabiltzailea edo gakoa ez dira zuzenak.' });
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutRegisteredUser();
    } catch {
      // local cleanup still runs
    }
    clearActiveUser();
    queryClient.clear();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return { ...state, login, logout, clearError };
};

export const getPersistedUsername = (): string | null => readActiveUser();
