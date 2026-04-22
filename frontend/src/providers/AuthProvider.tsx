/**
 * AuthProvider — Manages auth state and provides auth methods
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { apiClient, type AuthResponse, type SignupResponse } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthResponse | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<SignupResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredAuth(): { user: AuthResponse | null; isAuthenticated: boolean } {
  const token = localStorage.getItem('auth-token');
  const userData = localStorage.getItem('auth-user');
  if (!token || !userData) return { user: null, isAuthenticated: false };
  try {
    return { user: JSON.parse(userData) as AuthResponse, isAuthenticated: true };
  } catch {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    return { user: null, isAuthenticated: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth();
  const [user, setUser] = useState<AuthResponse | null>(stored.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(stored.isAuthenticated);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.login({ email, password });
      setUser(response);
      localStorage.setItem('auth-user', JSON.stringify(response));
      setIsAuthenticated(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<SignupResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.signup({ email, password, name });
      if (response.status === 'logged_in' && response.token) {
        const authUser: AuthResponse = {
          token: response.token,
          user_id: response.user_id || '',
          name: response.name || '',
        };
        setUser(authUser);
        localStorage.setItem('auth-user', JSON.stringify(authUser));
        setIsAuthenticated(true);
      }
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Signup failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth-user');
    localStorage.removeItem('auth-token');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
