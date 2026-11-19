/**
 * SessionsProvider — one shared list of the student's chat sessions,
 * used by the sidebar and the home page. Call `refresh()` after a chat
 * creates a new session so the list updates everywhere.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, type Session } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

interface SessionsContextType {
  sessions: Session[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const SessionsContext = createContext<SessionsContextType | undefined>(undefined);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiClient.getSessions(userId, 30);
      setSessions(res.sessions ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Fetch on mount / user change; state updates happen after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return (
    <SessionsContext.Provider value={{ sessions, loading, error, refresh }}>
      {children}
    </SessionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider');
  return ctx;
}
