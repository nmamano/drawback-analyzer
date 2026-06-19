import { replay } from "./replay";
import { RULES, UNSUPPORTED_IDS } from "./rules";
import type {
  AnalysisResult,
  Color,
  DrawbackEvidence,
  PlyInfo,
  ReplayError,
  SideAnalysis,
} from "./types";

// Fold every rule over one side's play. A rule that returns an Elimination is ruled
// out (with the 0-based ply index + reason); otherwise the side is still consistent
// with the drawback, so it stays possible.
function analyzeSide(side: Color, plies: PlyInfo[]): SideAnalysis {
  const possible: string[] = [];
  const eliminated: SideAnalysis["eliminated"] = [];
  for (const rule of RULES) {
    const elim = rule.evaluate({ side, plies });
    if (elim) {
      eliminated.push({ id: rule.id, moveIndex: elim.moveIndex, reason: elim.reason });
    } else {
      possible.push(rule.id);
    }
  }
  return { possible, eliminated };
}

export type AnalyzeOutcome =
  | {
      ok: true;
      result: AnalysisResult;
      evidence: DrawbackEvidence;
      plies: PlyInfo[];
    }
  | { ok: false; error: ReplayError };

/**
 * Replay the whole history from move 1 and test every drawback hypothesis against
 * it, for both sides. Deterministic and pure. Also builds the machine-oriented
 * evidence object (the UI publishes it to window.__drawback in one place).
 */
export function analyze(history: string[]): AnalyzeOutcome {
  const replayed = replay(history);
  if (!replayed.ok) return { ok: false, error: replayed.error };

  const white = analyzeSide("white", replayed.plies);
  const black = analyzeSide("black", replayed.plies);
  const unsupported = [...UNSUPPORTED_IDS];

  const result: AnalysisResult = { white, black, unsupported };
  const evidence: DrawbackEvidence = {
    fen: replayed.fen,
    sideToMove: replayed.sideToMove,
    moveHistory: replayed.moveHistory,
    white,
    black,
    unsupported,
  };

  return { ok: true, result, evidence, plies: replayed.plies };
}
