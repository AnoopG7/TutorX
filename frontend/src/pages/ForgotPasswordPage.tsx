import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { apiClient, APIError } from '@/lib/api';
import { AuthLayout, Field, FormAlert, SubmitButton } from '@/components/auth/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiClient.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setFormError(
        err instanceof APIError && err.status === 429
          ? 'Too many reset requests. Wait a few minutes and try again.'
          : 'Can’t reach the server right now. Try again in a minute.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle={`If ${email.trim()} has an account, we’ve sent it a link to reset the password.`}>
        <div className="flex gap-3 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p>The link works once and expires after an hour. If it isn’t in your inbox, check spam.</p>
        </div>
        <Link
          to="/login"
          className="mt-6 flex h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we’ll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-link underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {formError && <FormAlert>{formError}</FormAlert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
          disabled={loading}
        />
        <SubmitButton loading={loading} loadingText="Sending link…">
          Send reset link
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
