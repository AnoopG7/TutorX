/**
 * ChaptersPage — Browse textbook chapters by subject/grade
 */

import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/providers/AuthProvider';
import { SUBJECTS, type Subject } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface Chapter {
  id: number;
  subject: string;
  chapter_number: number;
  title: string;
  sections: number;
}

// Mock data - replace with actual API call
const mockChapters: Chapter[] = [
  { id: 1, subject: 'Science', chapter_number: 1, title: 'Matter in Our Surroundings', sections: 5 },
  { id: 2, subject: 'Science', chapter_number: 2, title: 'Is Matter Around us Pure?', sections: 4 },
  { id: 3, subject: 'Mathematics', chapter_number: 1, title: 'Number Systems', sections: 6 },
  { id: 4, subject: 'Mathematics', chapter_number: 2, title: 'Polynomials', sections: 5 },
  { id: 5, subject: 'English', chapter_number: 1, title: 'The Fun They Had', sections: 3 },
];

export default function ChaptersPage() {
  const { user } = useAuth();
  const userId = user?.user_id;
  useProfile(userId || ''); // Ensure user has profile loaded
  const [selectedSubject, setSelectedSubject] = useState<Subject | undefined>();

  const filteredChapters = selectedSubject
    ? mockChapters.filter((ch) => ch.subject === selectedSubject)
    : mockChapters;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Browse Chapters</h1>
        <p className="text-muted-foreground mt-1">
          Select a subject and chapter to start learning
        </p>
      </div>

      {/* Subject Filter */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Subjects</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSubject === undefined ? 'default' : 'outline'}
            onClick={() => setSelectedSubject(undefined)}
          >
            All Subjects
          </Button>
          {(Object.keys(SUBJECTS) as Array<Subject>).map((subject) => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? 'default' : 'outline'}
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>
      </div>

      {/* Chapters List */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">
          {selectedSubject ? `${selectedSubject} Chapters` : 'All Chapters'}
        </h2>
        <div className="space-y-2">
          {filteredChapters.map((chapter) => (
            <div
              key={chapter.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    Chapter {chapter.chapter_number}: {chapter.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {chapter.sections} sections
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Learn
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
