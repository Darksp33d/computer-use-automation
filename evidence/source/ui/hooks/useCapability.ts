import { useEffect, useState } from "react";
import type { Capability } from "../../src/contracts/capability.js";
import { capability } from "../services/api.js";
export function useCapability(id: string) {
  const [data, setData] = useState<Capability | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void capability(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [id]);
  return { data, error };
}
