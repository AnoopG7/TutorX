/**
 * WelcomeCard — Greeting + quick summary
 */

import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/providers/AuthProvider';

export function WelcomeCard() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const { profile, loading } = useProfile(userId || '');

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 h-32 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h1 className="text-3xl font-bold text-foreground">
        Welcome, {profile?.name || 'Student'}! 👋
      </h1>
      <p className="mt-2 text-muted-foreground">
        Grade {profile?.grade} • {profile?.subjects?.join(', ') || 'No subjects selected'}
      </p>
      <div className="mt-4 flex gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{profile?.total_sessions || 0}</p>
          <p className="text-sm text-muted-foreground">Sessions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{profile?.mastered_topics?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Mastered</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-500">{profile?.weak_areas?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Weak Areas</p>
        </div>
      </div>
    </div>
  );
}
