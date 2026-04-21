import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { APIError } from '@/lib/api';
import { AlertCircle, Loader2, Mail } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 403 || err.detail?.includes('confirm')) {
          setNeedsConfirmation(true);
          setError('Please confirm your email before signing in. Check your inbox.');
        } else {
          setError(err.detail || 'Invalid email or password');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <Link to="/home" className="inline-flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-amber-500" />
              <span className="font-semibold text-lg">CBSE Study</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to continue learning</p>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-4 p-3 rounded-xl flex gap-3 ${
              needsConfirmation
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              {needsConfirmation ? (
                <Mail className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${needsConfirmation ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors disabled:opacity-50"
                disabled={loading || authLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors disabled:opacity-50"
                disabled={loading || authLoading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 mt-2"
            >
              {loading || authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
