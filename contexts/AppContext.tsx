import React, { createContext, useContext, useEffect, useState } from 'react';

type AppContextValue = {
  username: string;
  logout: () => Promise<void>;
  notice: string | null;
  showNotice: (message: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{
  username: string;
  logout: () => Promise<void>;
  children: React.ReactNode;
}> = ({ username, logout, children }) => {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <AppContext.Provider value={{ username, logout, notice, showNotice: setNotice }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};
