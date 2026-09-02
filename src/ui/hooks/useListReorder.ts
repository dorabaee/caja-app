import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface ReorderOptions {
  /** "y" for stacked rows (default), "x" for side-by-side items like column headers. */
  axis?: "x" | "y";
  /** Attribute carrying each item's id. Columns use their own so a row drag inside the
   *  same grid never picks up header cells (querySelectorAll walks descendants). */
  attr?: string;
}

/**
 * Pointer-events list reordering — reliable inside the Tauri WebView2 runtime, where
 * native HTML5 drag-and-drop is flaky. Wire `start` to a grip's `onPointerDown`, and
 * give every item a `data-reorder-id={id}` attribute (or the `attr` you pass). On release
 * it reads the items in DOM order, moves the dragged id before/after the one under the
 * pointer (by which half it's over, along `axis`), and calls `onReorder(newOrder)`.
 */
export function useListReorder(
  onReorder: (orderedIds: string[]) => void,
  options?: ReorderOptions,
) {
  const axis = options?.axis ?? "y";
  const attr = options?.attr ?? "data-reorder-id";
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  const rowAt = (x: number, y: number): HTMLElement | null =>
    (document.elementFromPoint(x, y)?.closest(`[${attr}]`) as HTMLElement | null) ?? null;

  const start = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = id;
    setDragId(id);
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const onMove = (ev: PointerEvent) => {
      const over = rowAt(ev.clientX, ev.clientY)?.getAttribute(attr) ?? null;
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
      const target = row?.getAttribute(attr) ?? null;
      if (!from || !target || from === target || !row?.parentElement) return;
      const rect = row.getBoundingClientRect();
      const after =
        axis === "x"
          ? ev.clientX > rect.left + rect.width / 2
          : ev.clientY > rect.top + rect.height / 2;
      const ids = Array.from(row.parentElement.querySelectorAll(`[${attr}]`))
        .map((el) => el.getAttribute(attr))
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
