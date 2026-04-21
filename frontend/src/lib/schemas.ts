/**
 * Zod Validation Schemas
 */

import { z } from 'zod';

// Profile/Settings form schema
export const profileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  grade: z.number().min(9, 'Grade must be 9 or higher').max(12, 'Grade must be 12 or lower'),
  subjects: z.array(z.string()).min(1, 'Select at least one subject'),
  teaching_style: z.enum([
    'definition_first',
    'analogy_first',
    'example_first',
    'socratic',
  ]),
});

// Chat message input schema
export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters')
    .transform(val => val.trim()),
});

// Type exports for use in components
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChatMessageData = z.infer<typeof chatMessageSchema>;
