import { useEffect } from "react";
import { useStore } from "@core/store";

function inEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * App-wide keyboard shortcuts. Undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y)
 * defer to the browser's native field undo while a text field is focused, so
 * typing isn't hijacked; elsewhere they drive the document history.
 */
export function useGlobalKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      const redo = (key === "z" && e.shiftKey) || key === "y";
      const undo = key === "z" && !e.shiftKey;
      if (!undo && !redo) return;
      if (inEditable(e.target)) return; // let the field's own undo win
      e.preventDefault();
      if (redo) useStore.getState().redo();
      else useStore.getState().undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
