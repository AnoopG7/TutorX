/**
 * Sources — the NCERT passages an answer was grounded in.
 * Rendered as margin notes beside the answer on wide screens, and as a
 * compact list beneath it on smaller ones.
 */
import { useState } from 'react';
import { BookMarked, ChevronDown } from 'lucide-react';
import { splitChapter, type Source } from '@/lib/citations';
import { getSubject } from '@/lib/constants';
import { cn } from '@/lib/utils';

function pagesLabel(pages: string[]) {
  if (pages.length === 0) return null;
  return pages.length === 1 ? `p. ${pages[0]}` : `pp. ${pages.join(', ')}`;
}

function SourceItem({ source }: { source: Source }) {
  const subject = getSubject(source.subject);
  const { number, title } = splitChapter(source.chapter);
  const pages = pagesLabel(source.pages);

  return (
    <li className="relative pl-3.5">
      <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-highlight" />
      <p className={cn('text-[0.7rem] font-medium', subject?.ink ?? 'text-muted-foreground')}>
        {subject?.label ?? source.subject ?? 'NCERT'}
        {number && <span className="text-muted-foreground"> / Chapter {number}</span>}
      </p>
      <p className="mt-0.5 font-serif text-[0.9rem] leading-snug text-foreground">{title}</p>
      {(source.section || pages) && (
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {source.section}
          {source.section && pages ? ', ' : ''}
          {pages}
        </p>
      )}
    </li>
  );
}

export function SourcesMargin({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <aside aria-label="Sources from your textbook" className="hidden xl:block">
      <div className="sticky top-6">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BookMarked className="h-3.5 w-3.5" />
          From your textbook
        </p>
        <ol className="space-y-4">
          {sources.map((s) => (
            <SourceItem key={s.key} source={s} />
          ))}
        </ol>
      </div>
    </aside>
  );
}

export function SourcesInline({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  const first = sources[0];
  const firstChapter = splitChapter(first.chapter);

  return (
    <div className="mt-5 rounded-lg border border-border bg-card/60 xl:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-muted-foreground hover:text-foreground"
      >
        <BookMarked className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-foreground">
            {sources.length === 1 ? '1 textbook source' : `${sources.length} textbook sources`}
          </span>
          <span className="hidden sm:inline">
            {' '}
            including {firstChapter.number ? `Chapter ${firstChapter.number}, ` : ''}
            {firstChapter.title}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ol className="space-y-3.5 border-t border-border px-3.5 py-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {sources.map((s) => (
            <SourceItem key={s.key} source={s} />
          ))}
        </ol>
      )}
    </div>
  );
}
