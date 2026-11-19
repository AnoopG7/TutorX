/**
 * Constants — the single source of truth for subjects and teaching styles.
 *
 * IMPORTANT: subject `id`s must match the `subject` column written by the
 * ingestion scripts (backend/scripts/batch_ingest.py). The backend uses this
 * exact string as a pgvector filter, so a mismatch silently disables grounding.
 */
import { Calculator, FlaskConical, Globe2, BookOpenText, Languages, type LucideIcon } from 'lucide-react';

export interface SubjectConfig {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Tailwind classes for the subject's ink colour (text) and tint (bg). */
  ink: string;
  tint: string;
  books: string;
  prompts: string[];
}

export const SUBJECT_LIST: SubjectConfig[] = [
  {
    id: 'Science',
    label: 'Science',
    short: 'Sci',
    icon: FlaskConical,
    ink: 'text-emerald-700 dark:text-[#A6CF97]',
    tint: 'bg-emerald-600/10 dark:bg-[#A6CF97]/10',
    books: 'Science',
    prompts: [
      'Why is the cell called the basic unit of life?',
      'Explain Newton’s third law with an example',
      'What is the difference between mass and weight?',
    ],
  },
  {
    id: 'Mathematics',
    label: 'Mathematics',
    short: 'Maths',
    icon: Calculator,
    ink: 'text-blue-700 dark:text-[#9DBBD8]',
    tint: 'bg-blue-600/10 dark:bg-[#9DBBD8]/10',
    books: 'Mathematics',
    prompts: [
      'Show that √2 is irrational',
      'How do I factorise x³ − 23x² + 142x − 120?',
      'Explain Heron’s formula with a worked example',
    ],
  },
  {
    id: 'Social Science',
    label: 'Social Science',
    short: 'SST',
    icon: Globe2,
    ink: 'text-amber-700 dark:text-[#E3C463]',
    tint: 'bg-amber-500/12 dark:bg-[#E3C463]/10',
    books: 'History, Geography, Political Science, Economics',
    prompts: [
      'What were the main causes of the French Revolution?',
      'Why is democracy considered a better form of government?',
      'Explain the monsoon and its effect on India',
    ],
  },
  {
    id: 'English',
    label: 'English',
    short: 'Eng',
    icon: BookOpenText,
    ink: 'text-violet-700 dark:text-[#C1B3DA]',
    tint: 'bg-violet-600/10 dark:bg-[#C1B3DA]/10',
    books: 'Beehive, Moments',
    prompts: [
      'Summarise “The Fun They Had”',
      'What is the theme of “The Road Not Taken”?',
      'Describe the character of Evelyn Glennie',
    ],
  },
  {
    id: 'Hindi',
    label: 'Hindi',
    short: 'Hin',
    icon: Languages,
    ink: 'text-rose-700 dark:text-[#E2A9A0]',
    tint: 'bg-rose-600/10 dark:bg-[#E2A9A0]/10',
    books: 'Sparsh, Sanchayan',
    prompts: [
      '“गिल्लू” पाठ में महादेवी वर्मा और गिल्लू का रिश्ता कैसा था?',
      'बचेंद्री पाल की एवरेस्ट यात्रा से हमें क्या सीख मिलती है?',
      '“तुम कब जाओगे, अतिथि” में लेखक की परेशानी क्या है?',
    ],
  },
];

/** Older profiles stored the UI label instead of the ingested subject name. */
const LEGACY_SUBJECT_ALIASES: Record<string, string> = {
  'Social Studies': 'Social Science',
  SST: 'Social Science',
  Maths: 'Mathematics',
  Math: 'Mathematics',
};

export function normalizeSubject(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return LEGACY_SUBJECT_ALIASES[value] ?? value;
}

export function getSubject(value: string | null | undefined): SubjectConfig | undefined {
  const id = normalizeSubject(value);
  return SUBJECT_LIST.find((s) => s.id === id);
}

export const TEACHING_STYLES = [
  {
    id: 'definition_first',
    label: 'Definition first',
    description: 'Start with the textbook definition, then explain how it works.',
  },
  {
    id: 'analogy_first',
    label: 'Analogy first',
    description: 'Start with an everyday comparison, then the concept.',
  },
  {
    id: 'example_first',
    label: 'Example first',
    description: 'Start with a real example, then build up to the idea.',
  },
  {
    id: 'socratic',
    label: 'Socratic',
    description: 'Guide me with questions so I work it out myself.',
  },
] as const;

export const GRADES = [9, 10] as const;

export type TeachingStyle = typeof TEACHING_STYLES[number]['id'];
export type Grade = typeof GRADES[number];
