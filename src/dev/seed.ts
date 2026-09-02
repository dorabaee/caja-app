import { newAppDoc } from "@core/model/defaults";
import type { AppDoc } from "@core/model/types";
import { DEMO_SEED, buildSeedProject, type Seed } from "./seedData";

/**
 * Example data for development. Testing against empty tables hides the bugs that only
 * show up on a full month, so `npm run dev:demo` (or ?demo=1) boots the app with a
 * month already filled in.
 *
 * Two rules keep this safe for an open-source repo:
 *
 *  1. The committed dataset is fictional. Real books belong in `src/dev/seed.local.ts`
 *     (gitignored, see `seed.local.example.ts`), which overrides it when present.
 *  2. It is dev-only and writes to its own storage key, so a demo boot can never
 *     overwrite the real document — and none of it is bundled into a production build.
 */

/** Its own key: the demo and the real document never share storage. */
export const DEMO_DOC_KEY = "caja:doc:demo";

export function isDemoRequested(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "0") return false;
  return params.has("demo") || import.meta.env.VITE_CAJA_DEMO === "1";
}

/**
 * The seed to load: the local override when the developer has one, else the fictional
 * committed dataset. The glob is resolved at build time and matches nothing in a clean
 * checkout, so the import never fails.
 */
function resolveSeed(): Seed {
  const local = import.meta.glob<{ LOCAL_SEED?: Seed }>("./seed.local.ts", { eager: true });
  for (const mod of Object.values(local)) {
    if (mod?.LOCAL_SEED) return mod.LOCAL_SEED;
  }
  return DEMO_SEED;
}

/** A document holding one fully populated business, ready for the store. */
export function demoDoc(): AppDoc {
  const project = buildSeedProject(resolveSeed());
  return {
    ...newAppDoc(),
    projects: [project],
    currentProjectId: project.id,
    settings: { ...newAppDoc().settings, onboarded: true },
  };
}
