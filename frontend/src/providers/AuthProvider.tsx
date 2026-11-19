/**
 * AuthProvider — signed-in state for the whole app.
 * Tokens live in the API client; this exposes who is signed in.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, type SignupResponse } from '@/lib/api';

export interface AuthUser {
  user_id: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<SignupResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => apiClient.storedUser());
  const [loading, setLoading] = useState(false);

  // A refresh failed mid-session: send the student to sign in again.
  useEffect(() => {
    apiClient.onSessionExpired = () => {
      setUser(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    };
    return () => {
      apiClient.onSessionExpired = null;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiClient.login({ email, password });
      setUser({ user_id: res.user_id, name: res.name });
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const res = await apiClient.signup({ email, password, name });
      if (res.status === 'logged_in' && res.user_id) {
        setUser({ user_id: res.user_id, name: res.name || name });
      }
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
