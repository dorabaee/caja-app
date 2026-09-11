import { DOC_KEY, getStorage } from "../platform";
import { useStore } from "./store";

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: string | null = null;
let writes: Promise<void> = Promise.resolve();

export async function flushPersistence(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const write = writes.catch(() => {}).then(async () => {
    while (pending != null) {
      const data = pending;
      await getStorage().writeDoc(DOC_KEY, data);
      if (pending === data) pending = null;
    }
  });
  writes = write;
  return write;
}

function flush(): void {
  void flushPersistence().catch((e) => console.error("Caja: failed to persist document", e));
}

/** Subscribe to doc changes and write them (debounced) through the StorageAdapter. */
export function startPersistence(delayMs = 500): () => void {
  const unsub = useStore.subscribe((state, prev) => {
    if (state.doc === prev.doc) return;
    pending = JSON.stringify(state.doc);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  });

  // Best-effort flush when the window is going away.
  const onUnload = () => flush();
  if (typeof window !== "undefined") window.addEventListener("beforeunload", onUnload);
  return () => {
    unsub();
    if (typeof window !== "undefined") window.removeEventListener("beforeunload", onUnload);
    flush();
  };
}
