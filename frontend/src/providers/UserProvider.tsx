/**
 * UserProvider — User ID persistence and context
 */

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

interface UserContextType {
  userId: string;
  setUserId: (id: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Generate a v4 UUID string (RFC 4122)
 * Used for Supabase compatibility (expects UUID type for user_id)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate if a string is a proper UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>('');

  // Load user_id from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tutorx-user-id');
    
    // Check if stored ID is valid UUID format
    if (stored && isValidUUID(stored)) {
      setUserIdState(stored);
    } else {
      // Generate new UUID if none exists or if stored one is invalid
      const newId = generateUUID();
      localStorage.setItem('tutorx-user-id', newId);
      setUserIdState(newId);
    }
  }, []);

  const setUserId = (id: string) => {
    setUserIdState(id);
    localStorage.setItem('tutorx-user-id', id);
  };

  return (
    <UserContext.Provider value={{ userId, setUserId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
