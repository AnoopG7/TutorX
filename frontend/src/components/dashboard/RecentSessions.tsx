/**
 * RecentSessions — Session history list
 */

interface Session {
  id: string;
  subject: string;
  chapter: string;
  timestamp: Date;
  messageCount: number;
}

interface RecentSessionsProps {
  sessions: Session[];
  loading?: boolean;
  onOpenSession?: (sessionId: string) => void;
}

export function RecentSessions({ sessions, loading, onOpenSession }: RecentSessionsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground mb-4">Recent Sessions</h2>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <h2 className="font-semibold text-foreground mb-2">Recent Sessions</h2>
        <p className="text-muted-foreground text-sm">No sessions yet. Start a new chat to begin!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-semibold text-foreground mb-4">Recent Sessions</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onOpenSession?.(session.id)}
            className="flex items-center justify-between p-3 rounded border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex-1">
              <p className="font-medium text-foreground">{session.subject}</p>
              <p className="text-sm text-muted-foreground">{session.chapter}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
