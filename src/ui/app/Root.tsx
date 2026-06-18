import { useStore } from "@core/store";
import { Onboarding } from "./Onboarding";
import { Shell } from "./Shell";

export function Root() {
  const hasProjects = useStore((s) => s.doc.projects.length > 0);
  return hasProjects ? <Shell /> : <Onboarding />;
}
