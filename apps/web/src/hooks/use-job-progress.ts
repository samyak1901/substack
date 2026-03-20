import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import type { JobProgress } from "../types";

export function useJobProgress(jobId: string | null): JobProgress | null {
  const progressRef = useRef<JobProgress | null>(null);
  const subscribersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => {
      subscribersRef.current.delete(cb);
    };
  }, []);

  const getSnapshot = useCallback(() => progressRef.current, []);

  useEffect(() => {
    if (!jobId) {
      progressRef.current = null;
      subscribersRef.current.forEach((cb) => cb());
      return;
    }

    progressRef.current = null;
    subscribersRef.current.forEach((cb) => cb());

    const source = new EventSource(`/api/jobs/${jobId}/progress`);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as JobProgress & { error?: string };
      if (data.error) {
        source.close();
        return;
      }
      progressRef.current = data;
      subscribersRef.current.forEach((cb) => cb());
      if (data.status === "completed" || data.status === "failed") {
        source.close();
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [jobId]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
