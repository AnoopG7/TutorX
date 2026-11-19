/**
 * Settings — how TutorX teaches you, plus appearance.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useThemeContext } from '@/providers/ThemeProvider';
import { profileSchema, type ProfileFormData } from '@/lib/schemas';
import { GRADES, SUBJECT_LIST, TEACHING_STYLES, normalizeSubject, type TeachingStyle } from '@/lib/constants';
import { cn } from '@/lib/utils';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border py-8 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, loading, error: loadError, updateProfile } = useProfile(user?.user_id || '');
  const { theme, toggleTheme } = useThemeContext();
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const [status, setStatus] = useState<{ type: 'saved' | 'error'; message: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', grade: 9, subjects: [], teaching_style: 'example_first', custom_instructions: '' },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      name: profile.name || user?.name || '',
      grade: profile.grade === 10 ? 10 : 9,
      subjects: [...new Set((profile.subjects || []).map((s) => normalizeSubject(s)!).filter(Boolean))],
      teaching_style: (profile.teaching_style as TeachingStyle) || 'example_first',
      custom_instructions: profile.custom_instructions || '',
    });
  }, [profile, reset, user?.name]);

  const instructionsLength = useWatch({ control, name: 'custom_instructions' })?.length ?? 0;

  const onSubmit = async (data: ProfileFormData) => {
    setStatus(null);
    try {
      await updateProfile(data);
      reset(data);
      setStatus({ type: 'saved', message: 'Changes saved. Your next answer will use them.' });
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? `Changes weren’t saved: ${err.message}` : 'Changes weren’t saved. Try again.' });
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-10 sm:px-6 sm:pt-14">
        <h1 className="font-serif text-[2rem] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Tell TutorX how you like to learn. It uses this in every answer.</p>

        {welcome && (
          <div className="mt-6 rounded-lg border border-highlight/60 bg-highlight/15 p-4 text-sm">
            <p className="font-medium">Welcome to TutorX, {user?.name?.split(' ')[0]}.</p>
            <p className="mt-0.5 text-muted-foreground">
              Take a minute to choose your subjects and teaching style, or{' '}
              <Link to="/chat" className="font-medium text-link underline underline-offset-4">
                skip and ask a question
              </Link>
              .
            </p>
          </div>
        )}

        {loadError && !loading && (
          <p role="alert" className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Your saved settings couldn’t be loaded, so these are the defaults. Saving will overwrite them.
          </p>
        )}

        {loading ? (
          <div className="mt-10 space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
            <Section title="About you">
              <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Name</label>
                  <input
                    id="name"
                    {...register('name')}
                    aria-invalid={!!errors.name}
                    className={cn(
                      'h-11 w-full rounded-md border bg-card px-3.5 focus:outline-none focus:ring-2',
                      errors.name ? 'border-destructive focus:ring-destructive/25' : 'border-input focus:border-primary focus:ring-primary/20',
                    )}
                  />
                  {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="grade" className="mb-1.5 block text-sm font-medium">Class</label>
                  <select
                    id="grade"
                    {...register('grade', { valueAsNumber: true })}
                    className="h-11 w-full rounded-md border border-input bg-card px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>Class {g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Subjects" description="These show first on your home page.">
              <Controller
                name="subjects"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Subjects">
                    {SUBJECT_LIST.map((s) => {
                      const on = field.value.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? field.value.filter((v) => v !== s.id) : [...field.value, s.id])}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors',
                            on ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card hover:border-primary/40',
                          )}
                        >
                          {on ? <Check className="h-4 w-4" /> : <s.icon className={cn('h-4 w-4', s.ink)} />}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.subjects && <p className="mt-2 text-xs text-destructive">{errors.subjects.message}</p>}
            </Section>

            <Section title="Teaching style" description="How each explanation should begin.">
              <Controller
                name="teaching_style"
                control={control}
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Teaching style" className="grid gap-2 sm:grid-cols-2">
                    {TEACHING_STYLES.map((s) => {
                      const on = field.value === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => field.onChange(s.id)}
                          className={cn(
                            'rounded-lg border p-4 text-left transition-colors',
                            on ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/40',
                          )}
                        >
                          <span className="flex items-center justify-between">
                            <span className={cn('font-medium', on && 'text-accent-foreground')}>{s.label}</span>
                            <span
                              className={cn(
                                'flex h-4 w-4 items-center justify-center rounded-full border',
                                on ? 'border-primary bg-primary' : 'border-input',
                              )}
                            >
                              {on && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">{s.description}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </Section>

            <Section title="Notes for your tutor" description="Anything else TutorX should keep in mind.">
              <label htmlFor="custom_instructions" className="sr-only">Notes for your tutor</label>
              <textarea
                id="custom_instructions"
                {...register('custom_instructions')}
                rows={4}
                maxLength={500}
                placeholder="For example: explain in simple English with some Hindi words, and use cricket examples."
                className="w-full resize-y rounded-md border border-input bg-card p-3.5 text-[0.95rem] leading-relaxed placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className={cn('mt-1 text-right text-xs', instructionsLength >= 450 ? 'text-destructive' : 'text-muted-foreground')}>
                {instructionsLength}/500
              </p>
            </Section>

            <Section title="Appearance">
              <div className="inline-flex rounded-lg border border-border bg-card p-1" role="radiogroup" aria-label="Theme">
                {([
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                  ['system', 'Match device', Monitor],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    onClick={() => toggleTheme(value)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                      theme === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </Section>

            {/* Save bar */}
            <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-end gap-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              {status && (
                <p role="status" className={cn('mr-auto text-sm', status.type === 'saved' ? 'text-success' : 'text-destructive')}>
                  {status.message}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
