import type { DrawbackRule } from "./types";

// --- Slice 1a: ONE smoke-test rule, on the real DrawbackRule contract. ---
// It exists only to exercise the replay -> analyze -> display pipeline end to end.
// The real, sourced catalog (10-15 rules in 1b, 30+ in 1c) is added by APPENDING to
// RULES; the analyzer fold does not change.

const queenCannotMove: DrawbackRule = {
  id: "queen-no-move",
  title: "Royal Standstill",
  description:
    "Your queen cannot move. (Smoke-test tracer for slice 1a; the real community-sourced catalog arrives in 1b/1c.)",
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (p.move.piece === "q") {
        const who = side === "white" ? "White" : "Black";
        return {
          moveIndex: p.index,
          reason: `${who} moved the queen (${p.san}) on move ${p.moveNumber}, so "queen cannot move" is impossible.`,
        };
      }
    }
    return null;
  },
};

/** The supported drawback catalog. Append-only across slices. */
export const RULES: DrawbackRule[] = [queenCannotMove];

/**
 * Drawbacks that exist but are NOT inferable from move history alone (hidden-info,
 * per-move random, or engine/eval-based). Surfaced separately so the app never
 * implies it covers the full glossary. Empty in 1a — that is honest, not a gap.
 */
export const UNSUPPORTED_IDS: string[] = [];
