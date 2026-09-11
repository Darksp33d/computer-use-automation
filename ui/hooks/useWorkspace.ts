import { useEffect, useRef, useState } from "react";
import type { ControlRequest, StartRequest, WorkspaceView } from "../../src/operator/contracts.js";
import * as api from "../services/api.js";

export function useWorkspace() {
  const requestVersion = useRef(0);
  const [data, setData] = useState<WorkspaceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!api.authenticated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const version = ++requestVersion.current;
        const next = await api.workspace(controller.signal);
        if (!controller.signal.aborted && version === requestVersion.current) {
          setData(next);
          setError((previous) =>
            previous === "Connection interrupted. Checking again shortly." ? null : previous,
          );
        }
      } catch {
        if (!controller.signal.aborted) setError("Connection interrupted. Checking again shortly.");
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 800);
      }
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  async function act(operation: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await operation();
      const version = ++requestVersion.current;
      const next = await api.workspace(AbortSignal.timeout(10_000));
      if (version === requestVersion.current) setData(next);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "REQUEST_FAILED");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    data,
    error,
    busy,
    authenticated: api.authenticated,
    selected: data?.runs.find((run) => run.id === selectedId) ?? data?.runs[0] ?? null,
    select: setSelectedId,
    dismissError: () => setError(null),
    start: (body: StartRequest) =>
      act(async () => {
        const result = await api.startRun(body);
        setSelectedId(result.id);
      }),
    command: (id: string, body: ControlRequest) => act(() => api.command(id, body)),
  };
}
