/**
 * Landing page for the Supabase password-reset email.
 * Supabase redirects here with the recovery token in the URL hash:
 *   /reset-password#access_token=…&type=recovery
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, APIError } from '@/lib/api';
import { AuthLayout, Field, FormAlert, SubmitButton } from '@/components/auth/AuthLayout';

function readRecoveryToken(): { token: string | null; error: string | null } {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = hash.get('error_description');
  if (error) return { token: null, error };
  return { token: hash.get('type') === 'recovery' ? hash.get('access_token') : null, error: null };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [{ token, error: linkError }] = useState(readRecoveryToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout
        title="This link doesn’t work"
        subtitle={linkError ? `${linkError}.` : 'Reset links expire after an hour and can only be used once.'}
      >
        <Link
          to="/forgot-password"
          className="flex h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Send a new link
        </Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = 'The passwords don’t match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await apiClient.resetPassword(token, password);
      window.history.replaceState(null, '', window.location.pathname); // drop the token from the URL
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setFormError(
        err instanceof APIError ? err.detail || 'Password wasn’t changed. Try again.' : 'Can’t reach the server. Try again in a minute.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="You’ll use it the next time you sign in.">
      {formError && <FormAlert>{formError}</FormAlert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} disabled={loading} />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} disabled={loading} />
        <SubmitButton loading={loading} loadingText="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
