/**
 * SubjectCard — Subject tile with chapter count
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SUBJECTS, type Subject } from '@/lib/constants';

interface SubjectCardProps {
  subject: Subject;
  chapterCount: number;
}

export function SubjectCard({ subject, chapterCount }: SubjectCardProps) {
  const config = SUBJECTS[subject];

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl">{config.icon}</p>
          <h3 className="font-semibold text-foreground mt-2">{subject}</h3>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
      </p>
      <Link to="/chat">
        <Button variant="outline" size="sm" className="w-full">
          Start Learning
        </Button>
      </Link>
    </div>
  );
}
