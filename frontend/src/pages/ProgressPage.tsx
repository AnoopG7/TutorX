/**
 * ProgressPage — Learning progress, weak areas, mastered topics
 */

import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { Zap, TrendingUp, Award } from 'lucide-react';

export default function ProgressPage() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const { profile, loading } = useProfile(userId || '');

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading progress...</div>;
  }

  const stats = [
    {
      icon: TrendingUp,
      label: 'Total Sessions',
      value: profile?.total_sessions || 0,
      color: 'text-blue-500',
    },
    {
      icon: Award,
      label: 'Mastered Topics',
      value: profile?.mastered_topics?.length || 0,
      color: 'text-green-500',
    },
    {
      icon: Zap,
      label: 'Weak Areas',
      value: profile?.weak_areas?.length || 0,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Mastered Topics */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Mastered Topics</h2>
        {profile?.mastered_topics && profile.mastered_topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.mastered_topics.map((topic, i) => (
              <span
                key={i}
                className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm dark:bg-green-900 dark:text-green-100"
              >
                ✓ {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No topics mastered yet. Keep practicing!</p>
        )}
      </div>

      {/* Weak Areas */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Weak Areas</h2>
        {profile?.weak_areas && profile.weak_areas.length > 0 ? (
          <div className="space-y-2">
            {profile.weak_areas.map((area, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
              >
                <span className="text-amber-900 dark:text-amber-100">{area.topic}</span>
                {area.score && (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Score: {Math.round(area.score * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Great job! No weak areas identified.</p>
        )}
      </div>
    </div>
  );
}
