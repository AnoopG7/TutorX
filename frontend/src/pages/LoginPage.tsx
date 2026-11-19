import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { APIError } from '@/lib/api';
import { AuthLayout, Field, FormAlert, SubmitButton } from '@/components/auth/AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';
  const reset = params.get('reset') === '1';

  // The free server sleeps; if sign-in takes a while, say why.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 5000);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'That doesn’t look like an email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 403 || err.detail?.toLowerCase().includes('confirm')) {
          setFormError('Confirm your email first. Open the link we sent you, then sign in.');
        } else if (err.status === 429) {
          setFormError(err.detail || 'Too many attempts. Wait a few minutes and try again.');
        } else if (err.status >= 500) {
          setFormError('The server is having trouble, or still waking up. Try again in a minute.');
        } else {
          setFormError('That email and password don’t match. Check them, or reset your password.');
        }
      } else {
        setFormError('Can’t reach the server. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue where you left off."
      footer={
        <>
          New to TutorX?{' '}
          <Link to="/signup" className="font-medium text-link underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {expired && !formError && (
        <p role="status" className="mb-5 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
          You were signed out because your session expired. Sign in again to continue.
        </p>
      )}
      {reset && !formError && (
        <p role="status" className="mb-5 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
          Password updated. Sign in with your new password.
        </p>
      )}
      {formError && <FormAlert>{formError}</FormAlert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={errors.email}
          disabled={loading}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          trailing={
            <Link to="/forgot-password" className="text-xs font-medium text-link underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
        <SubmitButton loading={loading} loadingText={slow ? 'Waking up the server…' : 'Signing in…'}>
          Sign in
        </SubmitButton>
        {slow && (
          <p className="text-center text-xs text-muted-foreground">
            The free server sleeps when nobody is using it. The first sign-in can take up to a minute.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
