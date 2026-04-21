/**
 * useProfile Hook — Load and manage student profile
 */

import { useEffect, useState } from 'react';
import { apiClient, type ProfileResponse } from '@/lib/api';

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getProfile(userId);
        setProfile(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<ProfileResponse>) => {
    if (!userId) return;

    try {
      const updated = await apiClient.updateProfile(userId, updates);
      setProfile(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update profile');
      setError(error);
      throw error;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}
