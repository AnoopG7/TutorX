/**
 * CitationTag — Inline citation badge with source reference
 */

import { FileText } from 'lucide-react';

interface Citation {
  chunk_id: string;
  source: string;
  score: number;
}

interface CitationTagProps {
  citation: Citation;
}

export function CitationTag({ citation }: CitationTagProps) {
  // Extract chapter from source (e.g., "Chapter 5: Cell Structure" -> "Ch. 5")
  const chapterMatch = citation.source.match(/Chapter (\d+)/i);
  const chapterNum = chapterMatch ? chapterMatch[1] : '?';

  return (
    <button
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-border bg-muted hover:bg-muted/80 transition-colors"
      title={citation.source}
    >
      <FileText className="h-3 w-3" />
      <span>Ch. {chapterNum}</span>
    </button>
  );
}
