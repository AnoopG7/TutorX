import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { APIError } from '@/lib/api';
import { AuthLayout, Field, FormAlert, SubmitButton } from '@/components/auth/AuthLayout';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Enter your name.';
    if (!email.trim()) e.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'That doesn’t look like an email address.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    if (confirm !== password) e.confirm = 'The passwords don’t match.';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const result = await signup(email.trim(), password, name.trim());
      if (result.status === 'logged_in') navigate('/settings?welcome=1');
      else setEmailSent(true);
    } catch (err) {
      if (err instanceof APIError) {
        const msg = (err.detail || '').toLowerCase();
        if (msg.includes('already')) setErrors({ email: 'This email already has an account. Sign in instead.' });
        else if (msg.includes('password')) setErrors({ password: 'Choose a stronger password, with at least 8 characters.' });
        else setFormError(err.status >= 500 ? 'The server is having trouble, or still waking up. Try again in a minute.' : err.detail || 'Sign-up didn’t work. Try again.');
      } else {
        setFormError('Can’t reach the server. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex gap-3 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p>Open the link to confirm your account, then come back and sign in. If it isn’t there, check your spam folder.</p>
        </div>
        <Link
          to="/login"
          className="mt-6 flex h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free, and you can start asking right away."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-link underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {formError && <FormAlert>{formError}</FormAlert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Your name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} disabled={loading} />
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} disabled={loading} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} disabled={loading} />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} disabled={loading} />
        <SubmitButton loading={loading} loadingText="Creating your account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
