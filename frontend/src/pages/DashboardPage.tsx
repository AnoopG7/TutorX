/**
 * Home (signed in) — ask straight away, pick a book, or pick up a session.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/providers/SessionsProvider';
import { ChatInput } from '@/components/chat/ChatInput';
import { SUBJECT_LIST, getSubject, normalizeSubject } from '@/lib/constants';
import { relativeTime } from '@/lib/dates';
import { cn } from '@/lib/utils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.user_id || '');
  const { sessions, loading } = useSessions();
  const [subject, setSubject] = useState<string | undefined>();

  const firstName = (profile?.name || user?.name || 'there').split(' ')[0];
  const mySubjects = (profile?.subjects ?? []).map(normalizeSubject);
  const orderedSubjects = [
    ...SUBJECT_LIST.filter((s) => mySubjects.includes(s.id)),
    ...SUBJECT_LIST.filter((s) => !mySubjects.includes(s.id)),
  ];
  const weak = profile?.weak_areas ?? [];
  const mastered = profile?.mastered_topics ?? [];

  const ask = (q: string, subj = subject) => {
    const p = new URLSearchParams({ q });
    if (subj) p.set('subject', subj);
    navigate(`/chat?${p}`);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <header>
          <p className="text-sm text-muted-foreground">
            {greeting()}, {firstName}
          </p>
          <h1 className="mt-1 font-serif text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.6rem]">
            What would you like to understand today?
          </h1>
        </header>

        <div className="mt-6">
          <ChatInput
            onSend={(q) => ask(q)}
            subject={subject}
            onSubjectChange={setSubject}
            autoFocus={false}
          />
        </div>

        {/* Subjects */}
        <section className="mt-12" aria-labelledby="books">
          <div className="flex items-baseline justify-between">
            <h2 id="books" className="font-serif text-lg font-semibold">
              Your books
            </h2>
            <span className="text-xs text-muted-foreground">NCERT</span>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {orderedSubjects.map((s) => (
              <li key={s.id} className="bg-card sm:[&:last-child:nth-child(odd)]:col-span-2">
                <Link
                  to={`/chat?subject=${encodeURIComponent(s.id)}`}
                  className="group flex h-full items-start gap-3 p-4 transition-colors hover:bg-muted/60"
                >
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md', s.tint)}>
                    <s.icon className={cn('h-[1.1rem] w-[1.1rem]', s.ink)} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{s.label}</span>
                    <span className="block truncate text-sm text-muted-foreground">{s.books === s.label ? 'NCERT textbook' : s.books}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Starter questions: one per subject */}
        <section className="mt-12" aria-labelledby="try">
          <h2 id="try" className="font-serif text-lg font-semibold">
            Try asking
          </h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {orderedSubjects.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => ask(s.prompts[0], s.id)}
                  className="group flex w-full items-center gap-3 py-3 text-left font-serif text-[1.02rem] text-foreground/90 hover:text-foreground"
                >
                  <s.icon className={cn('h-4 w-4 shrink-0', s.ink)} aria-label={s.label} />
                  <span className="group-hover:marker">{s.prompts[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent sessions: phones only. On wider screens the sidebar already lists them. */}
        {(loading || sessions.length > 0) && (
          <section className="mt-12 md:hidden" aria-labelledby="recent">
            <h2 id="recent" className="font-serif text-lg font-semibold">
              Pick up where you left off
            </h2>
            {loading ? (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {sessions.slice(0, 5).map((s) => {
                  const subj = getSubject(s.subject);
                  return (
                    <li key={s.id}>
                      <Link to={`/chat?session=${s.id}`} className="group flex items-center gap-3 py-3">
                        {subj ? (
                          <subj.icon className={cn('h-4 w-4 shrink-0', subj.ink)} aria-label={subj.label} />
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate group-hover:underline group-hover:underline-offset-4">
                          {s.title || 'Untitled question'}
                        </span>
                        <time className="shrink-0 text-xs text-muted-foreground" dateTime={s.created_at}>
                          {relativeTime(s.created_at)}
                        </time>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Progress, only when the tutor has learned something about the student */}
        {(weak.length > 0 || mastered.length > 0) && (
          <section className="mt-12 grid gap-8 sm:grid-cols-2" aria-label="Your progress">
            {weak.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-semibold">Worth revising</h2>
                <p className="mt-1 text-sm text-muted-foreground">Topics you found tricky. Tap one to go over it again.</p>
                <ul className="mt-3 space-y-1.5">
                  {weak.slice(0, 6).map((w) => (
                    <li key={w.topic}>
                      <button
                        onClick={() => ask(`Help me revise ${w.topic}. Start with what I usually get wrong.`)}
                        className="text-left text-sm hover:marker"
                      >
                        {w.topic}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mastered.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-semibold">You’ve got these</h2>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {mastered.slice(0, 12).map((t) => (
                    <li key={t} className="rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
