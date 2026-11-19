/**
 * Message rendering.
 * - Student questions: a compact note, right-aligned.
 * - Tutor answers: full-width reading text with sources in the margin.
 */
import { useMemo, useState } from 'react';
import { BookX, Check, Copy, RotateCcw } from 'lucide-react';
import { Markdown } from './Markdown';
import { SourcesInline, SourcesMargin } from './Sources';
import { fromRefs, toSources } from '@/lib/citations';
import type { SourceRef } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Structured sources from the API (also stored in history for new answers). */
  sources?: SourceRef[];
  /** Plain labels, the fallback for older responses. */
  citations?: string[];
  /** False when no textbook passage was found; undefined when unknown (old history). */
  grounded?: boolean;
  failed?: boolean;
  /** For failed answers: the question to retry. */
  retryOf?: string;
}

export function QuestionNote({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[0.95rem] leading-relaxed text-accent-foreground">
        {content}
      </p>
    </div>
  );
}

interface AnswerProps {
  message: Message;
  isLatest: boolean;
  onFollowUp?: (text: string) => void;
  onRetry?: (question: string) => void;
}

const FOLLOW_UPS = [
  { label: 'Explain it more simply', prompt: 'Explain that again more simply, with an everyday example.' },
  { label: 'Quiz me on this', prompt: 'Quiz me on this with 3 questions. Wait for my answers before telling me the solutions.' },
  { label: 'Give me exam points', prompt: 'Summarise this as the key points I should write in a CBSE exam answer.' },
];

export function Answer({ message, isLatest, onFollowUp, onRetry }: AnswerProps) {
  const sources = useMemo(
    () => (message.sources?.length ? fromRefs(message.sources) : toSources(message.citations)),
    [message.sources, message.citations],
  );
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (message.failed) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
        <p className="font-medium text-destructive">The tutor didn’t respond.</p>
        <p className="mt-0.5 text-muted-foreground">{message.content}</p>
        {message.retryOf && onRetry && (
          <button
            onClick={() => onRetry(message.retryOf!)}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Ask again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-x-10 xl:grid-cols-[minmax(0,1fr)_13.5rem]">
      <div className="min-w-0">
        {message.grounded === false && (
          <p className="mb-3 flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <BookX className="mt-px h-3.5 w-3.5 shrink-0" />
            This wasn’t found in your textbook, so the answer is from general knowledge. Check it against your book.
          </p>
        )}
        <Markdown content={message.content} />
        <SourcesInline sources={sources} />

        <div className={cn('mt-4 flex flex-wrap items-center gap-1.5', !isLatest && 'opacity-70')}>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Copy answer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {isLatest &&
            onFollowUp &&
            FOLLOW_UPS.map((f) => (
              <button
                key={f.label}
                onClick={() => onFollowUp(f.prompt)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {f.label}
              </button>
            ))}
        </div>
      </div>
      <SourcesMargin sources={sources} />
    </div>
  );
}

export function Thinking({ subject }: { subject?: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="status" aria-live="polite">
      <div className="relative h-2.5 w-16 overflow-hidden rounded-full bg-muted">
        <span className="sweep absolute inset-0 rounded-full bg-highlight" />
      </div>
      <span className="text-sm text-muted-foreground">
        Searching your {subject ? `${subject} ` : ''}textbook…
      </span>
    </div>
  );
}
