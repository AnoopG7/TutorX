/**
 * AuthProvider — Manages auth state and provides auth methods
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient, type AuthResponse } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthResponse | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    const userData = localStorage.getItem('auth-user');

    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
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
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.signup({ email, password, name });
      setUser(response);
      localStorage.setItem('auth-user', JSON.stringify(response));
      setIsAuthenticated(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Signup failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth-user');
    localStorage.removeItem('auth-token');
  };

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
