import { DOC_KEY, getStorage } from "../platform";
import { useStore } from "./store";

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: string | null = null;

async function flush(): Promise<void> {
  timer = null;
  if (pending == null) return;
  const data = pending;
  pending = null;
  try {
    await getStorage().writeDoc(DOC_KEY, data);
  } catch (e) {
    console.error("Caja: failed to persist document", e);
  }
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
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (pending != null) void flush();
    });
  }
  return unsub;
}
