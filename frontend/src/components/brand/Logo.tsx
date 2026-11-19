import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** A bookmark ribbon with a highlighter stripe: the textbook, marked up. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" aria-hidden="true" className={cn('h-7 w-6', className)}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h15A1.5 1.5 0 0 1 21 2.5V26l-9-5.5L3 26Z" fill="var(--primary)" />
      <rect x="6" y="8" width="12" height="3.2" rx="1" fill="var(--highlight)" />
    </svg>
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2 rounded-md text-foreground', className)}
      aria-label="TutorX home"
    >
      <LogoMark />
      <span className="font-serif text-[1.35rem] font-semibold tracking-tight">TutorX</span>
    </Link>
  );
}
