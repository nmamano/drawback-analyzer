import type { DrawbackEvidence } from "@/analyzer/types";

// The ONE place analyzer state is published to the e2e evidence surface. The 1d
// browser gate asserts against window.__drawback (a stable, machine-oriented
// mirror of the analysis), never against the DOM. Keeping the assignment in a
// single function stops the e2e suite from chasing incidental React state.
declare global {
  interface Window {
    __drawback?: DrawbackEvidence;
  }
}

export function publishDrawbackEvidence(evidence: DrawbackEvidence): void {
  if (typeof window !== "undefined") {
    window.__drawback = evidence;
  }
}
