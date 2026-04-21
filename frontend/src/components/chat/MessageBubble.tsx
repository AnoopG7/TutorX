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
        className={`max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none'
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>

        {citations && citations.length > 0 && !isUser && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-2">
            {citations.map((citation) => (
              <CitationTag key={citation.chunk_id} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
