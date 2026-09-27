import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from './api';
import { unregisterOrderNotifications } from './notifications';

type AuthState = {
  ready: boolean;
  session: api.Session | null;
  signIn: (baseUrl: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<api.Session | null>(null);

  useEffect(() => {
    api.setSignedOutHandler(() => {
      setSession(null);
      queryClient.clear();
    });
    api.loadSession().then((s) => {
      setSession(s);
      setReady(true);
    });
    return () => api.setSignedOutHandler(null);
  }, [queryClient]);

  const signIn = useCallback(async (baseUrl: string, email: string, password: string) => {
    setSession(await api.signIn(baseUrl, email, password));
  }, []);

  const signOut = useCallback(async () => {
    await unregisterOrderNotifications();
    await api.signOut();
  }, []);

  const value = useMemo(() => ({ ready, session, signIn, signOut }), [ready, session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
