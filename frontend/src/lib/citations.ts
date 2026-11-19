/**
 * Parse the citation strings the backend builds in RetrievedChunk.citation_label():
 *   "{subject} — {chapter}, {section} ({page_reference})"
 * where section and page are optional. Chapter titles may contain commas, so
 * the section is only split off when it looks like a numbered heading ("5.2 …").
 */

import type { SourceRef } from './api';

export interface Source {
  key: string;
  raw: string;
  subject?: string;
  chapter: string;
  section?: string;
  pages: string[];
}

const LABEL_RE = /^(?<subject>.+?)\s+—\s+(?<rest>.+?)(?:\s+\((?<page>Page\s+\d+)\))?$/i;
const SECTION_RE = /^(?<chapter>.+?),\s+(?<section>\d+(?:\.\d+)+\s+.+)$/;

export function parseCitation(raw: string): Omit<Source, 'key' | 'pages'> & { page?: string } {
  const m = raw.trim().match(LABEL_RE);
  if (!m?.groups) return { raw, chapter: raw.trim() };

  const { subject, rest, page } = m.groups;
  const s = rest.match(SECTION_RE);
  return {
    raw,
    subject,
    chapter: (s?.groups?.chapter ?? rest).trim(),
    section: s?.groups?.section?.trim(),
    page,
  };
}

/** Structured sources from the API → display sources. */
export function fromRefs(refs: SourceRef[]): Source[] {
  return refs.map((r) => ({
    key: `${r.subject ?? ''}|${r.chapter}|${r.section ?? ''}`,
    raw: r.label,
    subject: r.subject ?? undefined,
    chapter: r.chapter,
    section: r.section ?? undefined,
    pages: r.pages ?? [],
  }));
}

/** Group chunks from the same chapter + section into one source, merging page numbers. */
export function toSources(citations: string[] | undefined): Source[] {
  if (!citations?.length) return [];
  const map = new Map<string, Source>();

  for (const raw of citations) {
    const { page, ...parsed } = parseCitation(raw);
    const key = `${parsed.subject ?? ''}|${parsed.chapter}|${parsed.section ?? ''}`;
    const existing = map.get(key);
    const pageNum = page?.replace(/page\s+/i, '');
    if (existing) {
      if (pageNum && !existing.pages.includes(pageNum)) existing.pages.push(pageNum);
    } else {
      map.set(key, { ...parsed, key, pages: pageNum ? [pageNum] : [] });
    }
  }

  for (const src of map.values()) {
    src.pages.sort((a, b) => Number(a) - Number(b));
  }
  return [...map.values()];
}

/** "Chapter 5: The Fundamental Unit of Life" → { number: "5", title: "The Fundamental Unit of Life" } */
export function splitChapter(chapter: string): { number?: string; title: string } {
  const m = chapter.match(/^chapter\s+(\d+)\s*[:.\-–—]?\s*(.*)$/i);
  if (!m) return { title: chapter };
  return { number: m[1], title: m[2] || `Chapter ${m[1]}` };
}

/**
 * LLMs often write math as \( … \) and \[ … \], which remark-math ignores.
 * Convert those delimiters to $ / $$ so KaTeX can render them.
 */
export function normalizeMath(md: string): string {
  return md
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `\n$$\n${expr.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr.trim()}$`);
}
