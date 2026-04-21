/**
 * DashboardPage — Landing page with subject cards + recent sessions
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { SubjectCard } from '@/components/dashboard/SubjectCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { SUBJECTS } from '@/lib/constants';
import { apiClient, type Session } from '@/lib/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Load sessions from backend API on mount
  useEffect(() => {
    if (!user?.user_id) return;

    const loadSessions = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getSessions(user.user_id);
        setSessions(response.sessions);
        console.log('✅ Loaded sessions from backend:', response.sessions.length);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [user?.user_id]);

  const handleOpenSession = (sessionId: string) => {
    navigate(`/chat?session=${sessionId}`);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeCard />

      {/* Quick Actions */}
      <QuickActions />

      {/* Subjects Grid */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Your Subjects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(SUBJECTS) as Array<keyof typeof SUBJECTS>).map((subject) => (
            <SubjectCard key={subject} subject={subject} chapterCount={12} />
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <RecentSessions sessions={sessions} loading={loading} onOpenSession={handleOpenSession} />
    </div>
  );
}
