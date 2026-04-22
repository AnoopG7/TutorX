/**
 * MessageBubble — Single message with markdown rendering
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationTag } from "./CitationTag";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Citation {
  chunk_id: string;
  source: string;
  score: number;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function MessageBubble({
  role,
  content,
  citations,
}: MessageBubbleProps) {
  const [showCitations, setShowCitations] = useState(false);
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-5 py-3.5 rounded-2xl leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-xl rounded-tr-xl"
            : "bg-card border border-border text-foreground rounded-bl-xl rounded-tl-xl"
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1.5 [&>p]:leading-normal [&>ul]:my-2 [&>ol]:my-2 [&>li]:my-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>

        {citations && citations.length > 0 && !isUser && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCitations ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {citations.length} source{citations.length > 1 ? "s" : ""}
            </button>

            {showCitations && (
              <div className="mt-2 flex flex-wrap gap-2 animate-in slide-in-from-top-1 duration-200">
                {citations.map((citation) => (
                  <CitationTag key={citation.chunk_id} citation={citation} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
