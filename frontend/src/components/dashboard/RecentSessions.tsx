/**
 * RecentSessions — Chat history list styled like Claude/ChatGPT sidebar
 * Groups sessions by time period (Today, Yesterday, This Week, Earlier)
 */

import { MessageCircle } from 'lucide-react';
import type { Session } from '@/lib/api';

interface RecentSessionsProps {
  sessions: Session[];
  loading?: boolean;
  onOpenSession?: (sessionId: string) => void;
}

function parseUTCDate(dateString: string): Date {
  // Backend stores UTC timestamps. If the string doesn't end with Z or +00:00,
  // append Z so the browser treats it as UTC (not local time).
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
    dateString = dateString + 'Z';
  }
  return new Date(dateString);
}

function getRelativeTime(dateString: string): string {
  const date = parseUTCDate(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

type TimeGroup = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

function getTimeGroup(dateString: string): TimeGroup {
  const date = parseUTCDate(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This week';
  return 'Earlier';
}

function groupSessions(sessions: Session[]): Map<TimeGroup, Session[]> {
  const groups = new Map<TimeGroup, Session[]>();

  for (const session of sessions) {
    const group = getTimeGroup(session.created_at);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(session);
  }

  return groups;
}

export function RecentSessions({ sessions, loading, onOpenSession }: RecentSessionsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No conversations yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Start a chat to see your history here</p>
      </div>
    );
  }

  const grouped = groupSessions(sessions);
  const groupOrder: TimeGroup[] = ['Today', 'Yesterday', 'This week', 'Earlier'];

  return (
    <div className="space-y-6">
      {groupOrder.map((group) => {
        const groupSessions = grouped.get(group);
        if (!groupSessions || groupSessions.length === 0) return null;

        return (
          <div key={group}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {group}
            </h3>
            <div className="space-y-1">
              {groupSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onOpenSession?.(session.id)}
                  className="w-full text-left group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors duration-150"
                >
                  <MessageCircle className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {session.title || 'New conversation'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {session.subject && (
                        <span className="text-muted-foreground/80">{session.subject} · </span>
                      )}
                      {getRelativeTime(session.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
