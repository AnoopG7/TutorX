/**
 * DashboardPage — Landing page with subject cards + recent sessions
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { SubjectCard } from '@/components/dashboard/SubjectCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { SUBJECTS } from '@/lib/constants';

interface StoredSession {
  id: string;
  subject: string;
  chapter: string;
  timestamp: number;
  messageCount: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('chat_sessions');
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse sessions:', e);
      }
    }
  }, []);

  const handleOpenSession = (sessionId: string) => {
    navigate(`/chat?session=${sessionId}`);
  };

  // Convert stored sessions for display
  const mockSessions = sessions.map((s) => ({
    ...s,
    timestamp: new Date(s.timestamp),
  }));

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
      <RecentSessions sessions={mockSessions} loading={false} onOpenSession={handleOpenSession} />
    </div>
  );
}
