import { Loader2, Zap } from "lucide-react";
import { useBackendHealth } from "@/hooks/useBackendHealth";

export function BackendStartupBanner() {
  const { isHealthy, isChecking } = useBackendHealth();

  if (isHealthy || isChecking) return null;

  return (
    <div className="sticky top-0 z-40 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
        <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
          Server waking up...
        </p>
        <span className="text-xs text-amber-600 dark:text-amber-400">
          (Takes about 5 mins!)
        </span>
        <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
      </div>
    </div>
  );
}