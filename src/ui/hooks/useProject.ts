import { useStore } from "@core/store";
import type { Project } from "@core/model/types";

/** The selected project, falling back to the first one (or null when none exist). */
export function useCurrentProject(): Project | null {
  return useStore(
    (s) => s.doc.projects.find((p) => p.id === s.doc.currentProjectId) ?? s.doc.projects[0] ?? null,
  );
}
