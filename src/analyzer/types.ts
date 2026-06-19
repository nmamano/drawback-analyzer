// Pure analyzer types. This module is UI-free (no React, no DOM) so it is trivially
// unit-testable and shared verbatim by the UI and the tests.

import type { Move } from "chess.js";

export type Color = "white" | "black";

/**
 * One ply (half-move) of a replayed game, carrying the legal options that existed
 * BEFORE the move was chosen. That `legalBefore` set is the surface obligation
 * drawbacks inspect (e.g. "must capture if possible" looks for an available capture
 * the side declined). `fenAfter` / `givesCheck` capture post-move board state for
 * rules like Respectful (no giving check) and Social Distancing, so a rule never has
 * to re-derive legality with a second engine. chess.js produced every field.
 */
export interface PlyInfo {
  index: number; // 0-based ply index in the full game
  moveNumber: number; // 1-based full-move number (derive UI "move N" from here)
  color: Color; // side that made this move
  fenBefore: string; // FEN before the move
  legalBefore: Move[]; // verbose legal moves available before the move
  move: Move; // verbose move actually played
  san: string; // SAN of the move played
  fenAfter: string; // FEN after the move
  givesCheck: boolean; // did this move leave the opponent in check?
}

export interface ReplayError {
  index: number; // ply index that failed
  san: string; // the offending input token
  message: string; // human-readable cause (never a raw chess.js throw in UI state)
}

export type ReplayResult =
  | { ok: true; plies: PlyInfo[]; fen: string; sideToMove: Color; moveHistory: string[] }
  | { ok: false; error: ReplayError };

/** Why a drawback hypothesis was ruled out for a side. */
export interface Elimination {
  moveIndex: number; // 0-based ply index where the drawback became impossible
  reason: string; // human-readable explanation
}

export interface RuleContext {
  side: Color; // the side this hypothesis is being tested for
  plies: PlyInfo[]; // ALL plies of the game (both sides), in order
}

/** Where a drawback sits in the taxonomy (drives grouping in the catalog). */
export type DrawbackCategory =
  | "simple-move-forbid"
  | "capture-restriction"
  | "stateful"
  | "board-condition-loss"
  | "random-parameter";

/**
 * Catalog status.
 * - supported   = evaluated by the analyzer; appears in possible/eliminated.
 * - partial     = known/cataloged but NOT currently evaluated (e.g. lose-conditions,
 *                 or definitions needing piece identity we don't fully track yet).
 * - unsupported = not inferable from move history alone (hidden-info, per-move random,
 *                 or engine/eval-based) — out of the analysis model.
 * Only `supported` entries carry an `evaluate`. partial + unsupported are data-only.
 */
export type DrawbackStatus = "supported" | "unsupported" | "partial";

/** Confidence in the (community-sourced, unofficial) definition. */
export type Confidence = "high" | "medium" | "low";

/**
 * A single catalog entry. `evaluate` is OPTIONAL: supported entries provide it
 * (they are SupportedRule); partial/unsupported entries omit it and are never run.
 * The analyzer folds ONLY entries with evaluate (see SUPPORTED_RULES). 1c/1d read the
 * full CATALOG for the catalog page. Metadata keeps coverage honest.
 */
export interface CatalogEntry {
  id: string;
  title: string;
  description: string;
  category: DrawbackCategory;
  status: DrawbackStatus;
  confidence: Confidence;
  sources: string[];
  evaluate?: (ctx: RuleContext) => Elimination | null;
}

/** A catalog entry that is actually executed by the analyzer. */
export interface SupportedRule extends CatalogEntry {
  status: "supported";
  evaluate: (ctx: RuleContext) => Elimination | null;
}

/** Type guard: does this entry have executable analysis logic? */
export function isSupportedRule(entry: CatalogEntry): entry is SupportedRule {
  return typeof entry.evaluate === "function";
}

export interface EliminatedEntry {
  id: string;
  moveIndex: number;
  reason: string;
}

export interface SideAnalysis {
  possible: string[]; // supported rule ids still possible
  eliminated: EliminatedEntry[]; // ruled-out rules + when + why
}

export interface AnalysisResult {
  white: SideAnalysis;
  black: SideAnalysis;
  unsupported: string[]; // catalog ids NOT evaluated by the analyzer (partial + unsupported)
}

/**
 * Machine-oriented evidence surface mirrored onto window.__drawback. Built in one
 * place (analyze) and published in one place (lib/evidence) so the e2e gate has a
 * stable oracle. NOTE: `unsupported` currently means "not evaluated by the analyzer"
 * — it lists both partial and unsupported catalog ids. (May split in 1d.)
 */
export interface DrawbackEvidence {
  fen: string;
  sideToMove: Color;
  moveHistory: string[];
  white: SideAnalysis;
  black: SideAnalysis;
  unsupported: string[];
}
