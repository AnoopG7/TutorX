/**
 * ChatInterface — scrolling transcript with the composer pinned in flow
 * at the bottom (no fixed positioning, so it never overlaps the sidebar).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Answer, QuestionNote, Thinking, type Message } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { getSubject } from '@/lib/constants';

export type { Message };

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading?: boolean;
  historyLoading?: boolean;
  subject?: string;
  onSubjectChange?: (subject: string | undefined) => void;
  subjectLocked?: boolean;
  emptyState?: React.ReactNode;
}

export function ChatInterface({
  messages,
  onSendMessage,
  loading,
  historyLoading,
  subject,
  onSubjectChange,
  subjectLocked,
  emptyState,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const subjectLabel = getSubject(subject)?.label;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distance < 120;
    setShowJump(distance > 400);
  };

  // Follow new content only if the student hasn't scrolled up to re-read.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // When the student sends a message, always bring it into view.
  const lastRole = messages[messages.length - 1]?.role;
  useEffect(() => {
    if (lastRole === 'user') {
      pinnedRef.current = true;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [lastRole, messages.length]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.failed);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-6 sm:px-6 xl:max-w-[60rem]">
          {historyLoading ? (
            <div className="space-y-4 pt-4" aria-busy="true">
              <div className="ml-auto h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ) : messages.length === 0 ? (
            emptyState
          ) : (
            <div className="flex flex-col gap-7">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <QuestionNote key={m.id} content={m.content} />
                ) : (
                  <Answer
                    key={m.id}
                    message={m}
                    isLatest={!loading && m.id === lastAssistant?.id}
                    onFollowUp={onSendMessage}
                    onRetry={onSendMessage}
                  />
                ),
              )}
              {loading && <Thinking subject={subjectLabel} />}
            </div>
          )}
        </div>
      </div>

      {showJump && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
          className="absolute bottom-32 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card p-2 text-muted-foreground shadow-md hover:text-foreground"
          aria-label="Jump to latest"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      <div className="shrink-0 bg-gradient-to-t from-background via-background to-background/0 px-4 pb-4 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            onSend={onSendMessage}
            loading={loading}
            subject={subject}
            onSubjectChange={onSubjectChange}
            subjectLocked={subjectLocked}
          />
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
            Answers come from your NCERT textbooks. Check important facts in your book.
          </p>
        </div>
      </div>
    </div>
  );
}
