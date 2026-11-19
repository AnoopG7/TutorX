import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { LogoMark } from '@/components/brand/Logo';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
        <LogoMark className="h-9 w-8 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
