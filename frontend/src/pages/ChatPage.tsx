/**
 * ChatPage — one study session.
 *
 * URL is the source of truth:
 *   /chat                     → new question
 *   /chat?subject=Science     → new question, scoped to a subject
 *   /chat?q=...               → ask this immediately (from Home suggestions)
 *   /chat?session=<id>        → reopen a saved session
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useAuth } from '@/providers/AuthProvider';
import { useSessions } from '@/providers/SessionsProvider';
import { apiClient, APIError, type SessionMessage } from '@/lib/api';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { SUBJECT_LIST, getSubject, normalizeSubject } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { user } = useAuth();
  const { sessions, refresh } = useSessions();
  const userId = user?.user_id;
  const [params, setParams] = useSearchParams();
  const urlSession = params.get('session') || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [subject, setSubject] = useState<string | undefined>(() => normalizeSubject(params.get('subject')));
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  // Tracks the session currently shown, so adopting a newly-created id
  // into the URL doesn't trigger a reload of the same conversation.
  const shownSession = useRef('');
  // Bumped on every reset; in-flight answers for an older view are dropped.
  const viewGen = useRef(0);
  const urlSubject = params.get('subject');

  // React to the URL's session changing (sidebar click, back/forward, "New question").
  useEffect(() => {
    if (urlSession === shownSession.current) return;
    shownSession.current = urlSession;
    viewGen.current += 1;
    /* eslint-disable react-hooks/set-state-in-effect -- syncing local state to the URL */
    setSessionId(urlSession);
    setMessages([]);
    setLoading(false);
    setHistoryError(false);
    setHistoryLoading(false);
    if (!urlSession) {
      setSubject(normalizeSubject(urlSubject));
      return;
    }
    if (!userId) return;
    setHistoryLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    let cancelled = false;
    let done = false;
    apiClient
      .getSessionHistory(userId, urlSession)
      .then((res) => {
        if (cancelled) return;
        setMessages(
          (res.messages ?? [])
            .filter((m: SessionMessage) => m.role === 'user' || m.role === 'assistant')
            .map((m: SessionMessage) => ({ id: m.id || nanoid(), role: m.role, content: m.content, sources: m.sources })),
        );
      })
      .catch(() => !cancelled && setHistoryError(true))
      .finally(() => {
        done = true;
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
      // If the load was interrupted (StrictMode re-run, fast navigation),
      // forget it so the next effect run fetches again.
      if (!done) shownSession.current = '';
    };
  }, [urlSession, userId, urlSubject]);

  // Subject of a reopened session comes from the session list.
  const sessionSubject = sessions.find((s) => s.id === sessionId)?.subject;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sessionSubject) setSubject(normalizeSubject(sessionSubject));
  }, [sessionSubject]);

  const send = useCallback(
    async (text: string) => {
      if (!userId || loading) return;
      const gen = viewGen.current;
      setMessages((prev) => {
        const kept = prev.filter((m) => !m.failed);
        const last = kept[kept.length - 1];
        // Retrying: the question is already shown, don't add it twice.
        if (last?.role === 'user' && last.content === text) return kept;
        return [...kept, { id: nanoid(), role: 'user', content: text }];
      });
      setLoading(true);
      try {
        const res = await apiClient.chat({
          message: text,
          subject,
          session_id: sessionId || undefined,
        });
        if (gen !== viewGen.current) return; // student moved to another conversation
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: 'assistant',
            content: res.response,
            sources: res.sources,
            citations: res.citations,
            grounded: res.grounded,
          },
        ]);
        if (res.session_id && res.session_id !== sessionId) {
          shownSession.current = res.session_id;
          setSessionId(res.session_id);
          setParams({ session: res.session_id }, { replace: true });
          void refresh();
        }
      } catch (err) {
        const reason =
          err instanceof APIError && err.status >= 500
            ? 'The server hit an error. It may still be starting up.'
            : err instanceof TypeError
              ? 'Can’t reach the server. Check your connection, or wait while it wakes up.'
              : err instanceof Error
                ? err.message
                : 'Something went wrong.';
        if (gen !== viewGen.current) return;
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: 'assistant', content: reason, failed: true, retryOf: text },
        ]);
      } finally {
        if (gen === viewGen.current) setLoading(false);
      }
    },
    [userId, loading, subject, sessionId, setParams, refresh],
  );

  // ?q= from the Home page: ask once, then clean the URL.
  const askedQ = useRef(false);
  const q = params.get('q');
  useEffect(() => {
    if (!q || askedQ.current || !userId) return;
    askedQ.current = true;
    const next = new URLSearchParams(params);
    next.delete('q');
    setParams(next, { replace: true });
    void send(q);
  }, [q, userId, params, setParams, send]);

  const current = getSubject(subject);

  const emptyState = (
    <div className="mx-auto max-w-2xl pt-[8vh]">
      <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
        {current ? `What are you studying in ${current.label}?` : 'What are you studying today?'}
      </h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        {current
          ? `Answers will come from your NCERT ${current.books} textbook${current.books.includes(',') ? 's' : ''}, with the chapter and page.`
          : 'Ask anything from your NCERT books. Pick a subject below to search only that book.'}
      </p>

      {!current && (
        <div className="mt-6 flex flex-wrap gap-2">
          {SUBJECT_LIST.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubject(s.id)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm hover:border-primary/40"
            >
              <s.icon className={cn('h-4 w-4', s.ink)} />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {current && (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {current.prompts.map((p) => (
            <li key={p}>
              <button
                onClick={() => send(p)}
                className="group flex w-full items-center gap-3 py-3.5 text-left font-serif text-[1.05rem] text-foreground/90 hover:text-foreground"
              >
                <current.icon className={cn('h-4 w-4 shrink-0', current.ink)} aria-hidden />
                <span className="group-hover:marker">{p}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {historyError ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-sm">
            <p className="font-serif text-xl font-semibold">This conversation couldn’t be loaded</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The server didn’t return its history. It may be waking up. Try again in a minute, or start a new question.
            </p>
            <button
              onClick={() => setParams({}, { replace: false })}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Start a new question
            </button>
          </div>
        </div>
      ) : (
        <ChatInterface
          messages={messages}
          onSendMessage={send}
          loading={loading}
          historyLoading={historyLoading}
          subject={subject}
          onSubjectChange={setSubject}
          subjectLocked={messages.length > 0 || !!sessionId}
          emptyState={emptyState}
        />
      )}
    </div>
  );
}
