import { useEffect, useState } from "react";

export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Get the base URL (without /api suffix)
        const envUrl = import.meta.env.VITE_API_URL;
        const baseUrl = envUrl ? envUrl.replace(/\/+$/, "") : "";

        const response = await fetch(`${baseUrl}/health`, {
          method: "GET",
          mode: "cors",
        });

        setIsHealthy(response.ok);
      } catch {
        setIsHealthy(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkHealth();

    // Check health every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, isChecking };
}
