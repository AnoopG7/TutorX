import { forwardRef, useState, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { BackendStartupBanner } from '@/components/BackendStartupBanner';
import { cn } from '@/lib/utils';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col pb-6">
        <BackendStartupBanner />
        <div className="flex flex-1 flex-col px-4 pt-6 sm:px-10">
        <Logo to="/home" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block dark:border-l dark:border-border dark:bg-[#1E2621] dark:text-foreground" aria-hidden>
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-14">
          <p className="max-w-md font-serif text-[2rem] font-medium leading-snug">
            “Matter is made up of tiny particles, and{' '}
            <span className="bg-highlight/90 px-1 text-highlight-foreground [box-decoration-break:clone]">
              these particles are continuously moving
            </span>
            .”
          </p>
          <p className="mt-4 text-sm opacity-75">Science, Chapter 1: Matter in Our Surroundings</p>
        </div>
        {/* ruled lines, like an exercise book */}
        <div
          className="absolute inset-0 opacity-[0.12] dark:opacity-[0.07]"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 39px, currentColor 39px 40px)' }}
        />
      </aside>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, trailing, id, type, className, ...props },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password';
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        {trailing}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full rounded-md border bg-card px-3.5 text-[0.95rem] placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 disabled:opacity-60',
            error ? 'border-destructive focus:ring-destructive/25' : 'border-input focus:border-primary focus:ring-primary/20',
            isPassword && 'pr-11',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-2 text-muted-foreground hover:text-foreground"
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-5 flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: ReactNode; loadingText: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
