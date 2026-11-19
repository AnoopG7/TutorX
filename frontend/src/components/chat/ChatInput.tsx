/**
 * ChatInput — question composer with a subject picker.
 * Enter sends, Shift+Enter adds a line.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, Loader2 } from 'lucide-react';
import { SUBJECT_LIST, getSubject } from '@/lib/constants';
import { cn } from '@/lib/utils';

const MAX_LEN = 2000;

interface ChatInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
  subject?: string;
  onSubjectChange?: (subject: string | undefined) => void;
  /** Lock the subject once a conversation has started. */
  subjectLocked?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  loading,
  subject,
  onSubjectChange,
  subjectLocked,
  placeholder = 'Ask a question from your NCERT textbook…',
  autoFocus = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const current = getSubject(subject);

  useEffect(() => {
    if (autoFocus && !loading) ref.current?.focus();
  }, [loading, autoFocus]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [message]);

  const canSend = message.trim().length > 0 && !loading;

  const submit = () => {
    if (!canSend) return;
    onSend(message.trim());
    setMessage('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-xl border border-input bg-card shadow-[0_1px_0_rgba(27,35,64,0.04),0_8px_24px_-12px_rgba(27,35,64,0.18)] transition-colors focus-within:border-primary/60"
    >
      <label htmlFor="question" className="sr-only">
        Your question
      </label>
      <textarea
        id="question"
        ref={ref}
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus-visible:outline-none"
      />
      <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
        {onSubjectChange && (
          <div className="relative">
            <label htmlFor="subject" className="sr-only">
              Subject
            </label>
            {current && (
              <current.icon
                className={cn('pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2', current.ink)}
                aria-hidden
              />
            )}
            <select
              id="subject"
              value={current?.id ?? ''}
              disabled={subjectLocked}
              onChange={(e) => onSubjectChange(e.target.value || undefined)}
              className={cn(
                'h-8 appearance-none rounded-md border border-border bg-background pr-7 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-default disabled:opacity-80 disabled:hover:bg-background',
                current ? 'pl-7' : 'pl-2.5',
              )}
              title={subjectLocked ? 'Start a new question to change subject' : 'Search only this subject’s textbooks'}
            >
              <option value="">All subjects</option>
              {SUBJECT_LIST.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </div>
        )}
        <span className="ml-auto hidden text-[0.7rem] text-muted-foreground sm:inline">
          {message.length > MAX_LEN * 0.8 ? `${message.length}/${MAX_LEN}` : 'Shift + Enter for a new line'}
        </span>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Ask"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35 sm:ml-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
