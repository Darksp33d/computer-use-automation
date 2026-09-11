import { useEffect, useState } from "react";
import { sessionImage } from "../services/api.js";
export function useSessionImage(id: string | undefined) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    setImage(null);
    if (!id) return;
    const controller = new AbortController();
    let url: string | null = null;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const blob = await sessionImage(id, controller.signal);
        if (!controller.signal.aborted) {
          if (url) URL.revokeObjectURL(url);
          url = blob ? URL.createObjectURL(blob) : null;
          setImage(url);
        }
      } catch {
        if (!controller.signal.aborted) setImage(null);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 1200);
      }
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return image;
}
