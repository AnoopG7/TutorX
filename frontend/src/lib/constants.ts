/**
 * Constants — Subject colors, teaching styles, subject metadata
 */

export const SUBJECTS = {
  Science: {
    color: 'bg-green-500',
    textColor: 'text-green-600',
    icon: '🔬',
  },
  Mathematics: {
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    icon: '📐',
  },
  'Social Studies': {
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    icon: '🌍',
  },
  English: {
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    icon: '📖',
  },
  Hindi: {
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    icon: '🗣️',
  },
} as const;

export const TEACHING_STYLES = [
  {
    id: 'definition_first',
    label: 'Definition First',
    description: 'Start with clear definitions, then explain how it works',
  },
  {
    id: 'analogy_first',
    label: 'Analogy First',
    description: 'Start with everyday analogies, then explain the concept',
  },
  {
    id: 'example_first',
    label: 'Example First',
    description: 'Start with real-world examples, then build up to the concept',
  },
  {
    id: 'socratic',
    label: 'Socratic',
    description: 'Ask guiding questions to help you think through it',
  },
] as const;

export const GRADES = [9, 10] as const;

export type Subject = keyof typeof SUBJECTS;
export type TeachingStyle = typeof TEACHING_STYLES[number]['id'];
export type Grade = typeof GRADES[number];
