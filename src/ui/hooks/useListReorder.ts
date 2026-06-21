import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Pointer-events list reordering — reliable inside the Tauri WebView2 runtime, where
 * native HTML5 drag-and-drop is flaky. Wire `start` to a grip's `onPointerDown`, and
 * give every row a `data-reorder-id={id}` attribute. On release it reads the rows in
 * DOM order, moves the dragged id before/after the row under the pointer (by which half
 * it's over), and calls `onReorder(newOrder)`.
 */
export function useListReorder(onReorder: (orderedIds: string[]) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  const rowAt = (x: number, y: number): HTMLElement | null =>
    (document.elementFromPoint(x, y)?.closest("[data-reorder-id]") as HTMLElement | null) ?? null;

  const start = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = id;
    setDragId(id);
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const onMove = (ev: PointerEvent) => {
      const over = rowAt(ev.clientX, ev.clientY)?.getAttribute("data-reorder-id") ?? null;
      setOverId(over && over !== dragRef.current ? over : null);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = "";
      const from = dragRef.current;
      dragRef.current = null;
      setDragId(null);
      setOverId(null);

      const row = rowAt(ev.clientX, ev.clientY);
      const target = row?.getAttribute("data-reorder-id") ?? null;
      if (!from || !target || from === target || !row?.parentElement) return;
      const rect = row.getBoundingClientRect();
      const after = ev.clientY > rect.top + rect.height / 2;
      const ids = Array.from(row.parentElement.querySelectorAll("[data-reorder-id]"))
        .map((el) => el.getAttribute("data-reorder-id"))
        .filter((x): x is string => !!x);
      const fromIdx = ids.indexOf(from);
      let toIdx = ids.indexOf(target);
      if (fromIdx < 0 || toIdx < 0) return;
      ids.splice(fromIdx, 1);
      toIdx = ids.indexOf(target) + (after ? 1 : 0);
      ids.splice(toIdx, 0, from);
      onReorder(ids);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return { dragId, overId, start };
}
