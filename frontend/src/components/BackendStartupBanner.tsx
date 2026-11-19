import { useBackendHealth } from '@/hooks/useBackendHealth';

/**
 * The free Render instance sleeps when idle. Tell the student what's
 * happening instead of letting requests fail silently.
 */
export function BackendStartupBanner() {
  const { isHealthy, isChecking } = useBackendHealth();
  if (isHealthy || isChecking) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 bg-highlight px-4 py-1.5 text-center text-xs font-medium text-highlight-foreground"
    >
      <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
      <span className="sm:hidden">Server waking up, this can take a few minutes</span>
      <span className="hidden sm:inline">
        The tutor’s server is waking up. On the free plan this can take a few minutes; questions will work once it’s ready.
      </span>
    </div>
  );
}
