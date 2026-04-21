/**
 * MessageBubble — Single message with markdown rendering
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CitationTag } from './CitationTag';

interface Citation {
  chunk_id: string;
  source: string;
  score: number;
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export function MessageBubble({ role, content, citations }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl px-5 py-3 rounded-lg leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none shadow-sm'
            : 'bg-card border border-border text-foreground rounded-bl-none shadow-sm'
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1.5 [&>p]:leading-normal [&>ul]:my-2 [&>ol]:my-2 [&>li]:my-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>

        {citations && citations.length > 0 && !isUser && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-3">
            {citations.map((citation) => (
              <CitationTag key={citation.chunk_id} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
