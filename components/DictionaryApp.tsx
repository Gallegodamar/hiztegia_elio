import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthView } from './auth/AuthView';
import { AppRouter } from '../router/AppRouter';

export const DictionaryApp: React.FC = () => {
  const auth = useAuth();

  if (!auth.username) {
    return (
      <AuthView
        isLoggingIn={auth.isLoggingIn}
        error={auth.error}
        onLogin={auth.login}
        onRegister={auth.register}
        onClearError={auth.clearError}
      />
    );
  }

  return <AppRouter username={auth.username} logout={auth.logout} />;
};
