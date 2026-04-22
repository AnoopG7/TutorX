/**
 * SettingsPage — Centered profile management with proper data flow
 */

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useThemeContext } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect } from '@/components/forms';
import { profileSchema, type ProfileFormData } from '@/lib/schemas';
import { SUBJECTS, TEACHING_STYLES, type Subject, type TeachingStyle, type SubjectConfig } from '@/lib/constants';
import { Sun, Moon, Monitor, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const { profile, loading: profileLoading, updateProfile } = useProfile(userId || '');
  const { theme, toggleTheme } = useThemeContext();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      grade: 9,
      subjects: [],
      teaching_style: 'example_first',
      custom_instructions: '',
    },
  });

  // Load profile data into form
  useEffect(() => {
    if (profile && !profileLoading) {
      reset({
        name: profile.name || '',
        grade: profile.grade || 9,
        subjects: profile.subjects || [],
        teaching_style: (profile.teaching_style as TeachingStyle) || 'example_first',
        custom_instructions: profile.custom_instructions || '',
      });
    }
  }, [profile, profileLoading, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setFeedback(null);
      await updateProfile(data);
      setFeedback({
        type: 'success',
        message: 'Profile saved successfully!',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      setFeedback({
        type: 'error',
        message: message,
      });
    }
  };

  if (profileLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 mx-auto flex items-center justify-center text-white text-2xl font-bold">
            {profile?.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-3xl font-bold text-foreground">{profile?.name || user?.name || 'Student'}</h1>
          <p className="text-muted-foreground">Grade {profile?.grade || 9}</p>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border animate-in fade-in duration-300 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-500/10 border-red-200 dark:border-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <p
              className={
                feedback.type === 'success'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              }
            >
              {feedback.message}
            </p>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
          {/* Profile Section */}
          <div className="rounded-xl border border-border bg-card p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Profile Information
              </h2>
              <p className="text-sm text-muted-foreground">
                Update your basic profile details
              </p>
            </div>

            <div className="space-y-5">
              {/* Name Input */}
              <FormInput
                label="Full Name"
                placeholder="Enter your full name"
                type="text"
                {...register('name')}
                error={errors.name}
              />

              {/* Grade Select */}
              <FormSelect
                label="Grade"
                options={[9, 10].map((g) => ({
                  value: g,
                  label: `Grade ${g}`,
                }))}
                {...register('grade', { valueAsNumber: true })}
                error={errors.grade}
              />

              {/* Subjects Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Subjects (Select at least one)
                </label>
                <Controller
                  name="subjects"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-3">
                      {(Object.entries(SUBJECTS) as Array<[Subject, SubjectConfig]>).map(
                        ([subject, { icon }]) => {
                          const isSelected = field.value.includes(subject);
                          return (
                            <button
                              key={subject}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  field.onChange(
                                    field.value.filter((s: string) => s !== subject)
                                  );
                                } else {
                                  field.onChange([...field.value, subject]);
                                }
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border bg-muted hover:border-primary/50'
                              }`}
                            >
                              <span className="text-xl">{icon}</span>
                              <span className="text-sm font-medium text-foreground">
                                {subject}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4 ml-auto text-primary" />
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                />
                {errors.subjects && (
                  <p className="text-xs font-medium text-red-500">
                    {errors.subjects.message}
                  </p>
                )}
              </div>

              {/* Teaching Style */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Preferred Teaching Style
                </label>
                <Controller
                  name="teaching_style"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {TEACHING_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => field.onChange(style.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            field.value === style.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`h-5 w-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                field.value === style.id
                                  ? 'border-primary bg-primary'
                                  : 'border-border'
                              }`}
                            >
                              {field.value === style.id && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">
                                {style.label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {style.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.teaching_style && (
                  <p className="text-xs font-medium text-red-500">
                    {errors.teaching_style.message}
                  </p>
                )}
              </div>

              {/* Custom Instructions */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Custom Instructions
                </label>
                <p className="text-xs text-muted-foreground">
                  Add personal instructions to customize how TutorX responds (e.g., "Use simple Hindi-English mixed sentences")
                </p>
                <textarea
                  {...register('custom_instructions')}
                  rows={4}
                  maxLength={500}
                  placeholder="E.g., Speak in simple words, use examples from daily life..."
                  className="w-full p-4 rounded-lg border-2 border-border bg-muted text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {profile?.custom_instructions?.length || 0}/500 characters
                </p>
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>

          {/* Theme Section */}
          <div className="rounded-xl border border-border bg-card p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Appearance
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Light Theme */}
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm font-medium">Light</span>
                {theme === 'light' && <Check className="h-4 w-4 text-primary mt-1" />}
              </button>

              {/* Dark Theme */}
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm font-medium">Dark</span>
                {theme === 'dark' && <Check className="h-4 w-4 text-primary mt-1" />}
              </button>

              {/* System Theme */}
              <button
                type="button"
                onClick={() => toggleTheme('system')}
                className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                  theme === 'system'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm font-medium">System</span>
                {theme === 'system' && <Check className="h-4 w-4 text-primary mt-1" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
