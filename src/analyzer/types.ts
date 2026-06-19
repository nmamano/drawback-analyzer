// Pure analyzer types. This module is UI-free (no React, no DOM) so it is trivially
// unit-testable and shared verbatim by the UI and the tests.

import type { Move } from "chess.js";

export type Color = "white" | "black";

/**
 * One ply (half-move) of a replayed game, carrying the legal options that existed
 * BEFORE the move was chosen. That `legalBefore` set is the surface obligation
 * drawbacks inspect (e.g. "must capture if possible" looks for an available capture
 * the side declined). chess.js produced every field — it is the only legality
 * authority.
 */
export interface PlyInfo {
  index: number; // 0-based ply index in the full game
  moveNumber: number; // 1-based full-move number (derive UI "move N" from here)
  color: Color; // side that made this move
  fenBefore: string; // FEN before the move
  legalBefore: Move[]; // verbose legal moves available before the move
  move: Move; // verbose move actually played
  san: string; // SAN of the move played
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

/** Where a drawback sits in the taxonomy (drives grouping in the 1c/1d catalog). */
export type DrawbackCategory =
  | "simple-move-forbid"
  | "capture-restriction"
  | "stateful"
  | "board-condition-loss"
  | "random-parameter";

/**
 * Catalog status. A union from the start (even though every 1b rule is "supported")
 * so 1c/1d can represent unsupported / deferred catalog entries without a reshape.
 */
export type DrawbackStatus = "supported" | "unsupported" | "deferred";

/** Confidence in the (community-sourced, unofficial) definition. */
export type Confidence = "high" | "medium" | "low";

/**
 * A drawback hypothesis. `evaluate` inspects a side's play (within the full ply
 * stream) and returns an Elimination if some move of that side is inconsistent with
 * the drawback, or null if the side is still consistent with it. Prohibition,
 * obligation, and stateful rules all fit this one contract — 1b/1c extend the
 * catalog by ADDING rules; the analyzer fold never changes.
 *
 * Metadata (category/status/confidence/sources) keeps the catalog honest and lets
 * the 1c expansion + 1d catalog page read off the rule with no shape change.
 */
export interface DrawbackRule {
  id: string;
  title: string;
  description: string;
  category: DrawbackCategory;
  status: DrawbackStatus;
  confidence: Confidence;
  sources: string[];
  evaluate(ctx: RuleContext): Elimination | null;
}

export interface EliminatedEntry {
  id: string;
  moveIndex: number;
  reason: string;
}

export interface SideAnalysis {
  possible: string[]; // rule ids still possible
  eliminated: EliminatedEntry[]; // ruled-out rules + when + why
}

export interface AnalysisResult {
  white: SideAnalysis;
  black: SideAnalysis;
  unsupported: string[]; // drawbacks not inferable from history (empty in 1a — honest)
}

/**
 * Machine-oriented evidence surface mirrored onto window.__drawback. Built in one
 * place (analyze) and published in one place (lib/evidence) so the e2e gate has a
 * stable oracle.
 */
export interface DrawbackEvidence {
  fen: string;
  sideToMove: Color;
  moveHistory: string[];
  white: SideAnalysis;
  black: SideAnalysis;
  unsupported: string[];
}
